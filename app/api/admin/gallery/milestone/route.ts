import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { revalidateContentSurfaces } from '@/lib/revalidate-content';
import { apiServerError } from '@/lib/security/http';
import { MILESTONE_START_YEAR, milestonePriorityToYear, yearToMilestonePriority } from '@/lib/milestone-years';
import {
  findProjectByTitle,
  createProjectRow,
  linkAssetToProject,
  clearMilestonePriorityByValue,
  setMilestonePriority,
  listMilestoneAssets,
} from '@/lib/data/gallery-admin';

const MILESTONE_PROJECT_TITLE = 'MILESTONES_ARCHIVE';

async function ensureMilestoneProject(): Promise<Record<string, unknown>> {
  const supabaseAdmin = getSupabaseAdmin();

  let project: Record<string, unknown> | null;
  try {
    project = await findProjectByTitle(supabaseAdmin, MILESTONE_PROJECT_TITLE);
  } catch (error) {
    throw new Error((error as Error).message);
  }

  if (!project) {
    try {
      project = await createProjectRow(supabaseAdmin, {
        title: MILESTONE_PROJECT_TITLE,
        category: 'personal_travel',
        description: 'Unified project for homepage milestone assets',
        curation_status: 'published',
        portal_visible: false,
        portal_priority: 0,
      });
    } catch (error) {
      throw new Error((error as Error).message || 'Failed to create milestone project');
    }
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
      try {
        await linkAssetToProject(supabaseAdmin, imageId, milestoneProject.id as string);
      } catch (error) {
        return apiServerError('admin/gallery/milestone PATCH', error);
      }
    }

    // First, clear existing milestone for this year (if setting a new milestone)
    if (newPriority !== null) {
      try {
        await clearMilestonePriorityByValue(supabaseAdmin, newPriority);
      } catch (error) {
        console.error('[MILESTONE_API] Failed to clear existing milestone:', error);
        return apiServerError('admin/gallery/milestone PATCH', error);
      }
    }

    // Set new milestone
    let data: Record<string, unknown>;
    try {
      data = await setMilestonePriority(supabaseAdmin, imageId, newPriority);
    } catch (error) {
      console.error('[MILESTONE_API] Failed to set milestone:', error);
      return apiServerError('admin/gallery/milestone PATCH', error);
    }

    console.log('[MILESTONE_API] Set milestone:', { imageId, year, priority: newPriority });

    // The asset is re-linked to the milestone project, which also removes it
    // from the door it used to hang under - the doors need the fresh read.
    revalidateContentSurfaces();

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

    let rows: Array<Record<string, unknown>>;
    try {
      rows = await listMilestoneAssets(supabaseAdmin);
    } catch (error) {
      console.error('[MILESTONE_API] Failed to fetch milestones:', error);
      return apiServerError('admin/gallery/milestone GET', error);
    }

    const milestones = rows.map((item) => ({
      id: item.id,
      image_url: item.image_url,
      year: milestonePriorityToYear(item.milestone_priority as number | null),
      caption: item.caption,
      tag: item.tag,
    }));

    return NextResponse.json({
      success: true,
      data: milestones,
    });
  } catch (error) {
    console.error('[MILESTONE_API] Error:', error);

    return apiServerError('admin/gallery/milestone', error);
  }
}
