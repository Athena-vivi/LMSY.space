import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { uploadToR2, deleteFromR2 } from '@/lib/r2-client';
import { convertToWebP, generateBlurData } from '@/lib/image-processing';
import { getR2PathForCatalogId, isCatalogIdConflict, CATALOG_ID_MAX_ATTEMPTS, allocateNextCatalogId as allocateSharedCatalogId, CATEGORY_TO_CATALOG_PREFIX } from '@/lib/catalog-id';
import { getAdminEmail } from '@/lib/security/api-auth';
import { validateUploadFile } from '@/lib/security/upload-guard';
import { apiServerError } from '@/lib/security/http';

export async function POST(request: NextRequest) {
  // Authentication
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

  // Parse form data
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const caption = formData.get('caption') as string | null;
  const tag = formData.get('tag') as string | null;
  const isFeatured = formData.get('is_featured') === 'true';
  const isEditorial = formData.get('is_editorial') === 'true';
  const curatorNote = formData.get('curator_note') as string | null;
  const eventDate = formData.get('event_date') as string | null;
  const manualCatalogId = formData.get('catalog_id') as string | null;
  const projectId = formData.get('project_id') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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

  // Determine catalog ID and category based on project
  const supabaseAdmin = getSupabaseAdmin();
  let catalogId: string;
  let uploadDate: string;
  let projectCategory: string | null = null;

  // If project_id is provided, fetch the project to get its category
  if (projectId) {
    console.log('[UPLOAD] Project ID provided, fetching project category:', projectId);
    const { data: project, error: projectError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('category')
      .eq('id', projectId)
      .maybeSingle();

    if (!projectError && project) {
      projectCategory = project.category;
      console.log('[UPLOAD] Project category:', projectCategory);
    } else {
      console.warn('[UPLOAD] Failed to fetch project category:', projectError);
    }
  }

  // Map project category to catalog prefix (shared with draft promotion,
  // see lib/catalog-id.ts — ADR-001 D5). Default to 'G' if no project.
  const categoryPrefix = projectCategory && CATEGORY_TO_CATALOG_PREFIX[projectCategory]
    ? CATEGORY_TO_CATALOG_PREFIX[projectCategory]
    : 'G';

  if (manualCatalogId && manualCatalogId.trim()) {
    catalogId = manualCatalogId.trim();

    const match = catalogId.match(/^LMSY-[A-Z]+-(\d{8})-\d{3}$/);
    if (match) {
      const compactDate = match[1];
      uploadDate = `${compactDate.substring(0, 4)}-${compactDate.substring(4, 6)}-${compactDate.substring(6, 8)}`;
    } else {
      uploadDate = eventDate || new Date().toISOString().split('T')[0];
    }
  } else {
    if (eventDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(eventDate)) {
        return NextResponse.json(
          { error: 'Invalid date format. Expected YYYY-MM-DD' },
          { status: 400 }
        );
      }
      uploadDate = eventDate;
    } else {
      uploadDate = new Date().toISOString().split('T')[0];
    }

    // Generate catalog ID with dynamic category prefix via the shared
    // allocation helper (same logic previously inlined here; now also used
    // by the draft-promotion path).
    catalogId = await allocateSharedCatalogId(supabaseAdmin, categoryPrefix, uploadDate);
    console.log('[UPLOAD] Generated catalog ID:', catalogId, 'for category:', categoryPrefix);
  }

  // WebP conversion with ARCHIVAL QUALITY (95)
  // 🔒 CRITICAL: Editorial content gets maximum quality preservation
  let webpResult;
  try {
    webpResult = await convertToWebP(file, 95, isEditorial);
  } catch (error) {
    return apiServerError('admin/upload', error);
  }

  // Blur data generation
  let blurData;
  try {
    blurData = await generateBlurData(file);
  } catch {
    blurData = null;
  }

  // R2 upload + database insert.
  //
  // PHASE 1 FIXES APPLIED HERE:
  // 1. Target table: this route used to allocate catalog ids from, and insert
  //    into, the legacy `gallery` table. That table holds 0 rows and the public
  //    site reads `gallery_assets`, so uploads made through this endpoint never
  //    appeared on the site. Both the sequence query and the insert now use
  //    `gallery_assets` (all inserted columns exist there).
  // 2. Concurrency: the catalog id is picked with read-max-then-add-one, so two
  //    uploads of the same category/date can choose the same sequence. The
  //    unique index on gallery_assets.catalog_id now rejects the second write;
  //    we detect that conflict, remove the object we just uploaded (so no orphan
  //    is left behind) and retry with a freshly allocated id.
  let r2Path = '';
  let uploadResult: Awaited<ReturnType<typeof uploadToR2>> | null = null;
  let insertedItem: any = null;

  const allocateNextCatalogId = async (): Promise<string> => {
    // Delegate to the shared allocation helper (single implementation for
    // both upload and draft promotion, see lib/catalog-id.ts).
    return allocateSharedCatalogId(supabaseAdmin, categoryPrefix, uploadDate);
  };

  const canRetryWithNewId = !(manualCatalogId && manualCatalogId.trim());

  for (let attempt = 1; attempt <= CATALOG_ID_MAX_ATTEMPTS; attempt++) {
    r2Path = getR2PathForCatalogId(catalogId);

    try {
      uploadResult = await uploadToR2(webpResult.buffer, r2Path, 'image/webp');
      if (!uploadResult.success) {
        throw new Error(`R2 upload failed: ${uploadResult.error}`);
      }
    } catch (error) {
      console.error('[UPLOAD] R2 upload failed at', r2Path);
      return apiServerError('admin/upload', error);
    }

    const insertData: Record<string, any> = {
      image_url: uploadResult.url,
      caption: caption || null,
      tag: tag || null,
      is_featured: isFeatured,
      catalog_id: catalogId,
      is_editorial: isEditorial,
      curator_note: curatorNote || null,
      blur_data: blurData,
      event_date: uploadDate,
    };

    if (projectId) {
      insertData.project_id = projectId;
    }

    const { data, error: insertError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .insert(insertData)
      .select()
      .single();

    if (!insertError && data) {
      insertedItem = data;
      console.log(`[SYNC] Artifact ${catalogId} uploaded successfully`);
      console.log(`[ARCHIVE_SUCCESS] Physical: ${r2Path} | Logical: ${catalogId}`);
      break;
    }

    // Catalog id collision: clean up the object we just wrote and retry.
    if (insertError && isCatalogIdConflict(insertError) && canRetryWithNewId && attempt < CATALOG_ID_MAX_ATTEMPTS) {
      console.warn(`[UPLOAD] catalog_id ${catalogId} already taken, retrying with the next sequence (attempt ${attempt})`);
      await deleteFromR2(r2Path).catch(() => undefined);
      catalogId = await allocateNextCatalogId();
      continue;
    }

    if (insertError) {
      // Identify the failing field for the server log only.
      let failingField = 'unknown';
      if (insertError.details) {
        const fieldMatch = insertError.details.match(/Key \((\w+)\)/);
        if (fieldMatch) failingField = fieldMatch[1];
      }
      const columnMatch = insertError.message.match(/column "(\w+)"/);
      if (columnMatch) failingField = columnMatch[1];
      console.error(`[UPLOAD] database insert failed (field: ${failingField}, code: ${insertError.code})`);
      return apiServerError('admin/upload', new Error(insertError.message));
    }

    return apiServerError('admin/upload', new Error('Database insert returned no data'));
  }

  if (!insertedItem || !uploadResult) {
    return apiServerError('admin/upload', new Error('Could not allocate a unique catalog id after retries'));
  }

  // Success response
  return NextResponse.json({
    success: true,
    data: {
      id: insertedItem.id,
      catalog_id: catalogId,
      image_url: uploadResult.url,
      r2_path: r2Path,
      event_date: uploadDate,
      caption: insertedItem.caption,
      tag: insertedItem.tag,
      is_featured: insertedItem.is_featured,
      is_editorial: insertedItem.is_editorial,
      curator_note: insertedItem.curator_note,
      metadata: {
        originalSize: file.size,
        webpSize: webpResult.sizeBytes,
        compressionRatio: `${((1 - webpResult.sizeBytes / file.size) * 100).toFixed(1)}%`,
        dimensions: `${webpResult.width}x${webpResult.height}`,
      },
    },
  });
}

/**
 * GET endpoint to retrieve upload statistics
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user || authResult.error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminEmail = getAdminEmail();
    if (authResult.user?.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0];

    const { data: lastItem } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('catalog_id')
      .like('catalog_id', `LMSY-G-${today.replace(/-/g, '')}-%`)
      .order('catalog_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextSequence = 1;
    if (lastItem?.catalog_id) {
      const match = lastItem.catalog_id.match(/-(\d{3})$/);
      if (match) {
        nextSequence = parseInt(match[1], 10) + 1;
      }
    }

    const { count } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      next_catalog_id: `LMSY-G-${today.replace(/-/g, '')}-${String(nextSequence).padStart(3, '0')}`,
      total_items: count || 0,
      today: today,
    });
  } catch (error) {
    return apiServerError('admin/upload', error);
  }
}
