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

    console.log('[DATA_STITCH] 🔍 Fetching editorial projects with explicit schema...');

    // 🔒 EXPLICIT SCHEMA + FK JOIN
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
      .eq('category', 'editorial')
      .order('release_date', { ascending: false });

    if (fetchError) {
      console.error('[DATA_STITCH] ❌ Query failed:', fetchError);
      return NextResponse.json(
        { error: 'Query failed', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!projects || projects.length === 0) {
      console.log('[DATA_STITCH] ℹ️ No editorial projects found');
      return NextResponse.json({ success: true, projects: [], count: 0 });
    }

    console.log(`[DATA_STITCH] ✅ Found ${projects.length} projects`);

    // 🔒 DATA STITCHING: Process each project
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

  } catch (error) {
    console.error('[DATA_STITCH] ❌ Error:', error);
    return NextResponse.json(
      {
        error: 'API failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
