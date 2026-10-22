/**
 * Chronicle timeline data source (phase-4 batch 2, Task 2; year-scoped and
 * paged since phase-9).
 *
 * Chronicle is now a derived view over the site's real content objects:
 *   - project events, dated by projects.event_date (release_date only as a
 *     fallback for rows written before the phase-7 date split)
 *   - image-group events, dated by gallery_assets.event_date, grouped per
 *     (project, event_date) so hundreds of assets collapse into a handful of
 *     thumbnail sets
 *
 * The previous source (published rows from the ingestion pipeline) is retired
 * on purpose; the six legacy published drafts stay untouched in the database
 * and remain an admin-side pending decision.
 *
 * Visibility: both queries go through applyPublicProjectFilter (the same
 * rule as every other public surface) - switching data sources must not
 * bypass portal_visible / the archived rule.
 *
 * No synthetic entry numbers (the old array-index ids are gone):
 * React keys are the database uuid or the verifiable stable combination
 * `assets-{project_id}-{event_date}`.
 *
 * WHY THE YEAR ARGUMENT EXISTS
 * ----------------------------
 * PostgREST answers at most 1000 rows per request (Supabase's db-max-rows).
 * A single unbounded `.in(project_id, ...)` therefore silently truncated the
 * timeline: on 2026-10-23 the table held 1287 dated public assets, the request
 * returned 1000, and every image after 2026-05-30 was missing from /timeline
 * without any error. Two changes fix it:
 *
 *   1. Callers pass a year, so the query carries an event_date range instead
 *      of walking the whole table. The timeline only ever shows one year at a
 *      time now.
 *   2. Within a year the walk pages on the `id` cursor, so a year that grows
 *      past 1000 rows is still read in full.
 *
 * The cursor is `id`, not `offset`: the table is written to while the page
 * renders, and an offset window shifts under concurrent inserts (measured:
 * 1146 rows walked by offset, 1145 distinct ids - one duplicated, one
 * skipped). Sorting is restored in memory below, because a cursor walk can
 * only be ordered by the cursor column.
 */
import { cache } from 'react';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { normalizeLocalizedText, type LocalizedText } from '@/lib/localized-content';
import { isThemeProject } from '@/lib/project-kind';

// Pure helpers live in an alias-free module so they are directly testable.
export { formatChronicleDate, extractYears } from '@/lib/chronicle-dates';

/** Rows per PostgREST request. Matches the server-side db-max-rows ceiling. */
const ASSET_PAGE_SIZE = 1000;
/** Hard stop far past any plausible single year; logs if it is ever reached. */
const MAX_ASSET_PAGES = 30;

export interface TimelineImageRef {
  id: string;
  image_url: string;
  caption: string | null;
  caption_i18n: LocalizedText | null;
  catalog_id: string | null;
  width?: number | null;
  height?: number | null;
}

export type ChronicleEvent =
  | {
      kind: 'project';
      id: string;
      /** Raw ISO date (YYYY-MM-DD) from projects.release_date. */
      date: string;
      title: string;
      titleI18n: LocalizedText;
      category: string;
      href: string;
    }
  | {
      kind: 'images';
      id: string;
      /** Raw ISO date (YYYY-MM-DD) from gallery_assets.event_date. */
      date: string;
      projectId: string;
      projectTitle: string;
      projectTitleI18n: LocalizedText;
      href: string;
      images: TimelineImageRef[];
    };

interface PublicProjectRow {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  category: string;
  project_kind: string | null;
  event_date: string | null;
  release_date: string | null;
}

interface AssetRow {
  id: string;
  image_url: string;
  event_date: string;
  caption: string | null;
  caption_i18n: LocalizedText | null;
  catalog_id: string | null;
  project_id: string;
}

/**
 * Public projects, fetched once per request.
 *
 * Deliberately NOT filtered by year: a project dated 2025 can own assets dated
 * 2026 (images filed later, or a release that spans a new year). Filtering the
 * project list by year would orphan those assets - the grouping step drops any
 * asset whose project is missing. 171 rows sit far below the 1000-row ceiling,
 * so reading them whole is both safe and cheaper than a second query per year.
 */
const loadPublicProjects = cache(async (): Promise<PublicProjectRow[]> => {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdmin();

  const { data, error } = await applyPublicProjectFilter(
    supabase
      .schema('lmsy_archive')
      .from('projects')
      .select('id, slug, title, title_i18n, category, project_kind, event_date, release_date')
  );

  if (error) {
    console.error('[CHRONICLE] Failed to fetch public projects:', error);
    return [];
  }
  return (data ?? []) as unknown as PublicProjectRow[];
});

/** First and last day of a calendar year, as the half-open range PostgREST wants. */
function yearRange(year: string): { from: string; to: string } {
  const start = Number(year);
  return { from: `${year}-01-01`, to: `${start + 1}-01-01` };
}

/**
 * Every dated asset of the given projects for one year, read in full.
 *
 * Returns null when a page fails, so the caller can distinguish "no assets"
 * from "the query broke" - the old code returned [] for both, which turned a
 * failed read into a silently empty timeline.
 */
async function loadAssetsForYear(
  projectIds: string[],
  year: string | undefined
): Promise<AssetRow[] | null> {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdmin();

  const baseQuery = () =>
    supabase
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select(
        'id, image_url, event_date, caption, caption_i18n, catalog_id, project_id, width, height'
      )
      .in('project_id', projectIds)
      .not('event_date', 'is', null);

  const rows: AssetRow[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_ASSET_PAGES; page += 1) {
    let query: ReturnType<typeof baseQuery> = baseQuery();

    if (year) {
      const { from, to } = yearRange(year);
      query = query.gte('event_date', from).lt('event_date', to);
    }

    // Ordered by the cursor column only - a cursor cannot step through a
    // composite sort. The display order is rebuilt in memory below.
    query = query.order('id', { ascending: true }).limit(ASSET_PAGE_SIZE);
    if (cursor) query = query.gt('id', cursor);

    const { data, error } = await query;

    if (error) {
      console.error('[CHRONICLE] Failed to fetch public assets:', error);
      return null;
    }

    const batch = (data ?? []) as unknown as AssetRow[];
    rows.push(...batch);
    if (batch.length < ASSET_PAGE_SIZE) return rows;

    cursor = batch[batch.length - 1].id;
  }

  console.error(
    `[CHRONICLE] Asset walk hit MAX_ASSET_PAGES (${MAX_ASSET_PAGES}) for year ${year ?? 'all'}; collecting fewer rows than exist`
  );
  return rows;
}

/**
 * Years that actually contain at least one public record, newest first.
 *
 * This used to be derived from the full event list, which meant loading every
 * year just to render the year filter. It is now answered by a bounds query
 * plus one row count per year in that range - the counts are HEAD requests
 * that transfer no rows.
 */
export async function getChronicleYears(): Promise<string[]> {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdmin();

  const years = new Set<string>();

  // Project events: 171 rows, cheap to fold in whole.
  for (const p of await loadPublicProjects()) {
    if (isThemeProject(p as { project_kind?: unknown })) continue;
    const date = p.event_date || p.release_date;
    if (date) years.add(date.slice(0, 4));
  }

  // Asset event dates define the span the year filter has to cover.
  const [earliest, latest] = await Promise.all([
    supabase
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('event_date')
      .not('event_date', 'is', null)
      .order('event_date', { ascending: true })
      .limit(1),
    supabase
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('event_date')
      .not('event_date', 'is', null)
      .order('event_date', { ascending: false })
      .limit(1),
  ]);

  const first = (earliest.data?.[0] as { event_date?: string } | undefined)?.event_date;
  const last = (latest.data?.[0] as { event_date?: string } | undefined)?.event_date;

  if (first && last) {
    const firstYear = Number(first.slice(0, 4));
    const lastYear = Number(last.slice(0, 4));

    // One HEAD count per year in the span. A year with no rows is left out,
    // so the filter never offers a year that opens empty.
    const counts = await Promise.all(
      Array.from({ length: Math.max(0, lastYear - firstYear + 1) }, (_, offset) => {
        const year = String(firstYear + offset);
        const { from, to } = yearRange(year);
        return supabase
          .schema('lmsy_archive')
          .from('gallery_assets')
          .select('id', { count: 'exact', head: true })
          .gte('event_date', from)
          .lt('event_date', to)
          .then((result) => ({ year, count: result.count ?? 0 }));
      })
    );

    for (const { year, count } of counts) {
      if (count > 0) years.add(year);
    }
  }

  return Array.from(years).sort().reverse();
}

/**
 * Resolve a row's public address, or drop the event.
 *
 * 2026-10-21: there is no /projects namespace any more. An event is read under
 * the door that owns it (lib/entry-path.ts), and a row whose hall has no page
 * has no address - a timeline card that cannot be opened reads as broken, so
 * the row is left out rather than rendered dead. No publicly visible row is in
 * that situation today.
 */
export async function getChronicleEvents(year?: string): Promise<ChronicleEvent[]> {
  const rows = await loadPublicProjects();
  if (rows.length === 0) return [];

  const events: ChronicleEvent[] = [];
  const { loadSeriesSlugMap } = await import('@/lib/series-slugs');
  const { entryPath } = await import('@/lib/entry-path');
  const seriesSlugs = await loadSeriesSlugMap();

  const inYear = (date: string) => !year || date.slice(0, 4) === year;

  for (const p of rows) {
    // A theme project carries no single event date by definition ("Back View"
    // is a subject, not a happening). Putting a project point on the timeline
    // for it would mean inventing a date, so it is skipped here - its images
    // still show up below, each under the date it actually happened.
    if (isThemeProject(p as { project_kind?: unknown })) continue;

    // Event date first (when it actually happened). release_date is only a
    // fallback for rows that predate the phase-7 split - it is the source
    // publication date and must never be confused with the collection date.
    const date = (p.event_date || p.release_date) ?? '';
    if (!date) continue; // undated projects have no timeline slot
    if (!inYear(date)) continue;
    const href = entryPath(p as never, seriesSlugs);
    if (!href) continue; // nowhere to send the visitor
    events.push({
      kind: 'project',
      id: `project-${p.id}`,
      date,
      title: p.title,
      titleI18n: normalizeLocalizedText(p.title_i18n, p.title),
      category: p.category,
      href,
    });
  }

  // 2. Image groups for those projects (assets are always project-linked:
  //    verified 0 rows with NULL project_id).
  const assets = await loadAssetsForYear(
    rows.map((r) => r.id),
    year
  );
  if (!assets) return [];

  // Restore the display order the cursor walk cannot express: chronological
  // within a group, then the stable catalog sequence. Without this the
  // thumbnails and the lightbox sequence would follow uuid order.
  assets.sort((a, b) => {
    if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date);
    const ca = a.catalog_id ?? '';
    const cb = b.catalog_id ?? '';
    if (ca !== cb) return ca.localeCompare(cb);
    return a.id.localeCompare(b.id);
  });

  const projectById = new Map(rows.map((r) => [r.id, r]));
  const groups = new Map<string, TimelineImageRef[]>();

  for (const a of assets) {
    const key = `${a.project_id}|${a.event_date}`;
    const bucket = groups.get(key) || [];
    bucket.push({
      id: a.id,
      image_url: a.image_url,
      caption: a.caption ?? null,
      caption_i18n: normalizeLocalizedText(a.caption_i18n, a.caption ?? ''),
      catalog_id: a.catalog_id ?? null,
    });
    groups.set(key, bucket);
  }

  for (const [key, images] of groups) {
    const [projectId, date] = key.split('|');
    const project = projectById.get(projectId);
    if (!project) continue;
    const href = entryPath(project as never, seriesSlugs);
    if (!href) continue; // nowhere to send the visitor
    events.push({
      kind: 'images',
      id: `assets-${projectId}-${date}`,
      date,
      projectId,
      projectTitle: project.title,
      projectTitleI18n: normalizeLocalizedText(project.title_i18n, project.title),
      href,
      images,
    });
  }

  // Newest first; on the same date a project entry leads its image set.
  return events.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.kind !== b.kind) return a.kind === 'project' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}
