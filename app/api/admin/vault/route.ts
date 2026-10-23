import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/api-auth';
import { milestonePriorityToYear } from '@/lib/milestone-years';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { walkAllProjects } from '@/lib/data/projects';
import {
  countAllAssets,
  listPortalSlotAssets,
  listMilestoneAssets,
  listTagsInUse,
} from '@/lib/data/gallery-assets';

/**
 * The vault-wide payload: projects (for the editorial tab), the handful of
 * fixed slots (homepage doors, year photos), the tag list, and the row count.
 *
 * It deliberately does NOT return every gallery asset. That walk used to cost
 * 1.7 MB and ran on every visit to every tab; the images themselves now come
 * one page at a time from /api/admin/vault/assets.
 *
 * P1-3 Phase 2: the project walk, the tag walk and the three slot queries
 * moved to lib/data (projects.ts / gallery-assets.ts). This route is now
 * auth, error mapping and response shaping only.
 */

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

  // The repositories throw on a read error (they do not shape HTTP); each
  // catch maps onto the exact 500 the inline queries used to answer with.
  const fail = (error: string, message: string) =>
    NextResponse.json({ success: false, error, details: message }, { status: 500 });

  try {
    const supabaseAdmin = getSupabaseAdmin();

    let projectsWalk;
    try {
      projectsWalk = await walkAllProjects(supabaseAdmin);
    } catch (error) {
      return fail('Failed to fetch projects', error instanceof Error ? error.message : String(error));
    }

    let galleryTotal: number;
    let portalAssets;
    let milestoneAssets;
    try {
      [galleryTotal, portalAssets, milestoneAssets] = await Promise.all([
        // The true row count, asked for explicitly. Tab badges read this.
        countAllAssets(supabaseAdmin),
        listPortalSlotAssets(supabaseAdmin),
        listMilestoneAssets(supabaseAdmin),
      ]);
    } catch (error) {
      return fail('Failed to fetch homepage slots', error instanceof Error ? error.message : String(error));
    }

    let tags: string[];
    try {
      tags = await listTagsInUse(supabaseAdmin);
    } catch (error) {
      return fail('Failed to fetch tags', error instanceof Error ? error.message : String(error));
    }

    const projects = byReleaseDateDesc(projectsWalk.rows);
    const portals = portalAssets;

    const milestones = Object.fromEntries(
      milestoneAssets.map((item) => {
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
        tags,
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
        projects_truncated: projectsWalk.truncated,
        gallery_total: galleryTotal,
        portal_count: portals.length,
        milestone_count: Object.keys(milestones).length,
        tag_count: tags.length,
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
