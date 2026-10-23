import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { milestonePriorityToYear } from '@/lib/milestone-years';

/**
 * The vault-wide payload: projects (for the editorial tab), the handful of
 * fixed slots (homepage doors, year photos), the tag list, and the row count.
 *
 * It deliberately does NOT return every gallery asset. That walk used to cost
 * 1.7 MB and ran on every visit to every tab; the images themselves now come
 * one page at a time from /api/admin/vault/assets.
 *
 * PostgREST answers at most 1000 rows per request (Supabase's db-max-rows), so
 * the project list is paged with a keyset cursor rather than a plain select -
 * a single `.select('*')` would silently truncate it.
 *
 * Paging is keyset, not offset: offset windows shift when a row is inserted
 * mid-walk, which duplicate-read one row and skipped another while an upload
 * was running. A cursor on (created_at, id) is immune to that, and `id` breaks
 * ties on created_at - a few hundred rows share a timestamp, so without it a
 * page boundary could repeat or skip rows.
 *
 * The walk always orders by created_at, because the display column for
 * projects (release_date) is nullable and a cursor cannot step past NULLs.
 * The caller re-sorts by display order afterwards.
 */
const PAGE_SIZE = 1000;
const MAX_PAGES = 50; // hard stop well past the ten-thousand row mark

/** Passed through to the client as JSON; only the sort column is typed. */
interface ProjectRow {
  id: string;
  release_date: string | null;
  [key: string]: unknown;
}

interface PagedResult<T> {
  rows: T[];
  error: { message: string } | null;
  /** True when the loop stopped at MAX_PAGES instead of the last row. */
  truncated: boolean;
}

async function fetchEveryProject(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
): Promise<PagedResult<ProjectRow>> {
  const rows: ProjectRow[] = [];
  let cursor: { created_at: string; id: string } | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    let query = supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor) {
      query = query.or(
        `created_at.lt."${cursor.created_at}",and(created_at.eq."${cursor.created_at}",id.lt.${cursor.id})`
      );
    }

    const { data, error } = await query;
    if (error) return { rows, error, truncated: false };

    const batch = (data ?? []) as ProjectRow[];
    if (batch.length === 0) return { rows, error: null, truncated: false };

    rows.push(...batch);
    const last = batch[batch.length - 1] as unknown as { created_at: string; id: string };
    cursor = { created_at: last.created_at, id: last.id };

    if (batch.length < PAGE_SIZE) return { rows, error: null, truncated: false };
  }

  return { rows, error: null, truncated: true };
}

/**
 * Every tag in use, for the filter dropdown. There is no group-by in
 * PostgREST, so this walks the one column instead of every row: ~1,350 rows of
 * `{id, tag}` is a few kilobytes, versus the megabytes a full row select cost.
 */
async function fetchTags(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
): Promise<{ tags: string[]; error: { message: string } | null }> {
  const tags = new Set<string>();
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    let query = supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id, tag')
      .order('id', { ascending: true })
      .limit(PAGE_SIZE);

    if (cursor) query = query.gt('id', cursor);

    const { data, error } = await query;
    if (error) return { tags: [...tags], error };

    const batch = (data ?? []) as Array<{ id: string; tag: string | null }>;
    if (batch.length === 0) break;

    for (const row of batch) if (row.tag) tags.add(row.tag);
    cursor = batch[batch.length - 1].id;

    if (batch.length < PAGE_SIZE) break;
  }

  return { tags: [...tags].sort((a, b) => a.localeCompare(b)), error: null };
}

/** Newest publication first, undated rows last - the order the vault used. */
function byReleaseDateDesc<T extends { release_date?: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const left = a.release_date ?? '';
    const right = b.release_date ?? '';
    if (left === right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return right.localeCompare(left);
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const [projectsResult, galleryTotalResult, portalResult, milestoneResult] = await Promise.all([
      fetchEveryProject(supabaseAdmin),
      // The true row count, asked for explicitly. Tab badges read this.
      supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('id', { count: 'exact', head: true }),
      // The fixed homepage doors: at most one row per slot, so a filter is
      // enough - no paging, no ordering.
      supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('id, image_url, blur_data, portal_slot, interview_slot')
        .or('portal_slot.not.is.null,interview_slot.not.is.null'),
      supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('id, image_url, milestone_priority, caption, tag')
        .not('milestone_priority', 'is', null),
    ]);

    if (projectsResult.error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch projects', details: projectsResult.error.message },
        { status: 500 }
      );
    }

    if (portalResult.error || milestoneResult.error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch homepage slots',
          details: (portalResult.error ?? milestoneResult.error)?.message,
        },
        { status: 500 }
      );
    }

    const tagResult = await fetchTags(supabaseAdmin);
    if (tagResult.error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tags', details: tagResult.error.message },
        { status: 500 }
      );
    }

    const projects = byReleaseDateDesc(projectsResult.rows);
    const galleryTotal = galleryTotalResult.count ?? 0;
    const portals = (portalResult.data ?? []) as Array<{
      id: string;
      image_url: string;
      blur_data: string | null;
      portal_slot: string | null;
      interview_slot: string | null;
    }>;

    const milestones = Object.fromEntries(
      ((milestoneResult.data ?? []) as Array<{
        id: string;
        image_url: string;
        milestone_priority: number;
        caption: string | null;
        tag: string | null;
      }>).map((item) => {
        const year = milestonePriorityToYear(item.milestone_priority);

        return [
          year,
          {
            id: item.id,
            image_url: item.image_url,
            year,
            caption: item.caption,
            tag: item.tag,
          },
        ];
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        projects,
        portals,
        milestones,
        tags: tagResult.tags,
        counts: {
          gallery: galleryTotal,
          projects: projects.length,
          editorial: projects.filter(
            (project) => (project as { category?: string }).category === 'editorial'
          ).length,
          portals: portals.length,
          milestones: Object.keys(milestones).length,
        },
      },
      debug: {
        projects_count: projects.length,
        projects_truncated: projectsResult.truncated,
        gallery_total: galleryTotal,
        portal_count: portals.length,
        milestone_count: Object.keys(milestones).length,
        tag_count: tagResult.tags.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
