import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { revalidateContentSurfaces } from '@/lib/revalidate-content';
import { getProjectByIdStrict, deleteProject, setProjectCover } from '@/lib/data/projects';
import { moveAssetsToProject } from '@/lib/data/gallery-assets';

/**
 * POST /api/admin/projects/[id]/merge - fold one project into another.
 *
 * P1-3 Phase 2: the reads and writes moved to lib/data; the multi-step
 * sequence (and its order) is unchanged, because there is no transaction
 * here - each step commits on its own and a later failure leaves the
 * earlier ones applied, exactly as before the move.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { id: sourceProjectId } = await params;
    const { targetProjectId } = await request.json();

    if (!sourceProjectId || !targetProjectId) {
      return NextResponse.json(
        { error: 'sourceProjectId and targetProjectId are required' },
        { status: 400 }
      );
    }

    if (sourceProjectId === targetProjectId) {
      return NextResponse.json(
        { error: 'Cannot merge a project into itself' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // .single() semantics carried over by getProjectByIdStrict: a missing row
    // surfaces as the PGRST116 message, which is what the old branches
    // answered with.
    let sourceProject;
    try {
      sourceProject = await getProjectByIdStrict(supabaseAdmin, sourceProjectId);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Source project not found' },
        { status: 404 }
      );
    }

    let targetProject;
    try {
      targetProject = await getProjectByIdStrict(supabaseAdmin, targetProjectId);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Target project not found' },
        { status: 404 }
      );
    }

    // Draft items stay on their own table access: there is no drafts
    // repository yet (Phase 3), and this call deliberately runs without a
    // schema prefix, exactly as before.
    const draftUpdate = await supabaseAdmin
      .from('draft_items')
      .update({ project_id: targetProjectId })
      .eq('project_id', sourceProjectId);

    if (draftUpdate.error) {
      return NextResponse.json(
        { error: draftUpdate.error.message },
        { status: 500 }
      );
    }

    try {
      await moveAssetsToProject(supabaseAdmin, sourceProjectId, targetProjectId);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }

    // A target without a cover inherits the source's. The old code fired
    // this update without checking its error; that fire-and-forget shape is
    // preserved on purpose.
    if (!targetProject.cover_url && sourceProject.cover_url) {
      try {
        await setProjectCover(supabaseAdmin, targetProjectId, sourceProject.cover_url as string);
      } catch {
        // verbatim: the old route ignored this update's error
      }
    }

    try {
      await deleteProject(supabaseAdmin, sourceProjectId);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }

    revalidateContentSurfaces();

    return NextResponse.json({
      success: true,
      sourceProjectId,
      targetProjectId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to merge project',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
