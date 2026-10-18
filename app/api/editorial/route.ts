import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';

/**
 * Editorial issues (projects with category='editorial'), plus their gallery
 * pages and the cover actually used by the list/detail surfaces.
 *
 * Response contract (consumed by /editorial, /editorial/[id] and the homepage
 * longform block): { success, projects[], count }.
 *
 * Phase-6 batch 1 removed the debug logging, the "boundary" console theatre and
 * the internal error details (message details, code, hint and stack) that used
 * to be returned to the client on error: every request wrote ~10 lines to the
 * server log and an error response leaked internals. Functional behaviour
 * (strict editorial filter + shared public visibility rule) is unchanged.
 */

export const revalidate = 0;

function getCdnUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `https://cdn.lmsy.space/${imagePath.startsWith('/') ? imagePath.slice(1) : imagePath}`;
}

/**
 * Cover fallback for issues without a database cover: the -000 catalog plate,
 * else the lowest catalog number. Returns null when the issue has no usable
 * page - never a fabricated URL.
 */
function discoverCoverFromGallery(galleryImages: Array<{ image_url?: string | null; catalog_id?: string | null }>): string | null {
  if (!galleryImages || galleryImages.length === 0) return null;

  const coverImage = galleryImages.find(
    (img) => img.catalog_id && img.catalog_id.endsWith('-000')
  );
  if (coverImage && coverImage.image_url) {
    return getCdnUrl(coverImage.image_url);
  }

  const sorted = [...galleryImages]
    .filter((img) => img.catalog_id)
    .sort((a, b) => (a.catalog_id || '').localeCompare(b.catalog_id || ''));

  return sorted.length > 0 ? getCdnUrl(sorted[0].image_url ?? null) : null;
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Strict editorial-only filter; public visibility comes from the shared
    // rule in lib/project-visibility.ts.
    const { data, error } = await applyPublicProjectFilter(
      supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select(`
        id,
        title,
        title_i18n,
        description,
        description_i18n,
        category,
        cover_url,
        homepage_featured,
        homepage_excerpt,
        homepage_excerpt_i18n,
        homepage_cover_url,
        blur_data,
        release_date,
        catalog_id,
        created_at,
        gallery_assets (
          id,
          image_url,
          blur_data,
          caption,
          catalog_id,
          created_at
        )
      `)
        .eq('category', 'editorial')
    ).order('release_date', { ascending: false });

    if (error) {
      console.error('[EDITORIAL_API] query failed:', error.message);
      return NextResponse.json(
        { error: 'EDITORIAL_QUERY_FAILED' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: true, projects: [], count: 0 });
    }

    const processedProjects = data
      .filter((project) => project.category === 'editorial')
      .map((project) => {
        const galleryImages = project.gallery_assets || [];
        const artifactCount = galleryImages.length;

        let finalCoverUrl: string | null = null;
        let coverSource: 'database' | 'gallery_discovery' | 'empty_vault' = 'empty_vault';

        if (project.cover_url) {
          finalCoverUrl = getCdnUrl(project.cover_url);
          coverSource = 'database';
        } else {
          finalCoverUrl = discoverCoverFromGallery(galleryImages);
          coverSource = finalCoverUrl ? 'gallery_discovery' : 'empty_vault';
        }

        return {
          id: project.id,
          title: project.title,
          title_i18n: project.title_i18n || null,
          category: project.category,
          cover_url: finalCoverUrl,
          homepage_featured: project.homepage_featured || false,
          homepage_excerpt: project.homepage_excerpt || null,
          homepage_excerpt_i18n: project.homepage_excerpt_i18n || null,
          homepage_cover_url: project.homepage_cover_url || null,
          blur_data: project.blur_data,
          release_date: project.release_date,
          description: project.description,
          description_i18n: project.description_i18n || null,
          catalog_id: project.catalog_id,
          created_at: project.created_at,
          artifact_count: artifactCount,
          cover_source: coverSource,
          gallery_images: galleryImages,
        };
      });

    return NextResponse.json({
      success: true,
      projects: processedProjects,
      count: processedProjects.length,
    });
  } catch (error) {
    console.error(
      '[EDITORIAL_API] unexpected error:',
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { error: 'EDITORIAL_API_ERROR' },
      { status: 500 }
    );
  }
}
