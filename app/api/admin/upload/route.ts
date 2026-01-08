import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { uploadToR2 } from '@/lib/r2-client';
import { convertToWebP, generateBlurData } from '@/lib/image-processing';
import { generateNextGalleryCatalogId, getR2PathForCatalogId } from '@/lib/catalog-id';

/**
 * Gallery Upload API - Astra 馆长档案标准
 *
 * Features:
 * - Schema locked to lmsy_archive
 * - Auto-numbering with catalog_id (LMSY-G-YYYYMMDD-XXX)
 * - Automatic WebP conversion
 * - Optimized R2 paths using catalog_id as filename
 * - Blur data generation
 * - Date-based sequence numbering
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
    const manualCatalogId = formData.get('catalog_id') as string | null; // Manual catalog ID override

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

    // Step 1: Determine the catalog ID to use
    let catalogId: string;
    let uploadDate: string;

    if (manualCatalogId && manualCatalogId.trim()) {
      // Use manually provided catalog ID (Astra 馆长的最终解释权)
      catalogId = manualCatalogId.trim();
      console.log('[UPLOAD] Using manual catalog_id:', catalogId);

      // Extract date from manual catalog ID for event_date
      const match = catalogId.match(/^LMSY-[A-Z]+-(\d{8})-\d{3}$/);
      if (match) {
        const compactDate = match[1];
        uploadDate = `${compactDate.substring(0, 4)}-${compactDate.substring(4, 6)}-${compactDate.substring(6, 8)}`;
        console.log('[UPLOAD] Extracted event_date from manual catalog_id:', uploadDate);
      } else {
        // Fallback to provided event_date or current date
        uploadDate = eventDate || new Date().toISOString().split('T')[0];
        console.warn('[UPLOAD] Could not extract date from manual catalog_id, using:', uploadDate);
      }
    } else {
      // Auto-generate catalog ID based on event_date
      if (eventDate) {
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(eventDate)) {
          return NextResponse.json(
            { error: 'Invalid date format. Expected YYYY-MM-DD' },
            { status: 400 }
          );
        }
        uploadDate = eventDate;
        console.log('[UPLOAD] Using provided event_date:', uploadDate);
      } else {
        // Fallback to current date (UTC) if no event_date provided
        uploadDate = new Date().toISOString().split('T')[0];
        console.warn('[UPLOAD] No event_date provided, using current UTC date:', uploadDate);
      }

      // Generate catalog_id with full date (LMSY-G-YYYYMMDD-XXX)
      catalogId = await generateNextGalleryCatalogId(supabaseAdmin, uploadDate);
      console.log('[UPLOAD] Generated catalog_id:', catalogId);
    }

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

    // Step 5: Upload to R2 with catalog_id as filename
    const r2Path = getR2PathForCatalogId(catalogId);
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
        event_date: uploadDate,
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

    // Get next catalog ID preview for today
    const supabaseAdmin = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if there are any gallery items for today
    const { data: lastItem } = await supabaseAdmin
      .from('gallery')
      .select('catalog_id')
      .like('catalog_id', `LMSY-G-${today.replace(/-/g, '')}-%`)
      .order('catalog_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextSequence = 1;

    if (lastItem?.catalog_id) {
      // Parse the sequence from the last item
      const match = lastItem.catalog_id.match(/-(\d{3})$/);
      if (match) {
        const lastSequence = parseInt(match[1], 10);
        nextSequence = lastSequence + 1;
      }
    }

    // Get total count
    const { count } = await supabaseAdmin
      .from('gallery')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      next_catalog_id: `LMSY-G-${today.replace(/-/g, '')}-${String(nextSequence).padStart(3, '0')}`,
      total_items: count || 0,
      today: today,
    });
  } catch (error: any) {
    console.error('[UPLOAD_STATS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve statistics' },
      { status: 500 }
    );
  }
}
