import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { HOME_CATEGORIES } from '@/lib/category-registry';
import { listPublicPortalProjects } from '@/lib/data/projects';
import { getPinnedPortalCover, getPortalCoverCandidate } from '@/lib/data/gallery-assets';

/**
 * GET /api/home/portals
 *
 * Cover image + public project count for each of the five fixed homepage
 * entries. The entry list itself comes from lib/category-registry.ts, so the
 * homepage, the filter chips and the database constraint can never drift.
 *
 * A category with no public project still gets an entry: the count comes back
 * as 0 and the card renders its "collecting" placeholder. Empty halls are a
 * state of the archive, not a reason to remove the door.
 *
 * Cover priority:
 *   0. the vault image the curator pinned to this door (gallery_assets
 *      .portal_slot), set in Asset Vault -> PORTALS. This wins outright.
 * Then, inside the first public project by priority:
 *   1. project.cover_url (curated by hand)
 *   2. the asset whose catalog_id ends in -000
 *   3. a featured asset
 *   4. any asset of that project
 *
 * revalidate = 0 so a data change shows up on the next request.
 */
export const revalidate = 0;

interface PortalCover {
  imageUrl: string;
  blurData: string | null;
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    async function fetchPortal(category: string): Promise<{
      cover: PortalCover | null;
      count: number;
    }> {
      const projects = await listPublicPortalProjects(supabaseAdmin, category);

      // The repo answers null only on a read failure - the old branch degraded
      // this hall alone, exactly as before.
      if (projects === null) {
        return { cover: null, count: 0 };
      }

      const count = projects.length;

      // A pinned cover is the curator's decision, not a fallback: use it even
      // when the hall has no public project yet, so an empty door can still
      // carry the photo they chose for it.
      const pinned = await getPinnedPortalCover(supabaseAdmin, category);

      if (pinned?.image_url) {
        return {
          cover: { imageUrl: pinned.image_url, blurData: pinned.blur_data ?? null },
          count,
        };
      }

      if (projects.length === 0) {
        return { cover: null, count: 0 };
      }

      // First project in priority order that actually resolves to an image.
      for (const project of projects) {
        if (project.cover_url) {
          return { cover: { imageUrl: project.cover_url, blurData: null }, count };
        }

        const catalogAsset = await getPortalCoverCandidate(supabaseAdmin, project.id, 'catalog');
        if (catalogAsset?.image_url) {
          return {
            cover: { imageUrl: catalogAsset.image_url, blurData: catalogAsset.blur_data ?? null },
            count,
          };
        }

        const featuredAsset = await getPortalCoverCandidate(supabaseAdmin, project.id, 'featured');
        if (featuredAsset?.image_url) {
          return {
            cover: { imageUrl: featuredAsset.image_url, blurData: featuredAsset.blur_data ?? null },
            count,
          };
        }

        const anyAsset = await getPortalCoverCandidate(supabaseAdmin, project.id, 'any');
        if (anyAsset?.image_url) {
          return {
            cover: { imageUrl: anyAsset.image_url, blurData: anyAsset.blur_data ?? null },
            count,
          };
        }
      }

      // Projects exist but none has an image yet: the count is real, the
      // cover is not. The card uses its gradient.
      return { cover: null, count };
    }

    const results = await Promise.all(
      HOME_CATEGORIES.map(async (definition) => {
        const { cover, count } = await fetchPortal(definition.value);
        return { value: definition.value, cover, count };
      })
    );

    const covers: Record<string, PortalCover | null> = {};
    const counts: Record<string, number> = {};
    for (const result of results) {
      covers[result.value] = result.cover;
      counts[result.value] = result.count;
    }

    return NextResponse.json({ covers, counts });
  } catch (error) {
    console.error('[API_PORTALS] Critical error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portal images' },
      { status: 500 }
    );
  }
}
