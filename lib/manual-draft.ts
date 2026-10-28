/**
 * Manual-upload draft payload builder (phase 3 ingestion contract).
 *
 * Used by lib/asset-move.ts when an archived picture is sent back to the
 * draft inbox, so the row is byte-identical to what the deleted manual
 * upload routes used to write.
 *
 * SCHEMA CONSTRAINT (verified against pg_constraint, phase 3 audit):
 * draft_items_source_platform_required demands that source_url and
 * source_platform are either BOTH set or BOTH null. Manual uploads have no
 * original source page, so both stay NULL and the 'manual' marker lives in
 * tags[0] instead. Writing source_platform='manual' with source_url=null
 * violates the CHECK and made every manual registration fail (0 'manual'
 * rows ever existed).
 */

export interface ManualDraftInput {
  catalogId: string;
  r2Key: string;
  imageUrl: string;
  eventDate: string;
  caption: string | null;
  tag: string | null;
  projectId: string | null;
  isFeatured: boolean;
}

export interface ManualDraftRecord {
  source_url: null;
  source_platform: null;
  source_post_id: string;
  r2_media_url: string;
  r2_key: string;
  media_type: 'image';
  media_metadata: Record<string, never>;
  title: { en: string; zh: string; th: string };
  description: { en: string; zh: string; th: string };
  event_date: string;
  raw_event_date: string;
  status: 'draft';
  ingestion_stage: 'ready';
  ai_translation_status: 'skipped';
  curator_note: string;
  tags: string[];
  is_featured: boolean;
  project_id: string | null;
}

export function buildManualDraftRecord(input: ManualDraftInput): ManualDraftRecord {
  const caption = input.caption?.trim() || '';
  const tags = input.tag?.trim() ? ['manual', input.tag.trim()] : ['manual'];

  return {
    source_url: null,
    source_platform: null,
    source_post_id: input.catalogId,
    r2_media_url: input.imageUrl,
    r2_key: input.r2Key,
    media_type: 'image',
    media_metadata: {},
    title: { en: caption, zh: '', th: '' },
    description: { en: '', zh: '', th: '' },
    event_date: input.eventDate,
    raw_event_date: input.eventDate,
    status: 'draft',
    ingestion_stage: 'ready',
    ai_translation_status: 'skipped',
    curator_note:
      'Manual upload: source_url/source_platform stay NULL by design (draft_items_source_platform_required CHECK); the catalog id is kept in source_post_id.',
    tags,
    is_featured: input.isFeatured,
    project_id: input.projectId && input.projectId !== '' ? input.projectId : null,
  };
}
