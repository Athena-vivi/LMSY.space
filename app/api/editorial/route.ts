import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Editorial Projects API - FORCED ALIGNMENT
 *
 * 🔥 MANDATORY EXPLICIT .schema('lmsy_archive') ON EVERY QUERY
 * ✅ TARGET: 7 editorial + 2 series projects confirmed in database
 * ❌ NO RELIANCE ON "PRE-CONFIGURED" DEFAULTS
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

    console.log('[FORCED_ALIGNMENT] ========== FORCED SCHEMA ALIGNMENT ==========');
    console.log('[FORCED_ALIGNMENT] 🎯 Target: lmsy_archive.projects');
    console.log('[FORCED_ALIGNMENT] 🎯 Expected: 7 editorial + 2 series projects');
    console.log('[FORCED_ALIGNMENT] 📡 Query: .or("category.eq.editorial,category.eq.series")');

    // 🔥 FORCED: Explicit schema + category filter matching database
    const { data, error, status, statusText } = await supabaseAdmin
      .schema('lmsy_archive')  // 🚨 MANDATORY EXPLICIT SCHEMA
      .from('projects')
      .select(`
        id,
        title,
        description,
        category,
        cover_url,
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
      .or('category.eq.editorial,category.eq.series')  // Match confirmed 7+2 projects
      .order('release_date', { ascending: false });

    console.log('[FORCED_ALIGNMENT] ========== QUERY RESULT ==========');
    console.log('[FORCED_ALIGNMENT] 📊 HTTP Status:', status, statusText);
    console.log('[FORCED_ALIGNMENT] 📊 Data Length:', data?.length || 0);
    console.log('[FORCED_ALIGNMENT] 📊 Error:', error ? JSON.stringify(error, null, 2) : 'NO_ERROR');

    if (data && data.length > 0) {
      console.log('[FORCED_ALIGNMENT] ✅ SUCCESS - Found projects:', data.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        gallery_count: p.gallery?.length || 0
      })));
    }

    if (error) {
      console.error('[FORCED_ALIGNMENT] ❌ CRITICAL ERROR:', JSON.stringify(error, null, 2));
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
      console.log('[FORCED_ALIGNMENT] ⚠️ ZERO RESULTS - Schema not being applied');
      return NextResponse.json({
        success: true,
        projects: [],
        count: 0,
        debug: {
          message: 'FORCED_ALIGNMENT_ZERO_RESULTS',
          httpStatus: status,
          httpStatusText: statusText
        }
      });
    }

    console.log(`[FORCED_ALIGNMENT] ✅ Processing ${data.length} projects...`);

    // Process projects with self-healing cover logic
    const processedProjects = data.map((project: any) => {
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
