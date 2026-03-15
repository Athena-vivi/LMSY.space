import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadToR2 } from '@/lib/r2-client';
import { convertToWebP, type ProcessedImageResult } from '@/lib/image-processing';

export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json(
      { error: 'Unauthorized', details: authResult.error },
      { status: 401 }
    );
  }

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (authResult.user.email !== adminEmail) {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const catalogId = formData.get('catalogId') as string;
    const eventDate = formData.get('eventDate') as string | null;
    const caption = formData.get('caption') as string | null;
    const tag = formData.get('tag') as string | null;
    const projectId = formData.get('projectId') as string | null;
    const isFeatured = formData.get('isFeatured') === 'true';

    if (!file || !catalogId || !eventDate) {
      return NextResponse.json(
        { error: 'file, catalogId and eventDate are required' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    const catalogMatch = catalogId.match(/^LMSY-[A-Z]+-(\d{4})(\d{2})(\d{2})-(\d{3})$/);
    if (!catalogMatch) {
      return NextResponse.json(
        { error: 'Invalid catalog ID format' },
        { status: 400 }
      );
    }

    const [, year] = catalogMatch;
    const eventYear = eventDate.substring(0, 4);
    if (year !== eventYear) {
      return NextResponse.json(
        { error: 'Year mismatch between catalog ID and event date' },
        { status: 400 }
      );
    }

    let webpResult: ProcessedImageResult;
    try {
      webpResult = await convertToWebP(file);
    } catch (error) {
      throw new Error(`WebP conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const r2Path = `magazines/${year}/${catalogId}.webp`;
    const r2Result = await uploadToR2(webpResult.buffer, r2Path, 'image/webp');
    if (!r2Result.success || !r2Result.url) {
      throw new Error(`R2 upload failed: ${r2Result.error || 'Unknown error'}`);
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('draft_items')
      .insert({
        source_platform: 'manual',
        source_url: null,
        source_post_id: catalogId,
        r2_media_url: r2Result.url,
        r2_key: r2Path,
        media_type: 'image',
        media_metadata: {},
        title: { en: caption || '', zh: '', th: '' },
        description: { en: '', zh: '', th: '' },
        event_date: eventDate,
        raw_event_date: eventDate,
        status: 'draft',
        ingestion_stage: 'ready',
        ai_translation_status: 'skipped',
        curator_note: null,
        tags: tag ? [tag] : [],
        is_featured: isFeatured,
        project_id: projectId && projectId !== '' ? projectId : null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create draft');
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        catalog_id: catalogId,
        image_url: r2Result.url,
        r2_path: r2Path,
        event_date: eventDate,
        project_id: projectId || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fallback upload failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
