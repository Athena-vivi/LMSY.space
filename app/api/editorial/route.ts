import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Editorial Projects API - DATA STITCHING
 *
 * 🔒 EXPLICIT SCHEMA + FK JOIN + SELF-HEALING:
 * 1. Explicit .schema('lmsy_archive')
 * 2. FK join: .select('*, gallery(*)')
 * 3. Self-healing: Discover cover from gallery if missing
 * 4. Clear status codes: 'gallery_fallback' | 'database' | 'empty_vault'
 *
 * ❌ NO undefined
 * ❌ NO placeholder
 * ✅ REAL DATA with clear status
 */

export const revalidate = 0;

/**
 * Get CDN URL from relative path
 */
function getCdnUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `https://cdn.lmsy.space/${imagePath.startsWith('/') ? imagePath.slice(1) : imagePath}`;
}

/**
 * Discover cover from gallery array
 * Priority: -000 → smallest catalog_id
 */
function discoverCoverFromGallery(galleryImages: any[]): { imageUrl: string | null; source: string } {
  if (!galleryImages || galleryImages.length === 0) {
    return { imageUrl: null, source: 'empty_vault' };
  }

  // Priority 1: -000 cover designation
  const coverImage = galleryImages.find((img: any) =>
    img.catalog_id && img.catalog_id.endsWith('-000')
  );

  if (coverImage && coverImage.image_url) {
    console.log(`[DATA_STITCH] ✅ Found -000 cover: ${coverImage.catalog_id}`);
    return { imageUrl: getCdnUrl(coverImage.image_url), source: 'gallery_fallback' };
  }

  // Priority 2: Smallest catalog_id (first image)
  const sorted = [...galleryImages]
    .filter((img: any) => img.catalog_id)
    .sort((a: any, b: any) => (a.catalog_id || '').localeCompare(b.catalog_id || ''));

  if (sorted.length > 0 && sorted[0].image_url) {
    console.log(`[DATA_STITCH] ✅ Found first image: ${sorted[0].catalog_id}`);
    return { imageUrl: getCdnUrl(sorted[0].image_url), source: 'gallery_fallback' };
  }

  console.log(`[DATA_STITCH] ⚠️ Gallery has items but no valid image_url`);
  return { imageUrl: null, source: 'gallery_fallback' };
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    console.log('[API_DEBUG] 🔍 Fetching ALL projects from lmsy_archive for audit...');

    // 🔍 DEBUG: First, fetch ALL projects to see what's in the database
    const { data: allProjects, error: allProjectsError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('id, title, category, release_date')
      .order('release_date', { ascending: false });

    if (allProjectsError) {
      console.error('[API_DEBUG] ❌ Query failed:', allProjectsError);
      return NextResponse.json(
        { error: 'Query failed', details: allProjectsError.message },
        { status: 500 }
      );
    }

    console.log('[API_DEBUG] 📊 ALL PROJECTS IN DATABASE:', {
      total: allProjects?.length || 0,
      categories: allProjects?.map(p => p.category),
      sample: allProjects?.slice(0, 5)
    });

    // 🔒 EXPLICIT SCHEMA + FK JOIN with INCLUSIVE category filter
    // Match both 'editorial', 'magazine', and any case variations
    const { data: projects, error: fetchError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select(`
        *,
        gallery (
          id,
          image_url,
          blur_data,
          caption,
          catalog_id,
          created_at
        )
      `)
      .in('category', ['editorial', 'magazine', 'Editorial', 'Magazine', 'EDITORIAL', 'MAGAZINE'])
      .order('release_date', { ascending: false });

    if (fetchError) {
      console.error('[API_DEBUG] ❌ Category-filtered query failed:', fetchError);
      return NextResponse.json(
        { error: 'Query failed', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!projects || projects.length === 0) {
      console.log('[API_DEBUG] ⚠️ NO MATCHING PROJECTS - Trying WITHOUT category filter...');

      // Fallback: Try fetching ALL projects without category filter
      const { data: allProjectsWithGallery, error: fallbackError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select(`
          *,
          gallery (
            id,
            image_url,
            blur_data,
            caption,
            catalog_id,
            created_at
          )
        `)
        .order('release_date', { ascending: false });

      if (fallbackError) {
        console.error('[API_DEBUG] ❌ Fallback query failed:', fallbackError);
        return NextResponse.json(
          { error: 'Fallback query failed', details: fallbackError.message },
          { status: 500 }
        );
      }

      console.log('[API_DEBUG] 📊 FALLBACK - All projects with gallery:', {
        total: allProjectsWithGallery?.length || 0,
        sample: allProjectsWithGallery?.map(p => ({ id: p.id, title: p.title, category: p.category }))
      });

      // If still no projects, return the database mismatch error
      if (!allProjectsWithGallery || allProjectsWithGallery.length === 0) {
        console.log('[API_DEBUG] ❌ DATABASE_MISMATCH: FOUND 0 PROJECTS IN lmsy_archive.projects');
        return NextResponse.json({
          success: true,
          projects: [],
          count: 0,
          debug: {
            message: 'DATABASE_MISMATCH: FOUND 0 PROJECTS IN lmsy_archive.projects',
            allProjectsCount: allProjects?.length || 0
          }
        });
      }

      // Use the fallback data
      return processProjects(allProjectsWithGallery);
    }

    console.log(`[API_DEBUG] ✅ Found ${projects.length} projects with category filter`);

    return processProjects(projects);

  } catch (error) {
    console.error('[API_DEBUG] ❌ Error:', error);
    return NextResponse.json(
      {
        error: 'API failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Process projects and stitch with gallery data
 */
function processProjects(projects: any[]) {
  const processedProjects = projects.map((project: any) => {
    const galleryImages = project.gallery || [];
    const artifactCount = galleryImages.length;

    console.log(`[DATA_STITCH] 📊 "${project.title}":`, {
      cover_url: project.cover_url,
      artifact_count: artifactCount,
    });

    // Determine final cover URL and source
    let finalCoverUrl: string | null = null;
    let coverSource: string = 'empty_vault';

    if (project.cover_url) {
      // Use database cover if exists
      finalCoverUrl = getCdnUrl(project.cover_url);
      coverSource = 'database';
      console.log(`[DATA_STITCH] ✅ Using database cover for "${project.title}"`);
    } else {
      // Self-heal: discover from gallery
      const discovered = discoverCoverFromGallery(galleryImages);
      finalCoverUrl = discovered.imageUrl;
      coverSource = discovered.source;

      if (finalCoverUrl) {
        console.log(`[DATA_STITCH] 🔄 Self-healed cover for "${project.title}" (source: ${coverSource})`);
      } else {
        console.log(`[DATA_STITCH] ⚠️ No cover found for "${project.title}" (source: ${coverSource})`);
      }
    }

    return {
      id: project.id,
      title: project.title,
      category: project.category,
      cover_url: finalCoverUrl,
      blur_data: project.blur_data,
      release_date: project.release_date,
      description: project.description,
      catalog_id: project.catalog_id,
      created_at: project.created_at,
      artifact_count: artifactCount,
      cover_source: coverSource,
      gallery_images: galleryImages,
    };
  });

  console.log(`[DATA_STITCH] ✅ Returning ${processedProjects.length} projects`);

  return NextResponse.json({
    success: true,
    projects: processedProjects,
    count: processedProjects.length,
  });
}
