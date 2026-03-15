import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
  try {
    const { id } = await params;

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('draft_items')
      .select('id,r2_media_url,media_type,title,description,event_date,tags,is_featured,project_id,chronicle_excerpt')
      .eq('id', id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { success: false, error: draftError?.message || 'Draft not found' },
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
      return NextResponse.json(
        { success: false, error: existingError.message },
        { status: 500 }
      );
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
    const primaryTag = Array.isArray(draft.tags) && draft.tags.length > 0 ? draft.tags[0] : null;

    const { data: insertedAsset, error: insertError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .insert({
        image_url: draft.r2_media_url,
        title: title || null,
        excerpt: draft.chronicle_excerpt || description || null,
        caption: title || description || '',
        tag: primaryTag,
        is_featured: draft.is_featured ?? false,
        project_id: draft.project_id,
        event_date: draft.event_date,
        integrity_status: 'ok',
        display_role: 'regular',
      })
      .select('id,image_url,milestone_priority')
      .single();

    if (insertError || !insertedAsset) {
      return NextResponse.json(
        { success: false, error: insertError?.message || 'Failed to create asset' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      created: true,
      data: insertedAsset,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
