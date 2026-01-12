import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/home/portals
 *
 * 🔒 STRICT CATEGORY ISOLATION
 * Fetches the latest cover image (-000) for each portal category based on project.category.
 *
 * Logic:
 * 1. Query gallery images JOINED with projects to ensure strict category separation
 * 2. Priority: catalog_id ending with '-000' (cover images) first
 * 3. Fallback to any featured image if no cover exists
 * 4. Debug logging for troubleshooting
 *
 * Category Mapping:
 * - drama (series)      → project.category = 'series'
 * - stage (appearance)  → project.category = 'appearance'
 * - travel (journal)    → project.category = 'travel'
 * - daily (journal)     → project.category = 'daily'
 * - commercial          → project.category = 'commercial'
 *
 * 🔥 INSTANT CACHE REFRESH: revalidate = 0 ensures portal images update immediately
 */
export const revalidate = 0;

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    /**
     * 🔍 HELPER: Fetch cover image for a specific project category
     * Priority 1: catalog_id LIKE '%-000' (cover image)
     * Priority 2: is_featured = true (fallback)
     */
    async function fetchPortalImage(category: string, portalName: string) {
      // Step 1: Try to get latest project in this category
      const { data: latestProject, error: projectError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select('id')
        .eq('category', category)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (projectError || !latestProject) {
        console.log(`[PORTAL_SYNC] ${portalName} | No project found | Category: ${category}`);
        return null;
      }

      // Step 2: Try to get cover image (-000) for this project
      const { data: coverImage } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .select('id, image_url, blur_data, catalog_id, project_id')
        .eq('project_id', latestProject.id)
        .like('catalog_id', '%-000')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (coverImage) {
        console.log(`[PORTAL_SYNC] ${portalName} | Cover found | ID: ${coverImage.id} | Catalog: ${coverImage.catalog_id} | Project_Category: ${category}`);
        return {
          imageUrl: coverImage.image_url,
          blurData: coverImage.blur_data,
          catalogId: coverImage.catalog_id,
        };
      }

      // Step 3: Fallback to any featured image in this project
      const { data: featuredImage } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .select('id, image_url, blur_data, catalog_id, project_id')
        .eq('project_id', latestProject.id)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (featuredImage) {
        console.log(`[PORTAL_SYNC] ${portalName} | Featured fallback | ID: ${featuredImage.id} | Catalog: ${featuredImage.catalog_id} | Project_Category: ${category}`);
        return {
          imageUrl: featuredImage.image_url,
          blurData: featuredImage.blur_data,
          catalogId: featuredImage.catalog_id,
        };
      }

      // Step 4: Last resort - any image in this project
      const { data: anyImage } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .select('id, image_url, blur_data, catalog_id, project_id')
        .eq('project_id', latestProject.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anyImage) {
        console.log(`[PORTAL_SYNC] ${portalName} | Any image fallback | ID: ${anyImage.id} | Catalog: ${anyImage.catalog_id} | Project_Category: ${category}`);
        return {
          imageUrl: anyImage.image_url,
          blurData: anyImage.blur_data,
          catalogId: anyImage.catalog_id,
        };
      }

      console.log(`[PORTAL_SYNC] ${portalName} | No images found | Project_ID: ${latestProject.id} | Category: ${category}`);
      return null;
    }

    // 🚀 PARALLEL FETCH: Execute all 5 category queries simultaneously
    const [series, appearance, travel, daily, commercial] = await Promise.all([
      fetchPortalImage('series', 'Drama'),
      fetchPortalImage('appearance', 'Stage'),
      fetchPortalImage('travel', 'Journey'),
      fetchPortalImage('daily', 'Daily'),
      fetchPortalImage('commercial', 'Commercial'),
    ]);

    // Format response
    const portals = {
      series,
      appearance,
      travel,
      daily,
      commercial,
    };

    return NextResponse.json(portals);
  } catch (error) {
    console.error('[API_PORTALS] Critical error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portal images' },
      { status: 500 }
    );
  }
}
