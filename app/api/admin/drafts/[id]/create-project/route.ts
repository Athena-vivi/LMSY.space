import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function pickLocalizedText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, string | undefined>;
    return record.en || record.zh || record.th || '';
  }
  return '';
}

function inferCategory(tags: string[] | null | undefined) {
  const normalized = (tags || []).map((tag) => tag.toLowerCase());
  if (normalized.some((tag) => tag.includes('editorial') || tag.includes('magazine'))) return 'editorial';
  if (normalized.some((tag) => tag.includes('travel'))) return 'travel';
  if (normalized.some((tag) => tag.includes('commercial') || tag.includes('brand') || tag.includes('ad'))) return 'commercial';
  if (normalized.some((tag) => tag.includes('stage') || tag.includes('appearance') || tag.includes('performance'))) return 'appearance';
  if (normalized.some((tag) => tag.includes('series') || tag.includes('drama') || tag.includes('still'))) return 'series';
  return 'daily';
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    const { data: draft, error: draftError } = await supabaseAdmin
      .from('draft_items')
      .select('id,title,description,event_date,r2_media_url,project_id,tags')
      .eq('id', id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { success: false, error: draftError?.message || 'Draft not found' },
        { status: 404 }
      );
    }

    if (draft.project_id) {
      const { data: existingProject } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select('*')
        .eq('id', draft.project_id)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        created: false,
        data: existingProject,
      });
    }

    const projectTitle = pickLocalizedText(draft.title) || `Project ${new Date().toISOString().slice(0, 10)}`;
    const projectDescription = pickLocalizedText(draft.description) || null;
    const category = inferCategory(draft.tags);

    const { data: project, error: projectError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .insert({
        title: projectTitle,
        category,
        description: projectDescription,
        cover_url: draft.r2_media_url,
        release_date: draft.event_date,
        curation_status: 'draft',
        portal_visible: false,
        portal_priority: 0,
      })
      .select('*')
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: projectError?.message || 'Failed to create project' },
        { status: 500 }
      );
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
