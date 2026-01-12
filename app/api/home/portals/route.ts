import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/home/portals
 *
 * Fetches the latest featured image for each portal category.
 * Used by the homepage PortalsSection to display real archival images.
 *
 * Returns:
 * - series: Latest featured drama/series image
 * - appearance: Latest featured stage/live event image
 * - journal-travel: Latest featured travel/journal image
 * - journal-daily: Latest featured daily/journal image
 * - commercial: Latest featured commercial/endorsement image
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Fetch latest featured image for each category
    const [
      seriesResult,
      appearanceResult,
      travelResult,
      dailyResult,
      commercialResult,
    ] = await Promise.all([
      // Series/Drama
      supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .select('image_url, blur_data, catalog_id')
        .eq('is_featured', true)
        .eq('category_tag', 'official_stills')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Appearance/Stage
      supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .select('image_url, blur_data, catalog_id')
        .eq('is_featured', true)
        .eq('category_tag', 'press_events')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Journal/Travel
      supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .select('image_url, blur_data, catalog_id')
        .eq('is_featured', true)
        .eq('category_tag', 'bts')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Journal/Daily
      supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .select('image_url, blur_data, catalog_id')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Commercial
      supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .select('image_url, blur_data, catalog_id')
        .eq('is_featured', true)
        .eq('project_id', '(select id from projects where category = \'commercial\' limit 1)')
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    // Format response
    const portals = {
      series: seriesResult.data ? {
        imageUrl: seriesResult.data.image_url,
        blurData: seriesResult.data.blur_data,
        catalogId: seriesResult.data.catalog_id,
      } : null,
      appearance: appearanceResult.data ? {
        imageUrl: appearanceResult.data.image_url,
        blurData: appearanceResult.data.blur_data,
        catalogId: appearanceResult.data.catalog_id,
      } : null,
      travel: travelResult.data ? {
        imageUrl: travelResult.data.image_url,
        blurData: travelResult.data.blur_data,
        catalogId: travelResult.data.catalog_id,
      } : null,
      daily: dailyResult.data ? {
        imageUrl: dailyResult.data.image_url,
        blurData: dailyResult.data.blur_data,
        catalogId: dailyResult.data.catalog_id,
      } : null,
      commercial: commercialResult.data ? {
        imageUrl: commercialResult.data.image_url,
        blurData: commercialResult.data.blur_data,
        catalogId: commercialResult.data.catalog_id,
      } : null,
    };

    return NextResponse.json(portals);
  } catch (error) {
    console.error('[API_PORTALS] Error fetching portal images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portal images' },
      { status: 500 }
    );
  }
}
