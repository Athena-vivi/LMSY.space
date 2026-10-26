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
import { normalizeLocalizedText, type LocalizedText } from '@/lib/localized-content';
import { isThemeProject } from '@/lib/project-kind';
import { listPublicTimelineProjects, type TimelineProjectRow } from '@/lib/data/projects';
import {
  countAssetsInYear,
  getAssetEventDateBounds,
  listTimelineAssetsForYear,
  TIMELINE_ASSET_MAX_PAGES,
  type TimelineAssetRow,
} from '@/lib/data/gallery-assets';

// Pure helpers live in an alias-free module so they are directly testable.
export { formatChronicleDate, extractYears } from '@/lib/chronicle-dates';

export interface TimelineImageRef {
  id: string;
  image_url: string;
  caption: string | null;
  caption_i18n: LocalizedText | null;
  catalog_id: string | null;
  width?: number | null;
  height?: number | null;
}

/**
 * One card on the timeline = one happening.
 *
 * A project and the pictures filed under it on the same day are the same
 * happening, so they are one event, not two. Before 2026-10-26 they were two
 * cards: a text card from projects.event_date and an image card from
 * gallery_assets.event_date, which read as two unrelated records about the
 * same night (worse, the alternating column layout put them on opposite sides
 * of the centre line). The images now hang off the event they belong to.
 *
 * `images` is empty for an event whose pictures are filed under another date
 * (a release announced in December, shot in November) - then the text card and
 * the picture card are honestly two different days and stay apart.
 */
export interface ChronicleEvent {
  /** Stable, derived from the database: `project-<id>` or `assets-<projectId>-<date>`. */
  id: string;
  /** Raw ISO date (YYYY-MM-DD). */
  date: string;
  projectId: string;
  title: string;
  titleI18n: LocalizedText;
  category: string;
  /**
   * Where the card leads, or null when the project behind it has no page of
   * its own. The card is still shown - see the image-group loop below.
   */
  href: string | null;
  images: TimelineImageRef[];
}

/**
 * Public projects, fetched once per request.
 *
 * Deliberately NOT filtered by year: a project dated 2025 can own assets dated
 * 2026 (images filed later, or a release that spans a new year). Filtering the
 * project list by year would orphan those assets - the grouping step drops any
 * asset whose project is missing. 171 rows sit far below the 1000-row ceiling,
 * so reading them whole is both safe and cheaper than a second query per year.
 *
 * The query (and its public-visibility rule) lives in lib/data/projects.ts;
 * the repository answers null on a read failure, which this module keeps
 * logging as a failure rather than as an empty archive.
 */
const loadPublicProjects = cache(async (): Promise<TimelineProjectRow[]> => {
  const { getSupabasePublic } = await import('@/lib/data/client');
  const rows = await listPublicTimelineProjects(getSupabasePublic());

  if (!rows) {
    console.error('[CHRONICLE] Failed to fetch public projects');
    return [];
  }
  return rows;
});

/**
 * Every dated asset of the given projects for one year, read in full.
 *
 * The id-cursored walk (and its page size) lives in lib/data/gallery-assets.ts
 * - see listTimelineAssetsForYear for why it is year-scoped and id-cursored.
 * Returns null when a page fails, so the caller can distinguish "no assets"
 * from "the query broke" - the old code returned [] for both, which turned a
 * failed read into a silently empty timeline.
 */
async function loadAssetsForYear(
  projectIds: string[],
  year: string | undefined
): Promise<TimelineAssetRow[] | null> {
  const { getSupabasePublic } = await import('@/lib/data/client');
  const walk = await listTimelineAssetsForYear(getSupabasePublic(), projectIds, year);

  if (!walk) {
    console.error('[CHRONICLE] Failed to fetch public assets');
    return null;
  }

  if (walk.truncated) {
    console.error(
      `[CHRONICLE] Asset walk hit MAX_ASSET_PAGES (${TIMELINE_ASSET_MAX_PAGES}) for year ${year ?? 'all'}; collecting fewer rows than exist`
    );
  }

  return walk.rows;
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
  const { getSupabasePublic } = await import('@/lib/data/client');
  const supabase = getSupabasePublic();

  const years = new Set<string>();
  const projects = await loadPublicProjects();

  // Project events: 171 rows, cheap to fold in whole.
  for (const p of projects) {
    if (isThemeProject(p as { project_kind?: unknown })) continue;
    const date = p.event_date || p.release_date;
    if (date) years.add(date.slice(0, 4));
  }

  // Asset event dates define the span the year filter has to cover.
  const bounds = await getAssetEventDateBounds(supabase);
  const first = bounds.earliest;
  const last = bounds.latest;

  if (first && last) {
    const firstYear = Number(first.slice(0, 4));
    const lastYear = Number(last.slice(0, 4));

    // One HEAD count per year in the span, scoped to the public projects the
    // timeline reads. A year with no countable row is left out, so the filter
    // never offers a year that opens empty - counting the whole table did:
    // 2023 held one picture filed under a subject folder, and the year opened
    // on the empty state while the filter kept advertising it.
    const publicIds = projects.map((p) => p.id);
    const counts = await Promise.all(
      Array.from({ length: Math.max(0, lastYear - firstYear + 1) }, (_, offset) => {
        const year = String(firstYear + offset);
        return countAssetsInYear(supabase, year, publicIds).then((count) => ({ year, count }));
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

  const { loadSeriesSlugMap } = await import('@/lib/series-slugs');
  const { entryPath } = await import('@/lib/entry-path');
  const seriesSlugs = await loadSeriesSlugMap();

  const inYear = (date: string) => !year || date.slice(0, 4) === year;

  // One slot per (project, day). The project's own date opens the slot; the
  // picture group with the same key fills its images in, one entry survives.
  const byKey = new Map<string, ChronicleEvent>();
  const keyOf = (projectId: string, date: string) => `${projectId}|${date}`;

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
    // A dated record whose hall has no page still contributes its pictures:
    // the asset loop below opens the day's card without this one.
    if (!href) continue;
    byKey.set(keyOf(p.id, date), {
      id: `project-${p.id}`,
      date,
      projectId: p.id,
      title: p.title,
      titleI18n: normalizeLocalizedText(p.title_i18n, p.title),
      category: p.category,
      href,
      images: [],
    });
  }

  // 2. Image groups for those projects (assets are always project-linked:
  //    verified 0 rows with NULL project_id). Each group joins the slot its
  //    own (project, event_date) opens - the project card keeps its pictures.
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
    const key = keyOf(a.project_id, a.event_date);
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

    // Same day as the project's own record: the pictures belong to that card.
    const existing = byKey.get(key);
    if (existing) {
      existing.images = images;
      continue;
    }

    // Pictures dated apart from the project's record - a separate day, so a
    // separate card. A theme project (no date of its own) lands here too.
    //
    // The card is kept whether or not the project answers at a public address.
    // The three legacy halls (behind the scenes, personal travel, early
    // archive) have no page, and neither does a subject folder like "Daily" -
    // it is a subject, not a happening. Dropping those groups is what emptied
    // 2023: the year filter counted the picture, the timeline threw it away,
    // and the year opened on an empty state. A picture with no page behind it
    // is still a dated record, so it gets a card that shows the pictures and
    // links nowhere.
    const href = entryPath(project as never, seriesSlugs);
    byKey.set(key, {
      id: `assets-${projectId}-${date}`,
      date,
      projectId,
      title: project.title,
      titleI18n: normalizeLocalizedText(project.title_i18n, project.title),
      category: project.category,
      href,
      images,
    });
  }

  // Newest first; within one day the slot with pictures leads, so a day that
  // holds both a record and a picture set opens on the pictures.
  return Array.from(byKey.values()).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.images.length !== b.images.length) return b.images.length - a.images.length;
    return a.id.localeCompare(b.id);
  });
}
