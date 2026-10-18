import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';

/**
 * GET /api/home/summary
 *
 * One round-trip for the three data-driven homepage blocks:
 *   featured  - projects worth opening first
 *   years     - real distribution of records by event year (2022 onwards)
 *   people    - the two profiles plus how many public projects link to them
 *
 * Everything is derived from the same public-visibility rule as the rest of
 * the site, so the homepage cannot show something the index hides.
 */
export const revalidate = 0;

const FEATURED_LIMIT = 8;
const FEATURED_PER_CATEGORY = 2;
const ARCHIVE_START_YEAR = 2022;

/**
 * Which halls are worth showing first when nothing is flagged by hand.
 * Drama leads because that is how a new visitor meets them; editorial and
 * live material come next; commercial fills the rest.
 */
const CATEGORY_WEIGHT: Record<string, number> = {
  drama_work: 5,
  editorial: 3,
  live_event: 3,
  public_appearance: 2,
  commercial: 1,
  behind_the_scenes: 1,
  personal_travel: 1,
  early_archive: 0,
};

interface FeaturedRow {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: unknown;
  category: string | null;
  event_date: string | null;
  cover_url: string | null;
  homepage_featured: boolean | null;
  portal_priority: number | null;
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: projectRows, error: projectError } = await applyPublicProjectFilter(
      supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select(
          'id, slug, title, title_i18n, category, event_date, cover_url, homepage_featured, portal_priority'
        )
    );

    if (projectError) {
      console.error('[HOME_SUMMARY] project query failed:', projectError);
      return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 });
    }

    const projects = (projectRows ?? []) as unknown as FeaturedRow[];
    const ids = projects.map((project) => project.id);

    // One asset query for both the cover fallback and the image-presence test.
    const coverByProject: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: assets } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('project_id, image_url, is_cover, catalog_id')
        .in('project_id', ids)
        .order('is_cover', { ascending: false })
        .order('created_at', { ascending: true, nullsFirst: false });

      for (const asset of assets ?? []) {
        const pid = (asset as { project_id: string | null }).project_id;
        if (!pid || coverByProject[pid]) continue;
        const url = (asset as { image_url: string | null }).image_url;
        if (url) coverByProject[pid] = url;
      }
    }

    // ---- featured -------------------------------------------------------
    const rank = (project: FeaturedRow) =>
      [
        project.homepage_featured ? 1 : 0,
        project.portal_priority ?? 0,
        CATEGORY_WEIGHT[project.category ?? ''] ?? 0,
        project.event_date ?? '',
      ] as const;

    const sorted = [...projects].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      for (let i = 0; i < ra.length; i++) {
        if (ra[i] === rb[i]) continue;
        return ra[i] < rb[i] ? 1 : -1;
      }
      return 0;
    });

    const perCategory: Record<string, number> = {};
    const featured: Array<{
      id: string;
      slug: string | null;
      title: string;
      title_i18n: unknown;
      category: string | null;
      event_date: string | null;
      cover: string | null;
    }> = [];

    for (const project of sorted) {
      if (featured.length >= FEATURED_LIMIT) break;
      // A project without a single image is not a browsable set: it never
      // belongs in a picture-led feature row.
      const cover = coverByProject[project.id] ?? project.cover_url ?? null;
      if (!cover) continue;
      const category = project.category ?? 'unknown';
      if ((perCategory[category] ?? 0) >= FEATURED_PER_CATEGORY) continue;
      perCategory[category] = (perCategory[category] ?? 0) + 1;
      featured.push({
        id: project.id,
        slug: project.slug,
        title: project.title,
        title_i18n: project.title_i18n,
        category: project.category,
        event_date: project.event_date,
        cover,
      });
    }

    // ---- years ----------------------------------------------------------
    const countsByYear: Record<number, number> = {};
    for (const project of projects) {
      if (!project.event_date) continue;
      const year = Number(project.event_date.slice(0, 4));
      if (!Number.isFinite(year)) continue;
      countsByYear[year] = (countsByYear[year] ?? 0) + 1;
    }
    const currentYear = new Date().getFullYear();
    const years: Array<{ year: number; count: number }> = [];
    for (let year = currentYear; year >= ARCHIVE_START_YEAR; year--) {
      years.push({ year, count: countsByYear[year] ?? 0 });
    }

    // Trail off the empty leading-edge years: the preview is a window into
    // the archive, not a calendar. Three tiles are always kept so the block
    // never collapses to a single year, and the full range (down to 2022)
    // stays available on /timeline.
    while (years.length > 3 && years[years.length - 1].count === 0) {
      years.pop();
    }

    // ---- people ---------------------------------------------------------
    const { data: profileRows } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('profiles')
      .select('id, name, nickname, slug, avatar_url, birthday, role_label, bio, bio_i18n, ig_handle, x_handle')
      .order('nickname', { ascending: true });

    const { data: links } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('project_people')
      .select('profile_id, project_id, role');

    const publicIds = new Set(ids);
    const projectCountByProfile: Record<string, number> = {};
    for (const link of links ?? []) {
      const row = link as { profile_id: string; project_id: string };
      if (!publicIds.has(row.project_id)) continue;
      projectCountByProfile[row.profile_id] = (projectCountByProfile[row.profile_id] ?? 0) + 1;
    }

    const people = (profileRows ?? []).map((profile) => ({
      ...(profile as Record<string, unknown>),
      project_count: projectCountByProfile[(profile as { id: string }).id] ?? 0,
    }));

    return NextResponse.json({ featured, years, people });
  } catch (error) {
    console.error('[HOME_SUMMARY] critical error:', error);
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 });
  }
}
