import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { revalidateContentSurfaces } from '@/lib/revalidate-content';
import { getProjectByIdStrict, insertProject } from '@/lib/data/projects';

/**
 * POST /api/admin/projects/[id]/split - mint a sibling project that
 * inherits the source's filing, so pictures can be moved onto it.
 *
 * P1-3 Phase 2: the source read and the insert moved to lib/data; the
 * inherited field list and the response shape are unchanged.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { id: sourceProjectId } = await params;
    const { title } = await request.json();

    if (!sourceProjectId || !title || !String(title).trim()) {
      return NextResponse.json(
        { error: 'sourceProjectId and title are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // .single() semantics carried over by getProjectByIdStrict: a missing
    // row surfaces as the PGRST116 message, same as the old branch.
    let sourceProject;
    try {
      sourceProject = await getProjectByIdStrict(supabaseAdmin, sourceProjectId);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Source project not found' },
        { status: 404 }
      );
    }

    let newProject;
    try {
      newProject = await insertProject(supabaseAdmin, {
        title: String(title).trim(),
        category: sourceProject.category,
        release_date: sourceProject.release_date,
        description: sourceProject.description,
        cover_url: sourceProject.cover_url,
        watch_url: sourceProject.watch_url,
        tags: sourceProject.tags,
        portal_visible: false,
        portal_priority: 0,
        theme_statement: sourceProject.theme_statement || null,
        curation_status: 'draft',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      return NextResponse.json(
        { error: message || 'Failed to create split project' },
        { status: 500 }
      );
    }

    revalidateContentSurfaces();

    return NextResponse.json({
      success: true,
      data: newProject,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to split project',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
