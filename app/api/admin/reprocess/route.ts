import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { convertToWebP } from '@/lib/image-processing';
import { uploadToR2 } from '@/lib/r2-client';
import { getR2PathForCatalogId } from '@/lib/catalog-id';

/**
 * POST /api/admin/reprocess
 *
 * 🔒 EXIF FIX: Reprocess images with correct auto-rotation
 *
 * Reprocesses existing images in R2 to fix EXIF orientation issues.
 * Use this for images uploaded before EXIF auto-rotation was implemented.
 *
 * Query params:
 * - startDate: Start date (YYYY-MM-DD) - default: "2025-01-10"
 * - endDate: End date (YYYY-MM-DD) - default: today
 * - limit: Max images to process - default: 50
 * - dryRun: Test run without actual updates - default: false
 *
 * Example: /api/admin/reprocess?startDate=2025-01-10&endDate=2025-01-23&limit=10&dryRun=false
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2025-01-10';
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const limit = parseInt(searchParams.get('limit') || '50');
    const dryRun = searchParams.get('dryRun') === 'true';

    console.log(`[REPROCESS] Starting reprocess: ${startDate} to ${endDate}, limit: ${limit}, dryRun: ${dryRun}`);

    // Fetch images in the date range
    const { data: images, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .select('*')
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[REPROCESS] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch images', details: error.message },
        { status: 500 }
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No images found in the specified date range',
        reprocessed: 0,
        results: []
      });
    }

    console.log(`[REPROCESS] Found ${images.length} images to reprocess`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each image
    for (const image of images) {
      const startTime = Date.now();

      try {
        console.log(`[REPROCESS] Processing: ${image.catalog_id} (${image.id})`);

        // Fetch the original uploaded file from image_url (if different from current)
        // For simplicity, we'll download from the CDN and reprocess
        const imageUrl = image.image_url;
        if (!imageUrl) {
          throw new Error('No image_url found');
        }

        // Download image from CDN
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        console.log(`[REPROCESS] Downloaded ${buffer.length} bytes from CDN`);

        // Reprocess with EXIF auto-rotation
        const result = await convertToWebP(buffer, 95, false);

        console.log(`[REPROCESS] Converted to WebP: ${result.width}x${result.height}, ${(result.sizeBytes / 1024).toFixed(2)} KB`);

        // Upload back to R2
        if (!dryRun) {
          const r2Path = getR2PathForCatalogId(image.catalog_id || '');
          const uploadResult = await uploadToR2(result.buffer, r2Path, 'image/webp');

          if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'Failed to upload to R2');
          }

          console.log(`[REPROCESS] Uploaded back to R2: ${r2Path}`);
        }

        const processingTime = Date.now() - startTime;
        console.log(`[REPROCESS] ✅ ${image.catalog_id}: ${result.width}x${result.height}, ${(result.sizeBytes / 1024).toFixed(2)} KB (${processingTime}ms)`);

        results.push({
          id: image.id,
          catalog_id: image.catalog_id,
          success: true,
          originalSize: buffer.length,
          newSize: result.sizeBytes,
          dimensions: `${result.width}x${result.height}`,
          processingTime,
        });

        successCount++;

        // Small delay to avoid overwhelming the CDN/R2
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        const processingTime = Date.now() - startTime;
        console.error(`[REPROCESS] ❌ ${image.catalog_id}:`, err);

        results.push({
          id: image.id,
          catalog_id: image.catalog_id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          processingTime,
        });

        errorCount++;
      }
    }

    const summary = {
      success: true,
      dryRun,
      dateRange: { startDate, endDate },
      total: images.length,
      reprocessed: successCount,
      errors: errorCount,
      results,
    };

    console.log(`[REPROCESS] Complete: ${successCount}/${images.length} successful`);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('[REPROCESS] Critical error:', error);
    return NextResponse.json(
      {
        error: 'Reprocessing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
