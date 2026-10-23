import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { revalidateContentSurfaces } from '@/lib/revalidate-content';
import {
  getProjectById,
  updateProject,
  deleteProject,
  type ProjectRow,
} from '@/lib/data/projects';

/**
 * Projects Management API
 *
 * GET /api/admin/projects/[id] - Fetch a project
 * DELETE /api/admin/projects/[id] - Delete a project
 * PATCH /api/admin/projects/[id] - Update a project
 */

/**
 * The four values allowed by lmsy_archive.projects_project_kind_check.
 * Kept here so the route rejects a typo instead of letting Postgres fail the
 * whole update with a constraint error.
 */
const PROJECT_KINDS = ['event', 'theme', 'series', 'video'] as const;

// ========================================
// GET - Fetch Project
// ========================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // P1-3 Phase 2: the read moved to lib/data/projects.ts. The repository
    // throws on a db error; null means "no such row", same as maybeSingle.
    let data: ProjectRow | null;
    try {
      data = await getProjectById(supabaseAdmin, id);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to fetch project',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch project',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ========================================
// DELETE - Delete Project
// ========================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    // Get project ID
    const { id } = await params;

    if (!id) {
      console.error('[PROJECTS_DELETE] ❌ Missing project ID');
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Delete project using admin client
    const supabaseAdmin = getSupabaseAdmin();

    // P1-3 Phase 2: the delete moved to lib/data/projects.ts; the
    // repository throws on a db error (the route logs and answers 500).
    try {
      await deleteProject(supabaseAdmin, id);
    } catch (error) {
      console.error(
        '[PROJECTS_DELETE] ❌ Delete failed:',
        error instanceof Error ? error.message : String(error)
      );
      return NextResponse.json(
        {
          error: 'Failed to delete project',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }

    console.log('[PROJECTS_DELETE] ✅ Project deleted:', id);

    revalidateContentSurfaces();

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('[PROJECTS_DELETE] ❌ Operation exception:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete project',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ========================================
// PATCH - Update Project
// ========================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    // Get project ID
    const { id } = await params;

    console.log('[PROJECTS_PATCH] Update request for ID:', id);

    if (!id) {
      console.error('[PROJECTS_PATCH] ❌ Missing project ID');
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate fields. Title is only enforced when actually provided - small
    // partial updates (e.g. asset_group_covers from the curation page) must
    // not be forced to resend the whole form.
    if (body.title !== undefined && !body.title?.trim()) {
      console.error('[PROJECTS_PATCH] ❌ Empty title');
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      );
    }

    // Prepare update data. category is optional so partial updates (e.g. the
    // settings talk tabs saving just video links or the transcript) cannot
    // wipe it with undefined.
    const updateData: Record<string, string | number | boolean | string[] | null> = {};
    if (body.category !== undefined) updateData.category = body.category;
    if (body.title !== undefined) updateData.title = body.title.trim();

    // Optional fields
    // event_date is the column the public surfaces print (door lists, timeline,
    // search, drama pages all read event_date first). release_date is the
    // magazine issue date and the fallback for rows written before event_date
    // existed, so both stay writable.
    if (body.event_date !== undefined) updateData.event_date = body.event_date || null;
    if (body.release_date !== undefined) updateData.release_date = body.release_date || null;
    // Where the row sits in its hall, and (door 1) which series it hangs under.
    if (body.subtype !== undefined) updateData.subtype = body.subtype || null;
    // city is the structured half of "where": picked from a fixed list and used
    // to build the asset subject code (FANMEET-BKK). location stays free text.
    if (body.city !== undefined) updateData.city = body.city || null;
    if (body.location !== undefined) updateData.location = body.location || null;
    if (body.work_id !== undefined) updateData.work_id = body.work_id || null;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.title_i18n !== undefined) updateData.title_i18n = body.title_i18n || null;
    if (body.description_i18n !== undefined) updateData.description_i18n = body.description_i18n || null;
    if (body.watch_url !== undefined) updateData.watch_url = body.watch_url || null;
    if (body.tags !== undefined) updateData.tags = body.tags && body.tags.length > 0 ? body.tags : null;
    if (body.portal_visible !== undefined) updateData.portal_visible = !!body.portal_visible;
    if (body.portal_priority !== undefined) updateData.portal_priority = Number(body.portal_priority) || 0;
    if (body.theme_statement !== undefined) updateData.theme_statement = body.theme_statement || null;
    if (body.theme_statement_i18n !== undefined) updateData.theme_statement_i18n = body.theme_statement_i18n || null;
    if (body.homepage_excerpt_i18n !== undefined) updateData.homepage_excerpt_i18n = body.homepage_excerpt_i18n || null;
    // Interview body is Markdown on purpose: the detail page renders it with a
    // real typographic scale, so raw newlines are not enough.
    if (body.interview_md !== undefined) updateData.interview_md = body.interview_md || null;
    if (body.interview_video_url !== undefined) {
      updateData.interview_video_url = body.interview_video_url || null;
    }
    // Talk door video links, edited from the settings page tabs 3.
    if (body.video_url_bilibili !== undefined) {
      updateData.video_url_bilibili = body.video_url_bilibili || null;
    }
    if (body.video_url_youtube !== undefined) {
      updateData.video_url_youtube = body.video_url_youtube || null;
    }
    if (body.curation_status !== undefined) updateData.curation_status = body.curation_status || 'draft';
    // Curator-picked cover per picture class ({ className: catalogId }), read
    // by the live-events timeline boxes. Null clears the whole map (falls
    // back to first-picture-per-class).
    if (body.asset_group_covers !== undefined) {
      updateData.asset_group_covers = body.asset_group_covers || null;
    }
    // Talk door resource-box covers ({ bilibili|youtube|photos|transcript:
    // assetCatalogId }), picked per box from the curation page. Null clears
    // the whole map (boxes fall back to the first-picture default).
    if (body.talk_resource_covers !== undefined) {
      updateData.talk_resource_covers =
        body.talk_resource_covers && typeof body.talk_resource_covers === 'object'
          ? body.talk_resource_covers
          : null;
    }
    // 'event' (one dated happening), 'theme' (a subject across dates),
    // 'series' (a work other rows hang under) or 'video' (links out).
    // The four values are what projects_project_kind_check allows; anything
    // else is left alone instead of being flattened to 'event', which used to
    // silently demote a series row on save.
    if (body.project_kind !== undefined) {
      if (PROJECT_KINDS.includes(body.project_kind)) {
        updateData.project_kind = body.project_kind;
      } else {
        console.warn('[PROJECTS_PATCH] Ignoring unknown project_kind:', body.project_kind);
      }
    }

    console.log('[PROJECTS_PATCH] Update data:', updateData);

    // Update project using admin client
    const supabaseAdmin = getSupabaseAdmin();

    // P1-3 Phase 2: the update moved to lib/data/projects.ts. It returns
    // the selected rows (deliberately never .single(), which throws
    // PGRST116 when zero rows match) and throws on a db error.
    let data: ProjectRow[];
    try {
      data = await updateProject(supabaseAdmin, id, updateData);
    } catch (error) {
      console.error(
        '[PROJECTS_PATCH] ❌ Update failed:',
        error instanceof Error ? error.message : String(error)
      );
      return NextResponse.json(
        {
          error: 'Failed to update project',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }

    // Check if any rows were updated
    if (!data || data.length === 0) {
      console.error('[PROJECTS_PATCH] ❌ No rows updated. Project not found for ID:', id);
      return NextResponse.json(
        { error: 'Project not found', details: `No project with ID ${id}` },
        { status: 404 }
      );
    }

    console.log('[PROJECTS_PATCH] ✅ Project updated:', id, '| Rows:', data.length);

    revalidateContentSurfaces();

    return NextResponse.json({
      success: true,
      data: data[0], // Return first (and should be only) row
    });
  } catch (error) {
    console.error('[PROJECTS_PATCH] ❌ Operation exception:', error);
    return NextResponse.json(
      {
        error: 'Failed to update project',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
