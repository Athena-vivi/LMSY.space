/**
 * Where an event answers on the public site.
 *
 * 2026-10-21: the front end has no /projects namespace. `project` is an admin
 * concept (one folder of pictures that gets published), and the visitor never
 * sees that word in a URL. What a visitor opens is an *event*, and an event is
 * addressed by the door that owns it:
 *
 *   drama series      /dramas/<series>
 *   drama entry       /dramas/<series>/<entry>
 *   editorial issue   /editorial/<issue>
 *   live event        /live-events/<sub-class>/<entry>
 *   appearance        /appearances/<sub-class>/<entry>
 *   collaboration     /commercial/<entry>
 *
 * Two consequences worth knowing before editing:
 *
 *  - Door 1 is the only door whose address carries a second key (the series),
 *    and a row does not store its series slug - it stores `work_id`. Callers
 *    that list drama rows therefore pass a work_id -> series slug map. Without
 *    it the function returns null rather than inventing a URL that would 404.
 *  - The three legacy halls (behind the scenes, personal travel, early
 *    archive) have no page, so they have no address. Returning null is the
 *    honest answer: a caller then renders the row without a link instead of
 *    printing a dead one.
 *
 * Pure on purpose: the search API, the sitemap, the server pages and the
 * layout modules all compute the same string from the same rules.
 */

import { homeDoorEntryPath, normalizeCategory } from './category-registry.ts';

export interface EntryRef {
  id: string;
  category?: string | null;
  subtype?: string | null;
  slug?: string | null;
  project_kind?: string | null;
  work_id?: string | null;
}

/** work_id -> the slug of the series that owns that work. */
export type SeriesSlugMap = Map<string, string> | Record<string, string>;

function seriesSlugOf(map: SeriesSlugMap | undefined, workId: string | null | undefined): string | null {
  if (!map || !workId) return null;
  if (map instanceof Map) return map.get(workId) ?? null;
  return (map as Record<string, string>)[workId] ?? null;
}

/**
 * The public address of one event, or null when the row has no page.
 *
 * `seriesSlugs` is only consulted for door 1; every other door builds its own
 * path from the row itself.
 */
export function entryPath(row: EntryRef, seriesSlugs?: SeriesSlugMap): string | null {
  const category = normalizeCategory(row.category);
  if (!category) return null;

  const slug = row.slug || row.id;

  if (category === 'drama_work') {
    // A series is the shelf, not an entry: it is read at /dramas/<series>.
    if (row.project_kind === 'series') return `/dramas/${slug}`;

    const seriesSlug = seriesSlugOf(seriesSlugs, row.work_id);
    return seriesSlug ? `/dramas/${seriesSlug}/${slug}` : null;
  }

  return homeDoorEntryPath({ category, subtype: row.subtype, slug, id: row.id });
}

/**
 * Build the work_id -> series slug map from rows already in hand, so a caller
 * that has loaded the public project set never needs a second query.
 */
export function seriesSlugMapFrom(
  rows: Array<{ category?: string | null; project_kind?: string | null; work_id?: string | null; slug?: string | null; id: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.category !== 'drama_work' || row.project_kind !== 'series') continue;
    if (!row.work_id) continue;
    map.set(row.work_id, row.slug || row.id);
  }
  return map;
}
