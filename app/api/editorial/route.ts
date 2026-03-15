import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Editorial Projects API - SOVEREIGN BOUNDARY ENFORCEMENT
 *
 * 🚨 CRITICAL: EDITORIAL展厅严控边界
 * ❌ SERIES/STILL DATA ABSOLUTELY FORBIDDEN
 * ✅ STRICT .eq('category', 'editorial') ONLY
 * 🔥 MANDATORY EXPLICIT .schema('lmsy_archive') ON EVERY QUERY
 */

export const revalidate = 0;

function getCdnUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `https://cdn.lmsy.space/${imagePath.startsWith('/') ? imagePath.slice(1) : imagePath}`;
}

function discoverCoverFromGallery(galleryImages: any[]): string | null {
  if (!galleryImages || galleryImages.length === 0) {
    return null;
  }

  const coverImage = galleryImages.find((img: any) =>
    img.catalog_id && img.catalog_id.endsWith('-000')
  );

  if (coverImage && coverImage.image_url) {
    console.log(`[COVER_DISCOVERY] ✅ Found -000 cover: ${coverImage.catalog_id}`);
    return getCdnUrl(coverImage.image_url);
  }

  const sorted = [...galleryImages]
    .filter((img: any) => img.catalog_id)
    .sort((a: any, b: any) => (a.catalog_id || '').localeCompare(b.catalog_id || ''));

  if (sorted.length > 0 && sorted[0].image_url) {
    console.log(`[COVER_DISCOVERY] ✅ Found first image: ${sorted[0].catalog_id}`);
    return getCdnUrl(sorted[0].image_url);
  }

  console.log(`[COVER_DISCOVERY] ⚠️ Gallery has ${galleryImages.length} items but no valid image_url`);
  return null;
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    console.log('[SOVEREIGN_BOUNDARY] ========== EDITORIAL EXCLUSIVE ==========');
    console.log('[SOVEREIGN_BOUNDARY] 🎯 Target: lmsy_archive.projects ONLY');
    console.log('[SOVEREIGN_BOUNDARY] 🚨 FILTER: .eq("category", "editorial")');
    console.log('[SOVEREIGN_BOUNDARY] ❌ FORBIDDEN: series, still, appearance, journal, commercial');

    // 🔥 SOVEREIGN: Strict editorial-only filter, NO .or() ALLOWED
    const { data, error, status, statusText } = await supabaseAdmin
      .schema('lmsy_archive')  // 🚨 MANDATORY EXPLICIT SCHEMA
      .from('projects')
      .select(`
        id,
        title,
        description,
        category,
        cover_url,
        homepage_featured,
        homepage_excerpt,
        homepage_cover_url,
        blur_data,
        release_date,
        catalog_id,
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
      .eq('category', 'editorial')  // 🚨 STRICT EQUALITY ONLY - NO SERIES DATA
      .order('release_date', { ascending: false });

    console.log('[SOVEREIGN_BOUNDARY] ========== QUERY RESULT ==========');
    console.log('[SOVEREIGN_BOUNDARY] 📊 HTTP Status:', status, statusText);
    console.log('[SOVEREIGN_BOUNDARY] 📊 Data Length:', data?.length || 0);
    console.log('[SOVEREIGN_BOUNDARY] 📊 Error:', error ? JSON.stringify(error, null, 2) : 'NO_ERROR');

    if (data && data.length > 0) {
      // 🔴 VERIFY: Ensure no series data leaked through
      const hasSeries = data.some(p => p.category === 'series');
      if (hasSeries) {
        console.error('[SOVEREIGN_BOUNDARY] ❌🔥🔥 CRITICAL BREACH: SERIES DATA DETECTED IN EDITORIAL');
      }
      console.log('[SOVEREIGN_BOUNDARY] ✅ SUCCESS - Found projects:', data.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        gallery_count: p.gallery?.length || 0
      })));
    }

    if (error) {
      console.error('[SOVEREIGN_BOUNDARY] ❌ CRITICAL ERROR:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        {
          error: 'FORCED_ALIGNMENT_FAILED',
          details: error.message,
          code: error.code,
          hint: error.hint,
          fullError: JSON.stringify(error, null, 2)
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.log('[SOVEREIGN_BOUNDARY] ⚠️ ZERO RESULTS - No editorial projects found');
      return NextResponse.json({
        success: true,
        projects: [],
        count: 0,
        debug: {
          message: 'SOVEREIGN_BOUNDARY_ZERO_RESULTS',
          filter: 'category=editorial ONLY',
          httpStatus: status,
          httpStatusText: statusText
        }
      });
    }

    console.log(`[SOVEREIGN_BOUNDARY] ✅ Processing ${data.length} editorial projects...`);

    // 🔒 SOVEREIGN GUARD: Final verification - filter out any non-editorial data
    const editorialOnly = data.filter(p => p.category === 'editorial');
    if (editorialOnly.length !== data.length) {
      console.error('[SOVEREIGN_BOUNDARY] ❌ FILTERED OUT NON-EDITORIAL DATA:', {
        original: data.length,
        filtered: editorialOnly.length,
        removed: data.length - editorialOnly.length
      });
    }

    // Process projects with self-healing cover logic
    const processedProjects = editorialOnly.map((project: any) => {
      const galleryImages = project.gallery || [];
      const artifactCount = galleryImages.length;

      let finalCoverUrl: string | null = null;
      let coverSource: string = 'none';

      if (project.cover_url) {
        finalCoverUrl = getCdnUrl(project.cover_url);
        coverSource = 'database';
        console.log(`[COVER_STITCH] 📊 "${project.title}": Using database cover`);
      } else {
        finalCoverUrl = discoverCoverFromGallery(galleryImages);
        coverSource = finalCoverUrl ? 'gallery_discovery' : 'empty_vault';

        if (finalCoverUrl) {
          console.log(`[COVER_STITCH] 🔄 "${project.title}": Self-healed from gallery (${coverSource})`);
        } else {
          console.log(`[COVER_STITCH] ⚠️ "${project.title}": No cover found (has ${artifactCount} gallery items)`);
        }
      }

      return {
        id: project.id,
        title: project.title,
        category: project.category,
        cover_url: finalCoverUrl,
        homepage_featured: project.homepage_featured || false,
        homepage_excerpt: project.homepage_excerpt || null,
        homepage_cover_url: project.homepage_cover_url || null,
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

    console.log(`[FORCED_ALIGNMENT] ✅ Returning ${processedProjects.length} projects to frontend`);

    return NextResponse.json({
      success: true,
      projects: processedProjects,
      count: processedProjects.length,
    });

  } catch (error) {
    console.error('[FORCED_ALIGNMENT] ❌ EXCEPTION:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      {
        error: 'FORCED_ALIGNMENT_EXCEPTION',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
