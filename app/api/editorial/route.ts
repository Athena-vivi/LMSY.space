import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Editorial Projects API
 *
 * GET /api/editorial - Fetch all editorial projects with cover selection logic
 *
 * Curator Rules:
 * 1. Images with catalog_id ending in -000 are automatically selected as project covers
 * 2. Fallback: If no -000 exists, use the image with the lowest sequence number
 * 3. Accurate artifact count based on gallery records with matching project_id
 */

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    console.log('[EDITORIAL_API] Fetching editorial projects with gallery join...');

    // Fetch projects with their gallery images using foreign key relationship
    const { data: projects, error: fetchError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select(`
        id,
        title,
        category,
        cover_url,
        release_date,
        description,
        catalog_id,
        blur_data,
        created_at,
        gallery (
          id,
          image_url,
          blur_data,
          caption,
          catalog_id,
          created_at
        )
      `)
      .eq('category', 'editorial')
      .order('release_date', { ascending: false });

    if (fetchError) {
      console.error('[EDITORIAL_API] ❌ Supabase query failed:', fetchError);
      return NextResponse.json(
        {
          error: 'Failed to fetch editorial projects',
          details: fetchError.message,
          code: fetchError.code,
        },
        { status: 500 }
      );
    }

    if (!projects || projects.length === 0) {
      console.log('[EDITORIAL_API] ℹ️ No editorial projects found');
      return NextResponse.json({
        success: true,
        projects: [],
        count: 0,
      });
    }

    // 🔒 CRITICAL: Process each project with cover selection rules
    const processedProjects = projects.map((project: any) => {
      const galleryImages = project.gallery || [];
      const artifactCount = galleryImages.length;

      // Default cover from project itself
      let finalCoverUrl = project.cover_url;
      let finalBlurData = project.blur_data;
      let coverSource = 'project';

      // 🔒 CURATOR RULE #1: Find image with catalog_id ending in -000
      if (!finalCoverUrl && galleryImages.length > 0) {
        const coverImage = galleryImages.find((img: any) => {
          const catalogId = img.catalog_id;
          if (!catalogId) return false;
          // Strict match: catalog_id must end with -000
          return /-000$/.test(catalogId);
        });

        if (coverImage) {
          finalCoverUrl = coverImage.image_url;
          finalBlurData = coverImage.blur_data;
          coverSource = `catalog-${coverImage.catalog_id}`;
          console.log(`[EDITORIAL_API] ✅ Found -000 cover for "${project.title}": ${coverImage.catalog_id}`);
        } else {
          // 🔒 CURATOR RULE #2: Fallback to lowest sequence number
          const sortedGallery = [...galleryImages].sort((a: any, b: any) => {
            const aCatalog = a.catalog_id || '';
            const bCatalog = b.catalog_id || '';

            // Extract sequence number (last 3 digits after last hyphen)
            const aMatch = aCatalog.match(/-(\d{3})$/);
            const bMatch = bCatalog.match(/-(\d{3})$/);

            const aSeq = aMatch ? parseInt(aMatch[1], 10) : 999;
            const bSeq = bMatch ? parseInt(bMatch[1], 10) : 999;

            return aSeq - bSeq;
          });

          finalCoverUrl = sortedGallery[0].image_url;
          finalBlurData = sortedGallery[0].blur_data;
          coverSource = `fallback-${sortedGallery[0].catalog_id}`;
          console.log(`[EDITORIAL_API] ⚠️ Fallback cover for "${project.title}": ${sortedGallery[0].catalog_id}`);
        }
      }

      return {
        id: project.id,
        title: project.title,
        category: project.category,
        cover_url: finalCoverUrl,
        blur_data: finalBlurData,
        release_date: project.release_date,
        description: project.description,
        catalog_id: project.catalog_id,
        created_at: project.created_at,
        artifact_count: artifactCount,
        cover_source: coverSource,
        gallery_images: galleryImages,
      };
    });

    console.log(`[EDITORIAL_API] ✅ Successfully processed ${processedProjects.length} editorial projects`);

    return NextResponse.json({
      success: true,
      projects: processedProjects,
      count: processedProjects.length,
    });
  } catch (error) {
    console.error('[EDITORIAL_API] ❌ Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
