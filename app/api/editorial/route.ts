import { NextResponse } from 'next/server';
import { getSupabasePublic } from '@/lib/data/client';
import { listEditorialIssuesForApi } from '@/lib/data/projects';
import { countIssueArtifacts } from '@/lib/editorial-meta';

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
    // Public route: reads with the anon client so the visitor privilege is the
    // one being exercised. Visibility is still enforced app-side by the shared
    // rule in lib/project-visibility.ts, with RLS as the second line.
    const supabasePublic = getSupabasePublic();

    // Strict editorial-only filter; public visibility comes from the shared
    // rule in lib/project-visibility.ts.
    // The repository returns null on a read failure - the route keeps that
    // distinguishable from an empty rack with its own 500.
    const data = await listEditorialIssuesForApi(supabasePublic);

    if (!data) {
      console.error('[EDITORIAL_API] query failed');
      return NextResponse.json(
        { error: 'EDITORIAL_QUERY_FAILED' },
        { status: 500 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json({ success: true, projects: [], count: 0 });
    }

    const processedProjects = data
      .filter((project) => project.category === 'editorial')
      .map((project) => {
        const galleryImages = project.gallery_assets || [];
        // Same definition as the detail page: the cover counts once whether it
        // is stored as a relative path or as the CDN URL of the same file.
        const artifactCount = countIssueArtifacts(galleryImages, project.cover_url);

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
          slug: project.slug,
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
