import {
  SUBTYPES_BY_CATEGORY,
  categoryDefinition,
  categoryHref,
  subtypeSegment,
  type ProjectCategory,
} from './category-registry.ts';
import type { TranslationKey } from './languages.ts';

/**
 * The curation tree, assembled from rows.
 *
 * Split from the loader so the shape can be tested without a database: the
 * page has to be right about which shelf an entry belongs to, and that is
 * pure arithmetic over the registry, not a query.
 */

export interface CurationEvent {
  id: string;
  title: string;
  /** date used for ordering; null when the row has no date yet */
  date: string | null;
  imageCount: number;
  cover: string | null;
  /** true when the cover was chosen, false when it fell back to the first page */
  pinned: boolean;
  galleryHref: string;
}

export interface CurationShelf {
  /** stable key for the tree: the path, or the series id */
  key: string;
  /** a series title, or the fallback when there is no translation key */
  label: string;
  /** site dictionary key for a sub-class / category shelf */
  labelKey: TranslationKey | null;
  /** the shelf's address on the site; null for series and the unfiled bucket */
  path: string | null;
  count: number;
  cover: string | null;
  pinned: boolean;
  events: CurationEvent[];
}

export type CurationCoverSlot =
  | { kind: 'portal'; value: ProjectCategory }
  | { kind: 'interview'; value: string }
  | null;

export interface CurationDoor {
  /** category value, or `talks` for the shared door */
  key: string;
  href: string;
  labelKey: TranslationKey;
  coverSlot: CurationCoverSlot;
  cover: string | null;
  pinned: boolean;
  /** heading for the level below: 剧集 / 分类 / 事件 */
  shelfLabel: string;
  shelves: CurationShelf[];
  /** doors whose second level is the entry itself (magazine, brand) */
  events: CurationEvent[];
}

export interface CurationRow {
  id: string;
  slug: string | null;
  title: string;
  category: string | null;
  subtype: string | null;
  project_kind: string | null;
  work_id: string | null;
  event_date: string | null;
  release_date: string | null;
  cover_url: string | null;
}

export interface CurationAsset {
  id: string;
  project_id: string | null;
  image_url: string;
  catalog_id: string | null;
  portal_slot: string | null;
  interview_slot: string | null;
}

export interface CurationInput {
  rows: CurationRow[];
  assets: CurationAsset[];
  /** pinned shelf cover per path */
  shelfCovers: Map<string, string>;
  /** project_kind = 'theme' rows for the features door (not a category) */
  themeRows?: CurationRow[];
}

const SHELVED: Array<ProjectCategory | 'talks'> = [
  'drama_work',
  'editorial',
  'live_event',
  'public_appearance',
  'commercial',
  'talks',
  'live_stream',
];

const DOOR_LABEL_KEYS: Record<string, TranslationKey> = {
  drama_work: 'dramas.title',
  editorial: 'editorial.title',
  live_event: 'category.liveEvent',
  public_appearance: 'category.publicAppearance',
  commercial: 'category.commercial',
  talks: 'talks.title',
  live_stream: 'live.title',
};

function newestFirst(a: CurationRow, b: CurationRow): number {
  const left = a.event_date ?? a.release_date ?? '';
  const right = b.event_date ?? b.release_date ?? '';
  if (left !== right) return left < right ? 1 : -1;
  return a.title.localeCompare(b.title);
}

export function assembleCurationTree({
  rows,
  assets,
  shelfCovers,
  themeRows,
}: CurationInput): CurationDoor[] {
  // One pass over the assets: count per project, the first page (the automatic
  // cover), and the pinned door covers.
  const countByProject = new Map<string, number>();
  const firstByProject = new Map<string, string>();
  const portalCovers = new Map<string, string>();
  const interviewCovers = new Map<string, string>();

  for (const asset of [...assets].sort((a, b) =>
    (a.catalog_id ?? '').localeCompare(b.catalog_id ?? '')
  )) {
    if (asset.project_id) {
      countByProject.set(asset.project_id, (countByProject.get(asset.project_id) ?? 0) + 1);
      if (!firstByProject.has(asset.project_id)) {
        firstByProject.set(asset.project_id, asset.image_url);
      }
    }
    if (asset.portal_slot) portalCovers.set(asset.portal_slot, asset.image_url);
    if (asset.interview_slot) interviewCovers.set(asset.interview_slot, asset.image_url);
  }

  const toEvent = (row: CurationRow): CurationEvent => ({
    id: row.id,
    title: row.title,
    date: row.event_date ?? row.release_date ?? null,
    imageCount: countByProject.get(row.id) ?? 0,
    cover: row.cover_url ?? firstByProject.get(row.id) ?? null,
    pinned: Boolean(row.cover_url),
    galleryHref: `/admin/gallery?tab=all&projectId=${row.id}`,
  });

  const byCategory = new Map<string, CurationRow[]>();
  for (const row of rows) {
    const key = row.category ?? '';
    byCategory.set(key, [...(byCategory.get(key) ?? []), row]);
  }

  const makeShelf = (
    key: string,
    label: string,
    labelKey: TranslationKey | null,
    path: string | null,
    members: CurationRow[]
  ): CurationShelf => {
    const events = [...members].sort(newestFirst).map(toEvent);
    const pinned = path ? shelfCovers.get(path) ?? null : null;
    return {
      key,
      label,
      labelKey,
      path,
      count: events.length,
      cover: pinned ?? events.find((event) => event.cover)?.cover ?? null,
      pinned: Boolean(pinned),
      events,
    };
  };

  const doors: CurationDoor[] = [];

  for (const key of SHELVED) {
    if (key === 'talks') {
      const shelves = (['interview', 'variety', 'radio', 'press'] as const).map((category) =>
        makeShelf(
          `/talks/${category}`,
          category,
          categoryDefinition(category)?.labelKey ?? null,
          `/talks/${category}`,
          byCategory.get(category) ?? []
        )
      );
      if (!shelves.some((item) => item.count > 0)) continue;

      doors.push({
        key: 'talks',
        href: '/talks',
        labelKey: DOOR_LABEL_KEYS.talks,
        coverSlot: { kind: 'interview', value: 'talk' },
        cover: interviewCovers.get('talk') ?? null,
        pinned: interviewCovers.has('talk'),
        shelfLabel: '分类',
        shelves,
        events: [],
      });
      continue;
    }

    const category = key as ProjectCategory;
    const own = byCategory.get(category) ?? [];
    if (!own.length) continue;

    const door: CurationDoor = {
      key: category,
      href: categoryHref(category) ?? '',
      labelKey: DOOR_LABEL_KEYS[category],
      coverSlot:
        category === 'live_stream'
          ? { kind: 'interview', value: 'live' }
          : { kind: 'portal', value: category },
      cover:
        category === 'live_stream'
          ? interviewCovers.get('live') ?? null
          : portalCovers.get(category) ?? null,
      pinned:
        category === 'live_stream' ? interviewCovers.has('live') : portalCovers.has(category),
      shelfLabel: '事件',
      shelves: [],
      events: [],
    };

    if (category === 'drama_work') {
      // The second level is the series itself - a project row, so its cover is
      // its own cover_url, not a slot.
      const entries = own.filter((row) => row.project_kind !== 'series');
      door.shelfLabel = '剧集';
      door.shelves = own
        .filter((row) => row.project_kind === 'series')
        .sort(newestFirst)
        .map((row) => {
          const events = entries
            .filter((entry) => (row.work_id ? entry.work_id === row.work_id : false))
            .sort(newestFirst)
            .map(toEvent);
          return {
            key: row.id,
            label: row.title,
            labelKey: null,
            path: null,
            count: events.length,
            cover: row.cover_url ?? events.find((event) => event.cover)?.cover ?? null,
            pinned: Boolean(row.cover_url),
            events,
          };
        });
    } else if (category === 'editorial' || category === 'commercial') {
      door.events = [...own].sort(newestFirst).map(toEvent);
    } else {
      const definitions = SUBTYPES_BY_CATEGORY[category] ?? [];
      const known = new Set(definitions.map((definition) => String(definition.value)));
      const doorPath = categoryHref(category) ?? '';

      door.shelfLabel = '分类';
      door.shelves = definitions.map((definition) => {
        const segment = subtypeSegment(definition.value);
        const members = own.filter((row) => subtypeSegment(row.subtype ?? '') === segment);
        return makeShelf(
          `${doorPath}/${segment}`,
          segment,
          definition.labelKey,
          `${doorPath}/${segment}`,
          members
        );
      });

      // Rows filed outside the hall's own sub-classes still need a place here,
      // otherwise they would be invisible in the only screen that can fix them.
      const unfiled = own.filter((row) => !known.has(String(row.subtype ?? '')));
      if (unfiled.length) {
        door.shelves.push(
          makeShelf(`unfiled:${category}`, '未归类', null, null, unfiled)
        );
      }
    }

    doors.push(door);
  }

  // Features door (/features): special topics are project_kind = 'theme', not a
  // category, so they never arrive through DOOR_CATEGORIES. Each topic is its
  // own row and shows up as an event, so its cover is set the same way as any
  // other event - projects.cover_url - through the existing curation picker.
  const themeRowsForDoor = themeRows ?? [];
  if (themeRowsForDoor.length) {
    doors.push({
      key: 'features',
      href: '/features',
      labelKey: 'features.title',
      coverSlot: null,
      cover: null,
      pinned: false,
      shelfLabel: '专题',
      shelves: [],
      events: [...themeRowsForDoor].sort(newestFirst).map(toEvent),
    });
  }

  return doors;
}
