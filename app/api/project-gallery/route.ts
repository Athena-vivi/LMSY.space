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
      .from('gallery')
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

    // Group by category for organized display
    const grouped = {
      all: data || [],
      official_stills: (data || []).filter(img => img.category_tag === 'official_stills' || !img.category_tag),
      bts: (data || []).filter(img => img.category_tag === 'bts'),
      press_events: (data || []).filter(img => img.category_tag === 'press_events'),
    };

    return NextResponse.json({
      success: true,
      project_id: projectId,
      category,
      count: data?.length || 0,
      data: data || [],
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
