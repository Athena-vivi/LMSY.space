/**
 * Draft delete guard (remediation B2-T1, audit issue P1-4).
 *
 * WHY THIS EXISTS
 *   Draft delete used to remove the R2 object first and the database row
 *   second, without checking whether the same object is still referenced by
 *   published content. to-gallery copies image_url (the same R2 object) into
 *   gallery_assets while keeping the draft row, so deleting that draft could
 *   break a live image. R2 failures were also swallowed by Promise.allSettled.
 *
 * WHAT THIS MODULE GUARANTEES
 *   1. An R2 object is only deleted when NO other row references it. The
 *      reference sources match scripts/audit-r2-references.mjs:
 *        gallery_assets.image_url
 *        projects.cover_url, projects.homepage_cover_url
 *        site_content_blocks (any field, scanned as serialized JSON)
 *        draft_items.r2_media_url / r2_key (rows outside the delete set)
 *   2. cover_url exists in two historical formats (bare R2 key and full CDN
 *      URL); both are normalized before comparison.
 *   3. The check fails closed: if references cannot be loaded, the caller
 *      must abort instead of deleting.
 *
 * The matcher errs on the side of KEEPING an object (a false positive only
 * costs storage; a false negative breaks a published image).
 */

import { getRelativePath } from './r2-client.ts';

export interface DraftObjectRef {
  id: string;
  r2Key: string | null;
}

export type ObjectAction = 'delete-object' | 'keep-object';

export interface ObjectPlan {
  id: string;
  r2Key: string | null;
  action: ObjectAction;
  /** Tables/fields that still reference this object (empty when deleting). */
  referencedBy: string[];
}

/** Normalized R2 key -> list of "table.field" sources referencing it. */
export type ReferenceIndex = Map<string, string[]>;

/**
 * Minimal structural shape of the Supabase admin client used here. Keeping it
 * structural lets unit tests pass a stub without any environment or network.
 */
export interface SupabaseLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): { select(columns: string): PromiseLike<{ data: any; error: any }> };
}

/** Normalize a full CDN URL or a bare key to a bare R2 key (no leading slash). */
export function normalizeR2Key(urlOrKey: string): string {
  return getRelativePath(urlOrKey).replace(/^\/+/, '');
}

function addReference(index: ReferenceIndex, rawUrl: unknown, source: string): void {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return;
  const key = normalizeR2Key(rawUrl);
  if (!key) return;
  const sources = index.get(key);
  if (!sources) {
    index.set(key, [source]);
  } else if (!sources.includes(source)) {
    sources.push(source);
  }
}

/**
 * Build the reference index from already-fetched rows.
 * site_content_blocks is NOT indexed here (its fields are free-form); use
 * planDraftObjectDeletion with the block rows for that source.
 */
export function buildReferenceIndex(input: {
  galleryAssets: Array<{ image_url?: string | null }>;
  projects: Array<{ cover_url?: string | null; homepage_cover_url?: string | null }>;
  otherDrafts: Array<{ r2_media_url?: string | null; r2_key?: string | null }>;
}): ReferenceIndex {
  const index: ReferenceIndex = new Map();

  for (const row of input.galleryAssets) {
    addReference(index, row.image_url, 'gallery_assets.image_url');
  }
  for (const row of input.projects) {
    addReference(index, row.cover_url, 'projects.cover_url');
    addReference(index, row.homepage_cover_url, 'projects.homepage_cover_url');
  }
  for (const row of input.otherDrafts) {
    addReference(index, row.r2_media_url, 'draft_items.r2_media_url');
    addReference(index, row.r2_key, 'draft_items.r2_key');
  }

  return index;
}

/**
 * True when any serialized site_content_blocks row embeds this key. A block
 * field may hold the full CDN URL, which contains the bare key as a substring,
 * so a plain substring test covers both formats.
 */
export function blockReferencesKey(
  blocks: Array<Record<string, unknown>>,
  key: string
): boolean {
  if (!key) return false;
  for (const block of blocks) {
    let serialized: string;
    try {
      serialized = JSON.stringify(block);
    } catch {
      continue;
    }
    if (serialized && serialized.includes(key)) return true;
  }
  return false;
}

/**
 * Decide, per draft row, whether its R2 object may be deleted.
 * Rows whose object is still referenced keep the object; the caller still
 * deletes the database row and reports the kept objects explicitly.
 */
export function planDraftObjectDeletion(
  drafts: DraftObjectRef[],
  index: ReferenceIndex,
  siteContentBlocks: Array<Record<string, unknown>> = []
): ObjectPlan[] {
  return drafts.map((draft) => {
    if (!draft.r2Key) {
      return { id: draft.id, r2Key: null, action: 'delete-object' as const, referencedBy: [] };
    }

    const key = normalizeR2Key(draft.r2Key);
    const referencedBy = [...(index.get(key) || [])];

    if (referencedBy.length === 0 && blockReferencesKey(siteContentBlocks, key)) {
      referencedBy.push('site_content_blocks');
    }

    return {
      id: draft.id,
      r2Key: draft.r2Key,
      action: referencedBy.length > 0 ? ('keep-object' as const) : ('delete-object' as const),
      referencedBy,
    };
  });
}

/**
 * Load the reference index from the database. Throws on query errors so the
 * caller can fail closed (never delete when the reference picture is unknown).
 *
 * @param client        Supabase admin client (service_role, lmsy_archive schema)
 * @param excludeDraftIds  Draft ids about to be deleted; their own references
 *                      must not count (a shared object inside one delete set
 *                      is unreferenced once the whole set is gone).
 */
export async function loadReferenceIndex(
  client: SupabaseLike,
  excludeDraftIds: string[]
): Promise<{ index: ReferenceIndex; siteContentBlocks: Array<Record<string, unknown>> }> {
  const [gallery, projects, blocks, otherDrafts] = await Promise.all([
    client.from('gallery_assets').select('image_url'),
    client.from('projects').select('cover_url, homepage_cover_url'),
    client.from('site_content_blocks').select('*'),
    client.from('draft_items').select('id, r2_media_url, r2_key'),
  ]);

  for (const [table, result] of [
    ['gallery_assets', gallery],
    ['projects', projects],
    ['site_content_blocks', blocks],
    ['draft_items', otherDrafts],
  ] as const) {
    if (result.error) {
      throw new Error(`Failed to load R2 references from ${table}: ${String(result.error.message || result.error)}`);
    }
  }

  const excluded = new Set(excludeDraftIds);
  const index = buildReferenceIndex({
    galleryAssets: gallery.data || [],
    projects: projects.data || [],
    otherDrafts: (otherDrafts.data || []).filter(
      (row: { id?: string }) => !row.id || !excluded.has(row.id)
    ),
  });

  return { index, siteContentBlocks: blocks.data || [] };
}

export interface R2DeleteFailure {
  id: string;
  r2Key: string;
}

/**
 * Pair an aligned list of R2 delete attempts with their settled results and
 * return the failures, so callers can report them instead of swallowing them.
 */
export function collectR2Failures(
  deleteList: Array<{ id: string; r2Key: string }>,
  results: PromiseSettledResult<boolean>[]
): R2DeleteFailure[] {
  const failures: R2DeleteFailure[] = [];
  results.forEach((result, i) => {
    const entry = deleteList[i];
    if (!entry) return;
    const succeeded = result.status === 'fulfilled' && result.value === true;
    if (!succeeded) failures.push({ id: entry.id, r2Key: entry.r2Key });
  });
  return failures;
}
