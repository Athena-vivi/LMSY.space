import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MILESTONE_PROJECT_TITLE = 'MILESTONES_ARCHIVE';

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('draft_items')
      .select('id,project_id,r2_media_url,event_date')
      .eq('id', id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found' },
        { status: 404 }
      );
    }

    if (draft.project_id) {
      return NextResponse.json({
        success: true,
        created: false,
        data: { id: draft.project_id },
      });
    }

    let { data: project, error: projectError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('*')
      .eq('title', MILESTONE_PROJECT_TITLE)
      .maybeSingle();

    if (projectError) {
      return apiServerError('admin/drafts/[id]/link-milestone-project POST', projectError);
    }

    if (!project) {
      const { data: createdProject, error: createError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .insert({
          title: MILESTONE_PROJECT_TITLE,
          category: 'daily',
          description: 'Unified project for homepage milestone assets',
          cover_url: draft.r2_media_url,
          release_date: draft.event_date,
          curation_status: 'published',
          portal_visible: false,
          portal_priority: 0,
        })
        .select('*')
        .single();

      if (createError || !createdProject) {
        return apiServerError('admin/drafts/[id]/link-milestone-project POST', createError);
      }

      project = createdProject;
    }

    const { error: updateError } = await supabaseAdmin
      .from('draft_items')
      .update({ project_id: project.id })
      .eq('id', id);

    if (updateError) {
      return apiServerError('admin/drafts/[id]/link-milestone-project POST', updateError);
    }

    return NextResponse.json({
      success: true,
      created: true,
      data: project,
    });
  } catch (error) {
    return apiServerError('admin/drafts/[id]/link-milestone-project POST', error);
  }
}
