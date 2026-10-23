import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isPublicProject } from '@/lib/project-visibility';
import { getProjectVisibility } from '@/lib/data/projects';
import { listProjectGalleryAssets, type ProjectGalleryAssetRow } from '@/lib/data/gallery-assets';

/**
 * GET - Retrieve gallery images for a project (public endpoint)
 * Query params:
 *   - project_id: filter by project
 *   - category: filter by category_tag (all, official_stills, bts, press_events)
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const category = searchParams.get('category') || 'all';

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // ADR-001 D4: project-type entries share one visibility rule. This
    // endpoint exposes assets of a single project, so gate it by the same
    // public-project rule used by the detail page — hidden containers'
    // assets must not be fetchable via API. (No front-end consumer today;
    // this changes no legitimate behaviour.)
    const row = await getProjectVisibility(supabaseAdmin, projectId);

    if (!row || !isPublicProject(row)) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // The repository throws on a read failure; the route maps the message
    // onto its own 500, exactly like the old inline query did.
    let assets: ProjectGalleryAssetRow[];
    try {
      assets = await listProjectGalleryAssets(supabaseAdmin, projectId, category);
    } catch (err) {
      console.error('Error fetching gallery:', err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Failed to fetch gallery: ${message}` },
        { status: 500 }
      );
    }

    const sortedData = [...(assets || [])].sort((a, b) => {
      const aCoverRank = a.is_cover || a.catalog_id?.endsWith('-000') ? 0 : 1;
      const bCoverRank = b.is_cover || b.catalog_id?.endsWith('-000') ? 0 : 1;
      if (aCoverRank !== bCoverRank) {
        return aCoverRank - bCoverRank;
      }

      const seqA = typeof a.sequence === 'number' ? a.sequence : Number.MAX_SAFE_INTEGER;
      const seqB = typeof b.sequence === 'number' ? b.sequence : Number.MAX_SAFE_INTEGER;
      if (seqA !== seqB) {
        return seqA - seqB;
      }

      const catalogA = a.catalog_id || '';
      const catalogB = b.catalog_id || '';
      if (catalogA && catalogB && catalogA !== catalogB) {
        return catalogA.localeCompare(catalogB);
      }

      return (a.created_at || '').localeCompare(b.created_at || '');
    });

    // Group by category for organized display
    const grouped = {
      all: sortedData,
      official_stills: sortedData.filter(img => img.category_tag === 'official_stills' || !img.category_tag),
      bts: sortedData.filter(img => img.category_tag === 'bts'),
      press_events: sortedData.filter(img => img.category_tag === 'press_events'),
    };

    return NextResponse.json({
      success: true,
      project_id: projectId,
      category,
      count: sortedData.length,
      data: sortedData,
      grouped,
    });
  } catch (error) {
    console.error('Unexpected error in GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
