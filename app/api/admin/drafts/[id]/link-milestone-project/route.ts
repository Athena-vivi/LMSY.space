import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MILESTONE_PROJECT_TITLE = 'MILESTONES_ARCHIVE';

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('draft_items')
      .select('id,project_id,r2_media_url,event_date')
      .eq('id', id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { success: false, error: draftError?.message || 'Draft not found' },
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
      return NextResponse.json(
        { success: false, error: projectError.message },
        { status: 500 }
      );
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
        return NextResponse.json(
          { success: false, error: createError?.message || 'Failed to create milestone project' },
          { status: 500 }
        );
      }

      project = createdProject;
    }

    const { error: updateError } = await supabaseAdmin
      .from('draft_items')
      .update({ project_id: project.id })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      created: true,
      data: project,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
