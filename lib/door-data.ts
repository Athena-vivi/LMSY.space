import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  SUBTYPES_BY_CATEGORY,
  UNFILED_SUBTYPE_SEGMENT,
  categoryDefinition,
  categoryHref,
  doorCategories,
  doorCategorySegment,
  doorEntryPath,
  subtypeSegment,
  type SubtypeDefinition,
} from '@/lib/category-registry';
import type { TranslationKey } from '@/lib/languages';
import { loadCategoryCovers, secondLevelsFor } from '@/lib/cover-slots';
import type { LocalizedText } from '@/lib/localized-content';
import type { ProjectCategory, ProjectSubtype } from '@/lib/supabase/types';
import {
  getProjectGroupMeta,
  getProjectTalkCoverPicks,
  listPublicDoorEntries,
} from '@/lib/data/projects';
import {
  countAssetsByProject,
  listEntryAssets,
  listEntryGroupAssets,
  listTalkCoverAssets,
  type DoorAssetRow,
} from '@/lib/data/gallery-assets';

export type { DoorAssetRow };

/**
 * Reading layer for every door that owns a page.
 *
 * Door 1 has its own loader inside /dramas because it groups by series. The
 * other halls group by sub-class - or, for /talks, by category - which is
 * what this module does. All of them read the same table through the same
 * visibility rule: there is no second list.
 *
 * A door is three levels, same as door 1:
 *
 *   /live-events                     every sub-class as one picture card
 *   /live-events/brand-event         the entries filed under that sub-class
 *   /live-events/brand-event/<slug>  one entry: the picture wall
 *
 *   /talks                           one card per category (2026-10-21)
 *   /talks/interview                 the conversations of that kind
 *   /talks/interview/<slug>          one conversation
 *
 * Server-rendered on purpose: these pages are the crawl surface for the
 * entries underneath them, so the list cannot sit behind a client fetch.
 *
 * The queries live in lib/data (projects / gallery-assets repositories); this
 * module keeps the grouping, filtering and ordering of each door.
 */

export interface DoorEntryRow {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  description: string | null;
  description_i18n: LocalizedText | null;
  /** The hall the row belongs to; a shared door holds several. */
  category: ProjectCategory | null;
  subtype: ProjectSubtype | null;
  event_date: string | null;
  release_date: string | null;
  cover_url: string | null;
  watch_url: string | null;
  project_kind: string | null;
  /** Talks door: per-platform video links; the shelf renders one box each. */
  video_url_bilibili: string | null;
  video_url_youtube: string | null;
  /** Talks door: the transcript the curator pasted in (markdown). */
  interview_md: string | null;
  /** Pictures filed under this entry, counted in one extra query. */
  imageCount: number;
  /**
   * The entry's own address. Computed on the server so the link and the route
   * cannot disagree: this page is the only place that knows the hall's
   * second level.
   */
  href: string;
}

export interface DoorCategoryRow {
  /** Sub-class value, or the unfiled bucket. Used as the URL segment. */
  key: string;
  /** Null for the unfiled bucket, which has its own label. */
  labelKey: TranslationKey | null;
  count: number;
  /** Cover of the most recent entry that has one. Null keeps the frame. */
  cover: string | null;
  latestDate: string | null;
  href: string;
}

/** One picture class inside an entry, for the level-2 timeline boxes. */
export interface DoorEntryGroup {
  /** The stored asset_group value; null is the unfiled bucket. */
  key: string | null;
  count: number;
  /** First picture of the class (upload order) as the box cover. */
  cover: string | null;
}

/** Newest first: a hall reads as a history, so the latest thing is on top. */
export async function loadRows(categories: readonly ProjectCategory[]): Promise<DoorEntryRow[]> {
  if (categories.length === 0) return [];

  const db = getSupabaseAdmin();
  const rows = (await listPublicDoorEntries(db, categories)) as unknown as Omit<
    DoorEntryRow,
    'imageCount' | 'href'
  >[];
  const ids = rows.map((row) => row.id);

  // One query for every count. A hall with 46 entries should not fire 46
  // round-trips just to print "8 images" on a card.
  const counts = await countAssetsByProject(db, ids);

  return rows.map((row) => ({
    ...row,
    imageCount: counts[row.id] ?? 0,
    href: doorEntryPath(row) ?? '/gallery',
  }));
}

function doorSubtypes(category: ProjectCategory): SubtypeDefinition[] {
  return SUBTYPES_BY_CATEGORY[category] ?? [];
}

/** True when the hall's second level is a sub-class, not the entry itself. */
export function doorHasCategories(category: ProjectCategory): boolean {
  return doorSubtypes(category).length > 0;
}

function segmentOfSubtype(subtype: ProjectSubtype | null | undefined, category: ProjectCategory): string {
  const definitions = doorSubtypes(category);
  if (subtype && definitions.some((definition) => definition.value === subtype)) {
    return subtypeSegment(subtype);
  }
  return UNFILED_SUBTYPE_SEGMENT;
}

/** The address of a hall's second level. */
export function categoryPath(category: ProjectCategory, key: string): string {
  const door = categoryHref(category);
  return door ? `${door}/${key}` : '/gallery';
}

/**
 * The second level of a door: one card per sub-class, in the curated order,
 * keeping the frame for a sub-class that has no picture yet. The unfiled
 * bucket only appears when the hall really holds rows outside its own
 * sub-classes - it is a way to reach them, not a permanent empty shelf.
 */
export async function loadDoorCategories(category: ProjectCategory): Promise<DoorCategoryRow[]> {
  const rows = await loadRows([category]);
  const definitions = doorSubtypes(category);
  const door = categoryHref(category);

  // A shelf's cover can be pinned from the curation page. Pinned wins; the
  // first covered entry is only the fallback it always was.
  const pinnedByPath = await loadCategoryCovers(
    secondLevelsFor(category).map((level) => level.path)
  );
  const pinnedCover = (segment: string) =>
    (door ? pinnedByPath.get(`${door}/${segment}`)?.imageUrl : null) ?? null;

  const cards: DoorCategoryRow[] = definitions.map((definition) => {
    const own = rows.filter((row) => row.subtype === definition.value);
    const covered = own.find((row) => Boolean(row.cover_url));
    return {
      key: definition.value,
      labelKey: definition.labelKey,
      count: own.length,
      cover: pinnedCover(subtypeSegment(definition.value)) ?? covered?.cover_url ?? null,
      latestDate: own.find((row) => Boolean(row.event_date))?.event_date ?? null,
      href: categoryPath(category, subtypeSegment(definition.value)),
    };
  });

  const unfiled = rows.filter(
    (row) => !row.subtype || !definitions.some((definition) => definition.value === row.subtype)
  );

  if (unfiled.length > 0) {
    const covered = unfiled.find((row) => Boolean(row.cover_url));
    cards.push({
      key: UNFILED_SUBTYPE_SEGMENT,
      labelKey: null,
      count: unfiled.length,
      cover: covered?.cover_url ?? null,
      latestDate: unfiled.find((row) => Boolean(row.event_date))?.event_date ?? null,
      href: categoryPath(category, UNFILED_SUBTYPE_SEGMENT),
    });
  }

  return cards;
}

/**
 * Level 1 of a door whose shelves are whole categories (/talks).
 *
 * Same card, same frame, same "collecting" placeholder: the difference is only
 * where the count comes from. Every category gets a card even while it is
 * empty - a door is a promise that the shelf exists, not a report on what has
 * been filed so far.
 */
export async function loadGroupCategories(
  categories: readonly ProjectCategory[]
): Promise<DoorCategoryRow[]> {
  const rows = await loadRows(categories);
  const pinnedByPath = await loadCategoryCovers(
    categories.flatMap((category) => secondLevelsFor(category).map((level) => level.path))
  );

  return categories.map((category) => {
    const own = rows.filter((row) => row.category === category);
    const covered = own.find((row) => Boolean(row.cover_url));
    const door = categoryHref(category);
    const pinned = door ? pinnedByPath.get(`${door}/${category}`)?.imageUrl ?? null : null;
    return {
      key: category,
      labelKey: categoryDefinition(category)?.labelKey ?? null,
      count: own.length,
      cover: pinned ?? covered?.cover_url ?? null,
      latestDate: own.find((row) => Boolean(row.event_date))?.event_date ?? null,
      href: categoryPath(category, doorCategorySegment(category) ?? category),
    };
  });
}

/** True when the door has categories as its second level (/talks). */
export function doorGroupsCategories(door: string): boolean {
  return doorCategories(door).length > 0;
}

/** Every visible entry of a hall, newest first. One level down from the door. */
export async function loadDoorEntries(category: ProjectCategory): Promise<DoorEntryRow[]> {
  return loadRows([category]);
}

/**
 * Entries of one second-level segment. `segment` is the URL form (`brand-event`
 * or `unfiled`). A segment the hall does not define returns an empty list, so
 * the route can answer 404 instead of showing a filtered copy of another
 * shelf.
 */
export async function loadSegmentEntries(
  category: ProjectCategory,
  segment: string
): Promise<DoorEntryRow[] | null> {
  const rows = await loadRows([category]);
  const definitions = doorSubtypes(category);

  if (segment === UNFILED_SUBTYPE_SEGMENT) {
    const unfiled = rows.filter(
      (row) => !row.subtype || !definitions.some((definition) => definition.value === row.subtype)
    );
    // A hall whose rows are all filed has no unfiled shelf at all.
    return unfiled.length > 0 ? unfiled : null;
  }

  const wanted = segment.replace(/-/g, '_');
  const definition = definitions.find((item) => item.value === wanted);
  if (!definition) return null;

  return rows.filter((row) => row.subtype === definition.value);
}

/**
 * One entry, resolved through its own address. The segment must match the row
 * for a hall that has sub-classes, otherwise the same entry would answer on
 * two shelves.
 */
export async function loadEntry(
  category: ProjectCategory,
  key: string,
  segment?: string
): Promise<{ entry: DoorEntryRow; assets: DoorAssetRow[] } | null> {
  const rows = await loadRows([category]);
  const entry = rows.find((row) => (row.slug || row.id) === key);
  if (!entry) return null;

  if (doorHasCategories(category)) {
    if (!segment) return null;
    if (segmentOfSubtype(entry.subtype, category) !== segment) return null;
  }

  const db = getSupabaseAdmin();
  const assets = await listEntryAssets(db, entry.id);

  return { entry, assets };
}

/**
 * Picture classes for every entry of one second-level segment, in one query.
 *
 * The level-2 timeline renders each entry's pictures as class boxes (airport
 * official / airport fan / rehearsal / show ...), so the shelf needs every
 * class with a count and a cover - not the full asset list. Returns a map
 * keyed by entry id; an entry with no pictures maps to an empty array.
 */
export async function loadSegmentEntryGroups(
  category: ProjectCategory,
  segment: string
): Promise<Map<string, DoorEntryGroup[]>> {
  const entries = await loadSegmentEntries(category, segment);
  return buildEntryGroups(entries ?? []);
}

/**
 * Same group map for a whole category with no sub-class filter - the talks
 * door's shelves ARE categories (`/talks/radio`), so the segment filter that
 * loadSegmentEntryGroups applies would find nothing.
 */
export async function loadCategoryEntryGroups(
  category: ProjectCategory
): Promise<Map<string, DoorEntryGroup[]>> {
  const entries = await loadRows([category]);
  return buildEntryGroups(entries);
}

/** The four talk resource boxes a curator can pin a picture to. */
export type TalkResourceSlot = 'bilibili' | 'youtube' | 'photos' | 'transcript';
/** entry id -> resolved image URL per resource box (only pinned slots set). */
export type TalkResourceCovers = Partial<Record<TalkResourceSlot, string>>;

/**
 * Resolved resource-box covers for every talk entry of one category, in one
 * pair of queries - the talks timeline pins each box (Bilibili / YouTube /
 * photos / transcript) to a curator-picked picture via
 * projects.talk_resource_covers ({ slot: assetCatalogId }). An entry with no
 * picks maps to an empty object; the timeline then falls back to its
 * first-picture default per box.
 */
export async function loadTalkResourceCovers(
  category: ProjectCategory
): Promise<Map<string, TalkResourceCovers>> {
  const map = new Map<string, TalkResourceCovers>();
  const entries = await loadRows([category]);
  if (entries.length === 0) return map;

  const ids = entries.map((entry) => entry.id);
  const db = getSupabaseAdmin();
  const projectRows = await getProjectTalkCoverPicks(db, ids);

  // slot -> picked catalog id, per entry.
  const picks = new Map<string, Map<TalkResourceSlot, string>>();
  for (const row of projectRows as Array<{
    id: string;
    talk_resource_covers: unknown;
  }>) {
    if (!row.talk_resource_covers || typeof row.talk_resource_covers !== 'object') continue;
    const slotMap = new Map<TalkResourceSlot, string>();
    for (const [slot, value] of Object.entries(
      row.talk_resource_covers as Record<string, unknown>
    )) {
      if (
        slot === 'bilibili' ||
        slot === 'youtube' ||
        slot === 'photos' ||
        slot === 'transcript'
      ) {
        if (typeof value === 'string' && value.length > 0) slotMap.set(slot, value);
      }
    }
    if (slotMap.size > 0) picks.set(row.id, slotMap);
  }
  if (picks.size === 0) return map;

  // Resolve every picked catalog id to its image URL for its project.
  const assets = await listTalkCoverAssets(db, [...picks.keys()]);

  for (const asset of assets) {
    if (!asset.project_id || !asset.catalog_id || !asset.image_url) continue;
    const slotMap = picks.get(asset.project_id);
    if (!slotMap) continue;
    for (const [slot, catalogId] of slotMap) {
      if (asset.catalog_id === catalogId) {
        map.set(asset.project_id, { ...map.get(asset.project_id), [slot]: asset.image_url });
      }
    }
  }

  return map;
}

async function buildEntryGroups(entries: DoorEntryRow[]): Promise<Map<string, DoorEntryGroup[]>> {
  const map = new Map<string, DoorEntryGroup[]>();
  if (entries.length === 0) return map;

  for (const entry of entries) map.set(entry.id, []);

  // A curated entry can pre-declare its classes (projects.asset_groups, an
  // ordered jsonb array of names). Declared classes keep the curator's order
  // and are appended with any undeclared ones found on actual assets; empty
  // declarations are dropped at the end (a box shows only once it has
  // pictures). asset_group_covers: curator-picked cover per class
  // ({ class: catalogId }); a picked cover wins over "first picture".
  const db = getSupabaseAdmin();
  const ids = entries.map((entry) => entry.id);
  const projectRows = await getProjectGroupMeta(db, ids);

  const declared = new Map<string, string[]>();
  const pickedCovers = new Map<string, Map<string, string>>();
  for (const row of projectRows as Array<{
    id: string;
    asset_groups: unknown;
    asset_group_covers: unknown;
  }>) {
    const list = Array.isArray(row.asset_groups)
      ? (row.asset_groups as unknown[]).filter(
          (name): name is string => typeof name === 'string' && name.length > 0
        )
      : [];
    if (list.length > 0) declared.set(row.id, list);
    if (row.asset_group_covers && typeof row.asset_group_covers === 'object') {
      const covers = new Map<string, string>();
      for (const [name, value] of Object.entries(row.asset_group_covers as Record<string, unknown>)) {
        if (typeof value === 'string' && value.length > 0) covers.set(name, value);
      }
      if (covers.size > 0) pickedCovers.set(row.id, covers);
    }
    for (const name of list) {
      map.set(row.id, [
        ...(map.get(row.id) ?? []),
        { key: name, count: 0, cover: null },
      ]);
    }
  }

  // PostgREST returns at most 1000 rows per request (Supabase's default
  // max-rows), and this shelf is already past it: fan meetings alone hold
  // 1200+ pictures. The repository walks the window in pages; `id` is the
  // tiebreaker so pages cannot overlap (2026-10-23: a single `.in(...)` left
  // the newest fan-meeting rows looking picture-less).
  const assets = await listEntryGroupAssets(db, ids);

  for (const asset of assets) {
    if (!asset.project_id || !map.has(asset.project_id)) continue;
    const groups = map.get(asset.project_id)!;
    let group = groups.find((item) => item.key === asset.asset_group);
    if (!group) {
      group = { key: asset.asset_group, count: 0, cover: null };
      groups.push(group);
    }
    group.count += 1;
    if (!group.cover && asset.image_url) group.cover = asset.image_url;
    // A curator-picked cover (by catalog_id) replaces the first-picture
    // default as soon as that picture is seen.
    const pick = pickedCovers.get(asset.project_id)?.get(asset.asset_group ?? '');
    if (pick && asset.catalog_id === pick && asset.image_url) {
      group.cover = asset.image_url;
    }
  }

  // Empty boxes never render (2026-10-22 curator call): a declared class
  // with no pictures yet, or the pre-declared placeholder of an event whose
  // pictures all live elsewhere, stays hidden until it has content - same
  // behaviour as an undeclared class, which only ever appears with assets.
  for (const [id, groups] of map) {
    const filled = groups.filter((group) => group.count > 0);
    if (filled.length !== groups.length) map.set(id, filled);
  }

  return map;
}
