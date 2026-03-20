import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

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

    // Build query
    let query = supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    // Filter by category if not 'all'
    if (category !== 'all') {
      query = query.eq('category_tag', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching gallery:', error);
      return NextResponse.json(
        { error: `Failed to fetch gallery: ${error.message}` },
        { status: 500 }
      );
    }

    const sortedData = [...(data || [])].sort((a, b) => {
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
