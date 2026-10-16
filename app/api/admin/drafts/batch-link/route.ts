import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';

/**
 * POST /api/admin/drafts/batch-link
 * Assign many draft items to one project in a single update.
 * Body: { ids: string[], projectId: string }  -> assign to project
 *       { ids: string[], unlink: true }       -> remove from any project
 * Re-linking a draft that already belongs to another project is allowed
 * (curators may regroup); the response reports how many were moved.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((v: unknown) => typeof v === 'string' && v) : [];
    const projectId = typeof body?.projectId === 'string' ? body.projectId.trim() : '';
    const unlink = body?.unlink === true;

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ids array is required' },
        { status: 400 }
      );
    }
    if (!projectId && !unlink) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (unlink) {
      const { data: updated, error: unlinkError } = await supabaseAdmin
        .from('draft_items')
        .update({ project_id: null })
        .in('id', ids)
        .select('id');

      if (unlinkError) {
        return apiServerError('admin/drafts/batch-link POST', unlinkError);
      }

      return NextResponse.json({
        success: true,
        unlinked: updated?.length || 0,
      });
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, title')
      .eq('id', projectId)
      .maybeSingle();

    if (projectError) {
      return apiServerError('admin/drafts/batch-link POST', projectError);
    }
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Count drafts already pointing elsewhere (for reporting)
    const { data: before, error: beforeError } = await supabaseAdmin
      .from('draft_items')
      .select('id, project_id')
      .in('id', ids);

    if (beforeError) {
      return apiServerError('admin/drafts/batch-link POST', beforeError);
    }

    const moved = (before || []).filter((d) => d.project_id && d.project_id !== projectId).length;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('draft_items')
      .update({ project_id: projectId })
      .in('id', ids)
      .select('id');

    if (updateError) {
      return apiServerError('admin/drafts/batch-link POST', updateError);
    }

    return NextResponse.json({
      success: true,
      linked: updated?.length || 0,
      movedFromOtherProjects: moved,
      projectId,
      projectTitle: project.title,
    });
  } catch (error) {
    return apiServerError('admin/drafts/batch-link POST', error);
  }
}
