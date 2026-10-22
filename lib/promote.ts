import { supabaseAdmin } from './supabase/admin.ts';
import { convertToWebP, generateBlurData } from './image-processing.ts';
import { uploadToR2 } from './r2-client.ts';
import {
  allocateNextCatalogId,
  r2KeyForCatalogId,
  parseCatalogId,
  parseCatalogHead,
  isCatalogIdConflict,
  CATALOG_ID_MAX_ATTEMPTS,
  CATEGORY_TO_DOOR_CODE,
  type DoorCode,
  type PersonCode,
} from './catalog-id.ts';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Resolve a stored image_url (absolute CDN URL or relative key) to an R2 key.
 * Inline copy of lib/image-dimensions.ts#toR2Key - kept local so this module
 * stays free of the build-time JSON import and can run in plain node scripts.
 */
function toR2Key(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const cdnBase = (process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.lmsy.space').replace(/\/$/, '');
  const withoutQuery = imageUrl.split('?')[0];
  if (withoutQuery.startsWith('http://') || withoutQuery.startsWith('https://')) {
    if (!withoutQuery.startsWith(cdnBase + '/')) return null;
    return withoutQuery.slice(cdnBase.length + 1) || null;
  }
  return withoutQuery.replace(/^\//, '') || null;
}

/**
 * Self-serve draft promotion core (phase 1: live-event door).
 *
 * The admin route /api/admin/drafts/promote is a thin authenticated shell
 * around this module; the local test scripts call the functions directly.
 *
 * Batched promotion: draft object -> WebP(95) -> R2 canonical key ->
 * gallery_assets insert, with the catalog id allocated as "current max
 * sequence + 1" for the project's subject so later batches continue the
 * numbering. Deleting consumed drafts is a separate explicit step
 * (cleanupPromotedDrafts) that the wizard only runs after every batch
 * succeeded.
 */

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lmsy-archive';

function r2ReadClient(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export interface PromoteParams {
  draftIds: string[];
  projectId: string;
  /** User-confirmed SUBJECT segment (e.g. EVERAFTER-UNFOLD). */
  subject: string;
  personCode?: PersonCode;
  assetGroup?: string | null;
  captionPrefix?: string | null;
  writeCover?: boolean;
  dryRun?: boolean;
}

export interface PromoteItemResult {
  draftId: string;
  status: 'promoted' | 'failed' | 'skipped';
  catalogId?: string;
  r2Key?: string;
  width?: number;
  height?: number;
  error?: string;
}

export interface PromoteResult {
  success: boolean;
  error?: string;
  results?: PromoteItemResult[];
  coverUpdated?: boolean;
  projectCatalogIdWritten?: boolean;
  preview?: {
    firstCatalogId: string;
    r2Key: string | null;
    doorCode: string;
    eventDate: string;
    subject: string;
    projectCatalogId: string | null;
  };
}

function normalizeSubject(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Derive the SUBJECT segment for a project: the catalog head's subject when
 * the project already has one, else a normalised guess from the title
 * (truncated at "in/at/@ ..." location phrases). A guess, never an
 * authority - the wizard shows it as one clickable candidate among others.
 */
export function deriveSubjectSegment(project: {
  catalog_id?: string | null;
  title?: string | null;
}): string {
  const headSubject = parseCatalogHead(project.catalog_id);
  if (headSubject) return headSubject;
  const cut = (project.title || '').replace(/\s+(?:in|at|@)\s+[\s\S]*$/i, '');
  return (
    cut
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || ''
  );
}

export interface SubjectOptions {
  /** From the project's own catalog_id head (the authoritative choice). */
  fromProject: string | null;
  /** Guessed from the title (clickable reference, not authoritative). */
  fromTitle: string;
  /** Subjects already used by this project's own assets. */
  existing: string[];
  /** Subjects used elsewhere in the same category, as reference. */
  peers: string[];
  /** Picture classes used across the same category, for the class dropdown. */
  commonGroups: string[];
}

export async function loadSubjectOptions(projectId: string): Promise<SubjectOptions | null> {
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, title, category, catalog_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return null;

  // "From project" is only the stamped catalog head - a title guess must not
  // masquerade as the project's authoritative code.
  const fromProject = parseCatalogHead(project.catalog_id);
  // deriveSubjectSegment prefers the catalog head, so recompute a pure title
  // guess for the reference chip.
  const titleGuess =
    (project.title || '')
      .replace(/\s+(?:in|at|@)\s+[\s\S]*$/i, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || '';

  const collectSubjects = (ids: string[]) => {
    const found = new Set<string>();
    for (const id of ids) {
      const parsed = parseCatalogId(id);
      if (parsed?.subject) found.add(parsed.subject);
    }
    return [...found];
  };

  // Subjects already stamped on this project's own assets.
  const { data: ownAssets } = await supabaseAdmin
    .from('gallery_assets')
    .select('catalog_id')
    .eq('project_id', projectId)
    .not('catalog_id', 'is', null)
    .limit(500);
  const existing = collectSubjects((ownAssets || []).map((r) => r.catalog_id as string));

  // Reference: subjects used anywhere in the same category (project heads +
  // sibling project assets), so a curator picks a consistent style.
  const peers = new Set<string>();
  const groupCount = new Map<string, number>();
  if (project.category) {
    const { data: siblings } = await supabaseAdmin
      .from('projects')
      .select('id, catalog_id, asset_groups')
      .eq('category', project.category)
      .neq('id', projectId)
      .limit(300);
    for (const s of collectSubjects((siblings || []).map((r) => r.catalog_id as string))) {
      if (!existing.includes(s)) peers.add(s);
    }
    // Picture classes the category actually uses, most common first.
    for (const sib of siblings || []) {
      for (const g of (sib.asset_groups as string[] | null) || []) {
        groupCount.set(g, (groupCount.get(g) || 0) + 1);
      }
    }
    const siblingIds = (siblings || []).map((r) => r.id as string);
    if (siblingIds.length > 0) {
      const { data: siblingAssets } = await supabaseAdmin
        .from('gallery_assets')
        .select('catalog_id, project_id')
        .in('project_id', siblingIds)
        .not('catalog_id', 'is', null)
        .limit(1000);
      for (const s of collectSubjects(
        (siblingAssets || []).map((r) => r.catalog_id as string)
      )) {
        if (!existing.includes(s)) peers.add(s);
      }
    }
  }

  const commonGroups = [...groupCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([g]) => g);

  return {
    fromProject: fromProject || null,
    fromTitle: titleGuess,
    existing,
    peers: [...peers].slice(0, 24),
    commonGroups,
  };
}

function pickLocalizedText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, string | undefined>;
    return record.en || record.zh || record.th || '';
  }
  return '';
}

export async function promoteDraftBatch(params: PromoteParams): Promise<PromoteResult> {
  const draftIds = params.draftIds.filter(Boolean);
  if (draftIds.length === 0) {
    return { success: false, error: 'No draft ids given' };
  }
  if (draftIds.length > 5) {
    return { success: false, error: 'Send at most 5 drafts per batch' };
  }

  const subject = normalizeSubject(params.subject);
  if (!subject) {
    return { success: false, error: 'Subject segment is empty after normalisation' };
  }
  const personCode = params.personCode || 'LMSY';

  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, title, category, event_date, catalog_id, cover_url')
    .eq('id', params.projectId)
    .maybeSingle();
  if (projectError || !project) {
    return { success: false, error: 'Project not found' };
  }

  const doorCode: DoorCode | undefined = CATEGORY_TO_DOOR_CODE[project.category || ''];
  if (!doorCode) {
    return {
      success: false,
      error: `Category "${project.category}" has no door mapping yet (phase 1 supports mapped categories)`,
    };
  }
  if (!project.event_date) {
    return {
      success: false,
      error: 'Project has no event date - fill it in first (the id needs a date segment)',
    };
  }

  const assetGroup = params.assetGroup?.trim() || null;
  const captionPrefix = params.captionPrefix?.trim() || assetGroup || subject;

  // Dry run: allocate the next id once, touch nothing.
  if (params.dryRun) {
    const firstId = await allocateNextCatalogId(supabaseAdmin, doorCode, project.event_date, {
      person: personCode,
      subject,
    });
    let previewKey: string | null = null;
    try {
      previewKey = r2KeyForCatalogId(firstId);
    } catch {
      previewKey = null;
    }
    return {
      success: true,
      preview: {
        firstCatalogId: firstId,
        r2Key: previewKey,
        doorCode,
        eventDate: project.event_date,
        subject,
        projectCatalogId: project.catalog_id || null,
      },
    };
  }

  const { data: drafts, error: draftsError } = await supabaseAdmin
    .from('draft_items')
    .select(
      'id, r2_media_url, r2_key, media_type, title, source_url, source_platform, source_account, source_post_id, file_hash'
    )
    .in('id', draftIds);
  if (draftsError || !drafts || drafts.length === 0) {
    return { success: false, error: 'Drafts not found' };
  }

  const r2 = r2ReadClient();
  const results: PromoteItemResult[] = [];
  const draftById = new Map(drafts.map((d) => [d.id, d]));

  let firstPromotedUrl: string | null = null;

  for (const draftId of draftIds) {
    const draft = draftById.get(draftId);
    if (!draft) {
      results.push({ draftId, status: 'skipped', error: 'Draft not found' });
      continue;
    }
    if (draft.media_type !== 'image' || !draft.r2_media_url) {
      results.push({ draftId, status: 'skipped', error: 'Not an image draft (or no media)' });
      continue;
    }

    try {
      const sourceKey = draft.r2_key || toR2Key(draft.r2_media_url);
      if (!sourceKey) {
        results.push({ draftId, status: 'failed', error: 'Cannot resolve draft R2 key' });
        continue;
      }
      const obj = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: sourceKey }));
      const raw = Buffer.from(await obj.Body!.transformToByteArray());

      const processed = await convertToWebP(raw, 95, true);
      const blur = await generateBlurData(raw).catch(() => null);

      let inserted: { id: string; catalog_id: string; image_url: string } | null = null;
      let lastError: unknown = null;

      for (let attempt = 0; attempt < CATALOG_ID_MAX_ATTEMPTS && !inserted; attempt++) {
        const catalogId = await allocateNextCatalogId(supabaseAdmin, doorCode, project.event_date, {
          person: personCode,
          subject,
        });
        const targetKey = r2KeyForCatalogId(catalogId);

        const up = await uploadToR2(processed.buffer, targetKey, 'image/webp');
        if (!up.success || !up.url) {
          lastError = new Error(`R2 upload failed: ${up.error ?? 'no url'}`);
          continue;
        }

        const seq = parseCatalogId(catalogId)?.sequence ?? 0;
        const caption = `${captionPrefix} ${String(seq).padStart(3, '0')}`;
        const draftTitle = pickLocalizedText(draft.title);

        const { data, error } = await supabaseAdmin
          .from('gallery_assets')
          .insert({
            image_url: up.url,
            caption,
            title: caption,
            tag: 'Feature',
            asset_group: assetGroup,
            is_featured: false,
            catalog_id: catalogId,
            is_editorial: false,
            blur_data: blur,
            project_id: params.projectId,
            event_date: project.event_date,
            display_role: 'regular',
            integrity_status: 'ok',
            is_cover: false,
            is_portal_candidate: false,
            sequence: seq,
            rotation: 0,
            width: processed.width,
            height: processed.height,
            source_url: draft.source_url || null,
            source_platform: draft.source_platform || null,
            source_account: draft.source_account || null,
            source_post_id: draft.source_post_id || null,
            file_hash: draft.file_hash || null,
            // Keep the raw user caption with the asset when it exists.
            excerpt: draftTitle || null,
          })
          .select('id, catalog_id, image_url')
          .single();

        if (error) {
          lastError = error;
          if (isCatalogIdConflict(error) && /image_url/i.test(error.message || '')) {
            // The same draft was promoted before: behave idempotently.
            const { data: existing } = await supabaseAdmin
              .from('gallery_assets')
              .select('id, catalog_id, image_url')
              .eq('image_url', up.url)
              .maybeSingle();
            if (existing) {
              inserted = existing;
              break;
            }
          }
          // catalog_id taken by a concurrent promotion: loop re-allocates.
          continue;
        }
        inserted = data;
      }

      if (!inserted) {
        results.push({
          draftId,
          status: 'failed',
          error: lastError instanceof Error ? lastError.message : String(lastError),
        });
        continue;
      }

      if (!firstPromotedUrl) firstPromotedUrl = inserted.image_url;
      results.push({
        draftId,
        status: 'promoted',
        catalogId: inserted.catalog_id,
        r2Key: r2KeyForCatalogId(inserted.catalog_id),
        width: processed.width,
        height: processed.height,
      });
    } catch (err) {
      results.push({
        draftId,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Post-promotion metadata writes. Both are best-effort: a failure here must
  // not fail the promoted assets.
  const promoted = results.filter((r) => r.status === 'promoted');
  let coverUpdated = false;
  if (params.writeCover && promoted.length > 0 && firstPromotedUrl) {
    const { error } = await supabaseAdmin
      .from('projects')
      .update({ cover_url: firstPromotedUrl, homepage_cover_url: firstPromotedUrl })
      .eq('id', params.projectId);
    coverUpdated = !error;
  }

  let projectCatalogIdWritten = false;
  if (promoted.length > 0 && !project.catalog_id) {
    const head = `${personCode}-${doorCode}-${subject}`;
    const { error } = await supabaseAdmin
      .from('projects')
      .update({ catalog_id: head })
      .eq('id', params.projectId);
    projectCatalogIdWritten = !error;
    if (error) {
      console.error('[PROMOTE] project catalog_id stamp failed:', error.message);
    }
  }

  return {
    success: promoted.length > 0,
    results,
    coverUpdated,
    projectCatalogIdWritten,
  };
}

export interface CleanupResult {
  success: boolean;
  cleaned: string[];
  failed: Array<{ draftId: string; error: string }>;
}

/**
 * Delete consumed draft rows AND their draft/ R2 objects. Only objects under
 * the draft/ prefix are ever touched, as a guard rail.
 */
export async function cleanupPromotedDrafts(draftIds: string[]): Promise<CleanupResult> {
  const ids = draftIds.filter(Boolean);
  if (ids.length === 0) {
    return { success: false, cleaned: [], failed: [{ draftId: '', error: 'No draft ids given' }] };
  }

  const { data: drafts, error } = await supabaseAdmin
    .from('draft_items')
    .select('id, r2_key, r2_media_url')
    .in('id', ids);
  if (error) {
    return { success: false, cleaned: [], failed: [{ draftId: '', error: error.message }] };
  }

  const cleaned: string[] = [];
  const failed: Array<{ draftId: string; error: string }> = [];

  for (const draft of drafts || []) {
    try {
      const key = draft.r2_key || toR2Key(draft.r2_media_url);
      if (key) {
        if (!key.startsWith('draft/')) {
          failed.push({ draftId: draft.id, error: `Refusing to delete non-draft object: ${key}` });
          continue;
        }
        await deleteDraftObject(key);
      }
      const { error: delError } = await supabaseAdmin.from('draft_items').delete().eq('id', draft.id);
      if (delError) {
        failed.push({ draftId: draft.id, error: delError.message });
        continue;
      }
      cleaned.push(draft.id);
    } catch (err) {
      failed.push({
        draftId: draft.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { success: failed.length === 0, cleaned, failed };
}

// Local import alias to keep the delete helper near the guard rail comment.
import { deleteFromR2 as deleteDraftObject } from './r2-client.ts';
