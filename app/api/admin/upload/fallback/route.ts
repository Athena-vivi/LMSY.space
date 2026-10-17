import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadToR2 } from '@/lib/r2-client';
import { convertToWebP, type ProcessedImageResult } from '@/lib/image-processing';
import { getAdminEmail } from '@/lib/security/api-auth';
import { validateUploadFile } from '@/lib/security/upload-guard';
import { apiServerError } from '@/lib/security/http';
import { buildManualDraftRecord } from '@/lib/manual-draft';

export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json(
      { error: 'Unauthorized', details: authResult.error },
      { status: 401 }
    );
  }

  const adminEmail = getAdminEmail();
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

    // Server-side validation: size limit, declared MIME allowlist (SVG excluded),
    // and magic-byte sniffing. This is the authoritative check.
    const validation = await validateUploadFile(file);
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: validation.status }
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
    // Phase 3: shared manual-draft payload (lib/manual-draft.ts). The previous
    // inline insert wrote source_platform='manual' with source_url=null, which
    // violates the draft_items_source_platform_required CHECK and made every
    // fallback registration fail; both stay NULL here and 'manual' lives in
    // tags[0]. Same contract as /api/admin/upload/register.
    const { data, error } = await supabaseAdmin
      .from('draft_items')
      .insert(
        buildManualDraftRecord({
          catalogId,
          r2Key: r2Path,
          imageUrl: r2Result.url,
          eventDate,
          caption: caption || null,
          tag: tag || null,
          projectId: projectId || null,
          isFeatured,
        })
      )
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
    return apiServerError('admin/upload/fallback', error);
  }
}
