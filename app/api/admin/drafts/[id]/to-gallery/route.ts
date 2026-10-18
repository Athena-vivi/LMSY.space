import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizeLocalizedText } from '@/lib/localized-content';
import { buildProvenanceFields } from '@/lib/provenance';
import { resolveAssetTagFromDraft } from '@/lib/asset-tag';
import {
  allocateNextCatalogId,
  isCatalogIdConflict,
  CATEGORY_TO_CATALOG_PREFIX,
  CATALOG_ID_MAX_ATTEMPTS,
} from '@/lib/catalog-id';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';

interface RouteContext {
  params: Promise<{ id: string }>;
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

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('draft_items')
      .select('id,r2_media_url,media_type,title,description,event_date,tags,is_featured,project_id,chronicle_excerpt,chronicle_excerpt_i18n,source_url,source_platform,source_account,source_post_id,file_hash')
      .eq('id', id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    if (draft.media_type !== 'image') {
      return NextResponse.json(
        { success: false, error: 'Only image drafts can be added to assets' },
        { status: 400 }
      );
    }

    if (!draft.r2_media_url) {
      return NextResponse.json(
        { success: false, error: 'Draft has no media url' },
        { status: 400 }
      );
    }

    if (!draft.project_id) {
      return NextResponse.json(
        { success: false, error: 'Project is required before writing to assets' },
        { status: 400 }
      );
    }

    const { data: existingAsset, error: existingError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id,image_url,milestone_priority')
      .eq('image_url', draft.r2_media_url)
      .maybeSingle();

    if (existingError) {
      return apiServerError('admin/drafts/[id]/to-gallery POST', existingError);
    }

    if (existingAsset) {
      return NextResponse.json({
        success: true,
        created: false,
        data: existingAsset,
      });
    }

    const title = pickLocalizedText(draft.title);
    const description = pickLocalizedText(draft.description);
    const chronicleExcerptI18n = normalizeLocalizedText(
      draft.chronicle_excerpt_i18n || draft.description,
      draft.chronicle_excerpt || description || ''
    );
    // ADR-001 D3: draft tags hold source-channel words (platform names,
    // raw hashtags) — provenance, NOT classification. Never copy them into
    // gallery_assets.tag; promoted assets stay unclassified (NULL) until
    // the webmaster ratifies the tag enum and assigns one explicitly.
    const assetTag = resolveAssetTagFromDraft(draft.tags);
    // Phase 3 batch 1: carry the draft's provenance into the published asset
    // so every gallery image remains traceable to its origin. Values are
    // normalized (trimmed, empty -> null); unknown stays NULL, never faked.
    const provenance = buildProvenanceFields(draft);

    // ADR-001 D5: every promoted asset gets a persistent catalog_id, using
    // the same allocation logic as manual upload (extracted to lib/catalog-id).
    const { data: projectRow } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('category')
      .eq('id', draft.project_id)
      .maybeSingle();
    if (!projectRow) {
      return NextResponse.json(
        { success: false, error: 'Linked project no longer exists' },
        { status: 400 }
      );
    }
    const categoryPrefix = CATEGORY_TO_CATALOG_PREFIX[projectRow.category] || 'G';
    const eventDate =
      typeof draft.event_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(draft.event_date)
        ? draft.event_date
        : new Date().toISOString().split('T')[0];

    const baseInsert = {
      image_url: draft.r2_media_url,
      title: title || null,
      title_i18n: draft.title || null,
      excerpt: draft.chronicle_excerpt || description || null,
      excerpt_i18n: chronicleExcerptI18n,
      caption: title || description || '',
      caption_i18n: draft.title || draft.description || null,
      tag: assetTag,
      is_featured: draft.is_featured ?? false,
      project_id: draft.project_id,
      event_date: draft.event_date,
      source_url: provenance.source_url,
      source_platform: provenance.source_platform,
      source_account: provenance.source_account,
      // Phase 7: the original post id and the file hash are collected at
      // ingest time and used to trace a photo back to its post and to spot
      // duplicate files. They are copied verbatim - a missing value stays
      // missing rather than being derived from something else.
      source_post_id: draft.source_post_id ?? null,
      file_hash: draft.file_hash ?? null,
      integrity_status: 'ok',
      display_role: 'regular',
    };

    // Insert with catalog_id retry: allocation (max+1) is not atomic, so two
    // concurrent promotions can pick the same sequence. The unique indexes on
    // gallery_assets.catalog_id are the final authority; on 23505 we simply
    // re-allocate and retry. A conflict on image_url (double-click race
    // against the pre-check above) resolves to the existing asset instead.
    let insertedAsset: { id: string; image_url: string; milestone_priority: unknown } | null = null;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= CATALOG_ID_MAX_ATTEMPTS; attempt++) {
      const catalogId = await allocateNextCatalogId(supabaseAdmin, categoryPrefix, eventDate);
      const { data, error } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .insert({ ...baseInsert, catalog_id: catalogId })
        .select('id,image_url,milestone_priority')
        .single();

      if (!error) {
        insertedAsset = data;
        break;
      }
      lastError = error;

      if (isCatalogIdConflict(error) && /image_url/i.test(error.message || '')) {
        // Lost the image_url race: the asset exists now, behave idempotently.
        const { data: existing } = await supabaseAdmin
          .schema('lmsy_archive')
          .from('gallery_assets')
          .select('id,image_url,milestone_priority')
          .eq('image_url', draft.r2_media_url)
          .maybeSingle();
        if (existing) {
          return NextResponse.json({ success: true, created: false, data: existing });
        }
        break;
      }

      if (!isCatalogIdConflict(error) || attempt === CATALOG_ID_MAX_ATTEMPTS) {
        break;
      }
      // else: catalog_id taken by a concurrent promotion — loop re-allocates.
    }

    if (!insertedAsset) {
      return apiServerError('admin/drafts/[id]/to-gallery POST', lastError);
    }

    return NextResponse.json({
      success: true,
      created: true,
      data: insertedAsset,
    });
  } catch (error) {
    return apiServerError('admin/drafts/[id]/to-gallery POST', error);
  }
}
