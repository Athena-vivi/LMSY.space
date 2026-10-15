import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const projectId = typeof body?.projectId === 'string' ? body.projectId.trim() : '';

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('draft_items')
      .select('id, project_id')
      .eq('id', id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('id, title, cover_url, release_date, category')
      .eq('id', projectId)
      .maybeSingle();

    if (projectError) {
      return apiServerError('admin/drafts/[id]/link-project POST', projectError);
    }

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('draft_items')
      .update({ project_id: project.id })
      .eq('id', id);

    if (updateError) {
      return apiServerError('admin/drafts/[id]/link-project POST', updateError);
    }

    return NextResponse.json({
      success: true,
      relinked: draft.project_id === project.id ? false : Boolean(draft.project_id),
      data: project,
    });
  } catch (error) {
    return apiServerError('admin/drafts/[id]/link-project POST', error);
  }
}
