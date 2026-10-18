import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';
import { MILESTONE_START_YEAR, milestonePriorityToYear, yearToMilestonePriority } from '@/lib/milestone-years';

const MILESTONE_PROJECT_TITLE = 'MILESTONES_ARCHIVE';

async function ensureMilestoneProject() {
  const supabaseAdmin = getSupabaseAdmin();

  let { data: project, error } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .eq('title', MILESTONE_PROJECT_TITLE)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!project) {
    const { data: createdProject, error: createError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .insert({
        title: MILESTONE_PROJECT_TITLE,
        category: 'personal_travel',
        description: 'Unified project for homepage milestone assets',
        curation_status: 'published',
        portal_visible: false,
        portal_priority: 0,
      })
      .select('*')
      .single();

    if (createError || !createdProject) {
      throw new Error(createError?.message || 'Failed to create milestone project');
    }

    project = createdProject;
  }

  return project;
}

/**
 * PATCH - Set milestone priority for gallery images
 * Body: { imageId: string, year: string }
 * year: '2022' | '2023' | '2024' | '2025' | null
 *
 * This ensures only one image per year by:
 * 1. Clearing existing milestone for that year
 * 2. Setting the new image as milestone
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { imageId, year } = body;

    // "infinity" is the legacy spelling for the ongoing slot; it now simply
    // means the current year, which is an ordinary slot like the others.
    const resolvedYear = year === 'infinity' ? new Date().getFullYear() : year;
    const newPriority = year === null ? null : yearToMilestonePriority(resolvedYear);

    if (year !== null && newPriority === null) {
      return NextResponse.json(
        { error: `Invalid year. Must be ${MILESTONE_START_YEAR} or later, or null` },
        { status: 400 }
      );
    }

    if (!imageId) {
      return NextResponse.json(
        { error: 'imageId is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    if (newPriority !== null) {
      const milestoneProject = await ensureMilestoneProject();
      const { error: linkError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .update({ project_id: milestoneProject.id })
        .eq('id', imageId);

      if (linkError) {
        return apiServerError('admin/gallery/milestone PATCH', linkError);
      }
    }

    // First, clear existing milestone for this year (if setting a new milestone)
    if (newPriority !== null) {
      const { error: clearError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .update({ milestone_priority: null })
        .eq('milestone_priority', newPriority);

      if (clearError) {
        console.error('[MILESTONE_API] Failed to clear existing milestone:', clearError);
        return apiServerError('admin/gallery/milestone PATCH', clearError);
      }
    }

    // Set new milestone
    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .update({ milestone_priority: newPriority })
      .eq('id', imageId)
      .select('id, image_url, milestone_priority')
      .single();

    if (error) {
      console.error('[MILESTONE_API] Failed to set milestone:', error);
      return apiServerError('admin/gallery/milestone PATCH', error);
    }

    console.log('[MILESTONE_API] Set milestone:', { imageId, year, priority: newPriority });

    return NextResponse.json({
      success: true,
      data: {
        imageId: data.id,
        year,
        priority: data.milestone_priority,
      },
    });
  } catch (error) {
    console.error('[MILESTONE_API] Error:', error);

    return apiServerError('admin/gallery/milestone', error);
  }
}

/**
 * GET - Get current milestone images for all years
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id, image_url, milestone_priority, caption, tag')
      .not('milestone_priority', 'is', null)
      .order('milestone_priority', { ascending: true });

    if (error) {
      console.error('[MILESTONE_API] Failed to fetch milestones:', error);
      return apiServerError('admin/gallery/milestone GET', error);
    }

    const milestones = data?.map(item => ({
      id: item.id,
      image_url: item.image_url,
      year: milestonePriorityToYear(item.milestone_priority),
      caption: item.caption,
      tag: item.tag,
    })) || [];

    return NextResponse.json({
      success: true,
      data: milestones,
    });
  } catch (error) {
    console.error('[MILESTONE_API] Error:', error);

    return apiServerError('admin/gallery/milestone', error);
  }
}
