import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadToR2 } from '@/lib/r2-client';
import { convertToWebP, type ProcessedImageResult } from '@/lib/image-processing';
import { requireAdmin } from '@/lib/security/api-auth';
import { validateUploadFile } from '@/lib/security/upload-guard';
import { apiServerError } from '@/lib/security/http';
import { buildManualDraftRecord } from '@/lib/manual-draft';
import { getR2PathForCatalogId, isValidCatalogId, parseCatalogId } from '@/lib/catalog-id';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

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

    if (!isValidCatalogId(catalogId)) {
      return NextResponse.json(
        {
          error: 'Invalid catalog ID format',
          expected: '<PERSON>-<DOOR>-<SUBJECT>[-<THEME>]-<YYYYMMDD>-<NNN>',
          example: 'LMSY-MAG-THER-HEARTBEATFORYOU-20250801-001',
          catalogId,
        },
        { status: 400 }
      );
    }

    const parsed = parseCatalogId(catalogId);
    const idYear = parsed?.date ? parsed.date.substring(0, 4) : null;
    if (idYear && eventDate && idYear !== eventDate.substring(0, 4)) {
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

    const r2Path = getR2PathForCatalogId(catalogId);
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
