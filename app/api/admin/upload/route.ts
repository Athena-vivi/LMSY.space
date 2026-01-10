import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { uploadToR2 } from '@/lib/r2-client';
import { convertToWebP, generateBlurData } from '@/lib/image-processing';
import { generateNextGalleryCatalogId, getR2PathForCatalogId } from '@/lib/catalog-id';

/**
 * Gallery Upload API - Astra 馆长档案标准
 *
 * STRICT ERROR HANDLING:
 * - Any error immediately stops the process
 * - All errors are returned to frontend with full details
 * - No silent failures
 */

export async function POST(request: NextRequest) {
  // ========================================
  // PRE-FLIGHT: ENVIRONMENT CHECKS
  // ========================================
  const requiredEnvVars = {
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('[UPLOAD] ❌ Missing environment variables:', missingVars.join(', '));
    return NextResponse.json(
      {
        error: 'LOCAL_ENV_MISSING: Check .env.local',
        details: `Missing required environment variables: ${missingVars.join(', ')}`,
        missingVars,
      },
      { status: 500 }
    );
  }

  // ========================================
  // AUTHENTICATION
  // ========================================
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    console.error('[UPLOAD] ❌ Authentication failed:', authResult.error);
    return NextResponse.json(
      { error: 'Unauthorized', details: authResult.error },
      { status: 401 }
    );
  }

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (authResult.user.email !== adminEmail) {
    console.error('[UPLOAD] ❌ Authorization failed: Non-admin user');
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  // ========================================
  // PARSE FORM DATA
  // ========================================
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const caption = formData.get('caption') as string | null;
  const tag = formData.get('tag') as string | null;
  const isFeatured = formData.get('is_featured') === 'true';
  const isEditorial = formData.get('is_editorial') === 'true';
  const curatorNote = formData.get('curator_note') as string | null;
  const eventDate = formData.get('event_date') as string | null;
  const manualCatalogId = formData.get('catalog_id') as string | null;

  if (!file) {
    console.error('[UPLOAD] ❌ No file provided');
    return NextResponse.json(
      { error: 'No file provided' },
      { status: 400 }
    );
  }

  if (!file.type.startsWith('image/')) {
    console.error('[UPLOAD] ❌ Invalid file type:', file.type);
    return NextResponse.json(
      { error: 'File must be an image' },
      { status: 400 }
    );
  }

  // ========================================
  // DETERMINE CATALOG ID
  // ========================================
  const supabaseAdmin = getSupabaseAdmin();
  let catalogId: string;
  let uploadDate: string;

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
        console.error('[UPLOAD] ❌ Invalid date format:', eventDate);
        return NextResponse.json(
          { error: 'Invalid date format. Expected YYYY-MM-DD' },
          { status: 400 }
        );
      }
      uploadDate = eventDate;
    } else {
      uploadDate = new Date().toISOString().split('T')[0];
    }

    catalogId = await generateNextGalleryCatalogId(supabaseAdmin, uploadDate);
  }

  // ========================================
  // WEBP CONVERSION
  // ========================================
  let webpResult;
  try {
    webpResult = await convertToWebP(file, 85);
  } catch (error) {
    console.error('[UPLOAD] ❌ WebP conversion failed:', error);
    return NextResponse.json(
      {
        error: 'WebP conversion failed',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }

  // ========================================
  // BLUR DATA GENERATION
  // ========================================
  let blurData;
  try {
    blurData = await generateBlurData(file);
  } catch (error) {
    console.warn('[UPLOAD] ⚠️ Blur generation failed (non-fatal):', error);
    blurData = null;
  }

  // ========================================
  // R2 UPLOAD
  // ========================================
  const r2Path = getR2PathForCatalogId(catalogId);
  let uploadResult;
  try {
    uploadResult = await uploadToR2(webpResult.buffer, r2Path, 'image/webp');

    if (!uploadResult.success) {
      console.error('[UPLOAD] ❌ R2 upload failed:', uploadResult.error);
      throw new Error(`R2 upload failed: ${uploadResult.error}`);
    }
  } catch (error) {
    console.error('[UPLOAD] ❌ R2 upload exception:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload to R2',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        r2Path,
        bucket: process.env.R2_BUCKET_NAME,
      },
      { status: 500 }
    );
  }

  // ========================================
  // DATABASE INSERT
  // ========================================
  let insertedItem;
  try {
    const insertResult = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .insert({
        image_url: uploadResult.url,
        caption: caption || null,
        tag: tag || null,
        is_featured: isFeatured,
        catalog_id: catalogId,
        is_editorial: isEditorial,
        curator_note: curatorNote || null,
        blur_data: blurData,
        event_date: uploadDate,
      })
      .select()
      .single();

    const { data, error: insertError } = insertResult;

    if (insertError) {
      console.error('[UPLOAD] ❌ Database insert failed:', insertError.message, '| Code:', insertError.code);
      throw insertError;
    }

    if (!data) {
      console.error('[UPLOAD] ❌ Database insert returned NULL');
      throw new Error('Database insert returned no data');
    }

    insertedItem = data;
    console.log('[UPLOAD] ✅', catalogId, '| ID:', insertedItem.id);
  } catch (error) {
    console.error('[UPLOAD] ❌ Database operation exception:', error);
    return NextResponse.json(
      {
        error: 'Failed to insert into database',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        uploadedFileUrl: uploadResult.url,
      },
      { status: 500 }
    );
  }

  // ========================================
  // SUCCESS RESPONSE
  // ========================================
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
    console.error('[UPLOAD_STATS] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve statistics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
