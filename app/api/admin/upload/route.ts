import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadToR2, getRelativePath } from '@/lib/r2-client';
import { convertToWebP, generateBlurData, getImageMetadata } from '@/lib/image-processing';
import { generateNextGalleryCatalogId } from '@/lib/catalog-id';

/**
 * Gallery Upload API
 *
 * Features:
 * - Schema locked to lmsy_archive
 * - Auto-numbering with catalog_id (LMSY-G-2026-XXX)
 * - Automatic WebP conversion
 * - Optimized R2 paths using catalog_id
 * - Blur data generation
 */

export async function POST(request: NextRequest) {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') || '';

    // 使用 SSR 客户端进行身份验证
    const supabaseAuth = createServerClient(
      rawUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
      }
    );

    // 验证用户身份
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 双重身份校验：硬编码检查 Email
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (user.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // 检查是否为管理员
    const { data: adminCheck, error: adminError } = await supabaseAuth
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !adminCheck) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string | null;
    const tag = formData.get('tag') as string | null;
    const isFeatured = formData.get('is_featured') === 'true';
    const isEditorial = formData.get('is_editorial') === 'true';
    const curatorNote = formData.get('curator_note') as string | null;
    const eventDate = formData.get('event_date') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Schema 锁定：使用馆长客户端（已锁定到 lmsy_archive schema）
    const supabaseAdmin = getSupabaseAdmin();

    // Step 1: Extract year from event_date
    let eventYear: number;
    if (eventDate) {
      // Parse event_date (format: YYYY-MM-DD)
      eventYear = parseInt(eventDate.split('-')[0], 10);
      console.log('[UPLOAD] Extracted year from event_date:', eventYear);
    } else {
      // Fallback to current year if no event_date provided
      eventYear = new Date().getFullYear();
      console.warn('[UPLOAD] No event_date provided, using current year:', eventYear);
    }

    // Step 2: Generate catalog_id with event year (auto-numbering)
    const catalogId = await generateNextGalleryCatalogId(supabaseAdmin, eventYear);

    console.log('[UPLOAD] Generated catalog_id:', catalogId, 'for year:', eventYear);

    // Step 3: Convert to WebP with optimization
    console.log('[UPLOAD] Converting to WebP...');
    const webpResult = await convertToWebP(file, 85);

    console.log('[UPLOAD] WebP conversion complete:', {
      originalSize: file.size,
      webpSize: webpResult.sizeBytes,
      compression: `${((1 - webpResult.sizeBytes / file.size) * 100).toFixed(1)}%`,
      dimensions: `${webpResult.width}x${webpResult.height}`,
    });

    // Step 4: Generate blur data
    console.log('[UPLOAD] Generating blur data...');
    const blurData = await generateBlurData(file);

    // Step 5: Upload to R2 with year-based archival path
    // R2 path: gallery/{year}/{catalogId}.webp (e.g., gallery/2022/LMSY-G-2022-001.webp)
    const r2Path = `gallery/${eventYear}/${catalogId}.webp`;

    console.log('[UPLOAD] Uploading to R2:', r2Path);
    const uploadResult = await uploadToR2(webpResult.buffer, r2Path, 'image/webp');

    if (!uploadResult.success) {
      console.error('[UPLOAD] R2 upload failed:', uploadResult.error);
      return NextResponse.json(
        { error: `Failed to upload to R2: ${uploadResult.error}` },
        { status: 500 }
      );
    }

    console.log('[UPLOAD] R2 upload successful:', uploadResult.url);

    // Step 6: Insert into database (schema locked to lmsy_archive)
    console.log('[UPLOAD] Inserting into database...');
    const { data: insertedItem, error: insertError } = await supabaseAdmin
      .from('gallery')
      .insert({
        image_url: uploadResult.url, // Full CDN URL
        caption: caption || null,
        tag: tag || null,
        is_featured: isFeatured,
        catalog_id: catalogId,
        is_editorial: isEditorial,
        curator_note: curatorNote || null,
        blur_data: blurData,
        event_date: eventDate || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[UPLOAD] Database insert failed:', insertError);
      // Attempt to rollback R2 upload
      // Note: In production, you might want to implement proper transaction handling
      return NextResponse.json(
        { error: `Failed to insert into database: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log('[UPLOAD] Insert successful:', insertedItem.id);

    return NextResponse.json({
      success: true,
      data: {
        id: insertedItem.id,
        catalog_id: catalogId,
        image_url: uploadResult.url,
        r2_path: r2Path,
        event_year: eventYear,
        event_date: insertedItem.event_date,
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
  } catch (error: any) {
    console.error('[UPLOAD] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve upload statistics
 */
export async function GET(request: NextRequest) {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') || '';

    const supabaseAuth = createServerClient(
      rawUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (user.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get next catalog ID preview
    const supabaseAdmin = getSupabaseAdmin();
    const { data: lastItem } = await supabaseAdmin
      .from('gallery')
      .select('catalog_id')
      .like('catalog_id', 'LMSY-G-%')
      .order('catalog_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentYear = new Date().getFullYear();
    const nextId = lastItem?.catalog_id
      ? `LMSY-G-${currentYear}-${(parseInt(lastItem.catalog_id.split('-')[3]) + 1).toString().padStart(3, '0')}`
      : `LMSY-G-${currentYear}-001`;

    // Get total count
    const { count } = await supabaseAdmin
      .from('gallery')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      next_catalog_id: nextId,
      total_items: count || 0,
      current_year: currentYear,
    });
  } catch (error: any) {
    console.error('[UPLOAD_STATS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
}
