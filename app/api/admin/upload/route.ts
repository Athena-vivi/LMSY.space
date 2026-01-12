import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { uploadToR2 } from '@/lib/r2-client';
import { convertToWebP, generateBlurData } from '@/lib/image-processing';
import { getR2PathForCatalogId } from '@/lib/catalog-id';

export async function POST(request: NextRequest) {
  // Authentication
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

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
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

  // Map project category to catalog prefix
  const categoryPrefixMap: Record<string, string> = {
    series: 'STILL',      // TV/Drama
    editorial: 'MAG',     // Magazine
    appearance: 'STAGE',  // Event/Stage
    journal: 'JRN',       // Daily/Travel
    commercial: 'AD',     // Ad/Brand
  };

  // Determine category prefix (default to 'G' if no project)
  const categoryPrefix = projectCategory && categoryPrefixMap[projectCategory]
    ? categoryPrefixMap[projectCategory]
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

    // Generate catalog ID with dynamic category prefix
    const compactDate = uploadDate.replace(/-/g, '');

    // Query for highest sequence for this category and date
    const prefix = `LMSY-${categoryPrefix}-${compactDate}`;
    const { data: lastItem } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .select('catalog_id')
      .like('catalog_id', `${prefix}-%`)
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

    catalogId = `LMSY-${categoryPrefix}-${compactDate}-${String(nextSequence).padStart(3, '0')}`;
    console.log('[UPLOAD] Generated catalog ID:', catalogId, 'for category:', categoryPrefix);
  }

  // WebP conversion with ARCHIVAL QUALITY (95)
  // 🔒 CRITICAL: Editorial content gets maximum quality preservation
  let webpResult;
  try {
    webpResult = await convertToWebP(file, 95, isEditorial);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'WebP conversion failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }

  // Blur data generation
  let blurData;
  try {
    blurData = await generateBlurData(file);
  } catch (error) {
    blurData = null;
  }

  // R2 upload
  const r2Path = getR2PathForCatalogId(catalogId);
  let uploadResult;
  try {
    uploadResult = await uploadToR2(webpResult.buffer, r2Path, 'image/webp');

    if (!uploadResult.success) {
      throw new Error(`R2 upload failed: ${uploadResult.error}`);
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to upload to R2',
        details: error instanceof Error ? error.message : String(error),
        r2Path,
      },
      { status: 500 }
    );
  }

  // Database insert - STRICT FIELD MAPPING
  let insertedItem;
  try {
    // Validate insert data before database call
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

    // 🔒 CRITICAL: Add project_id if provided
    if (projectId) {
      insertData.project_id = projectId;
      console.log('[UPLOAD] Adding project_id to insert:', projectId);
    }

    console.log('[UPLOAD] Insert data validation:', {
      fields: Object.keys(insertData),
      types: Object.fromEntries(
        Object.entries(insertData).map(([k, v]) => [k, typeof v])
      ),
    });

    const insertResult = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .insert(insertData)
      .select()
      .single();

    const { data, error: insertError } = insertResult;

    if (insertError) {
      // Parse Supabase error to identify specific field
      const errorDetails = {
        message: insertError.message,
        code: insertError.code,
        hint: insertError.hint,
        details: insertError.details,
      };

      // Identify field from error message or details
      let failingField = 'unknown';
      if (insertError.details) {
        const fieldMatch = insertError.details.match(/Key \((\w+)\)/);
        if (fieldMatch) failingField = fieldMatch[1];
      }
      if (insertError.message.includes('column')) {
        const colMatch = insertError.message.match(/column "(\w+)"/);
        if (colMatch) failingField = colMatch[1];
      }

      console.error('[UPLOAD] ❌ Database insert failed - Field:', failingField, errorDetails);

      throw new Error(`Field '${failingField}': ${insertError.message} (Code: ${insertError.code})`);
    }

    if (!data) {
      throw new Error('Database insert returned no data');
    }

    insertedItem = data;
    console.log(`[SYNC] Artifact ${catalogId} Uploaded Successfully`);

    // 🔒 ARCHIVE_SUCCESS LOG: 零误差上传确认
    console.log(`[ARCHIVE_SUCCESS] Physical: ${r2Path} | Logical: ${catalogId}`);
  } catch (error) {
    console.error('[UPLOAD] Database insert failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to insert into database',
        details: error instanceof Error ? error.message : String(error),
        uploadedFileUrl: uploadResult.url,
      },
      { status: 500 }
    );
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

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
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
      .from('gallery')
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
      .from('gallery')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      next_catalog_id: `LMSY-G-${today.replace(/-/g, '')}-${String(nextSequence).padStart(3, '0')}`,
      total_items: count || 0,
      today: today,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to retrieve statistics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
