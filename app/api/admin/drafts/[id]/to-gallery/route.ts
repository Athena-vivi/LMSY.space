import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizeLocalizedText } from '@/lib/localized-content';
import { buildProvenanceFields } from '@/lib/provenance';
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
      .select('id,r2_media_url,media_type,title,description,event_date,tags,is_featured,project_id,chronicle_excerpt,chronicle_excerpt_i18n,source_url,source_platform')
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
    const primaryTag = Array.isArray(draft.tags) && draft.tags.length > 0 ? draft.tags[0] : null;
    // Phase 3 batch 1: carry the draft's provenance into the published asset
    // so every gallery image remains traceable to its origin. Values are
    // normalized (trimmed, empty -> null); unknown stays NULL, never faked.
    const provenance = buildProvenanceFields(draft);

    const { data: insertedAsset, error: insertError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .insert({
        image_url: draft.r2_media_url,
        title: title || null,
        title_i18n: draft.title || null,
        excerpt: draft.chronicle_excerpt || description || null,
        excerpt_i18n: chronicleExcerptI18n,
        caption: title || description || '',
        caption_i18n: draft.title || draft.description || null,
        tag: primaryTag,
        is_featured: draft.is_featured ?? false,
        project_id: draft.project_id,
        event_date: draft.event_date,
        source_url: provenance.source_url,
        source_platform: provenance.source_platform,
        integrity_status: 'ok',
        display_role: 'regular',
      })
      .select('id,image_url,milestone_priority')
      .single();

    if (insertError || !insertedAsset) {
      return apiServerError('admin/drafts/[id]/to-gallery POST', insertError);
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
