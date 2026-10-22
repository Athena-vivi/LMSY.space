import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
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
 */

const ENTRY_COLUMNS =
  'id, slug, title, title_i18n, description, description_i18n, category, subtype, event_date, release_date, cover_url, watch_url, project_kind';

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

export interface DoorAssetRow {
  id: string;
  image_url: string;
  caption: string | null;
  catalog_id: string | null;
  rotation: number | null;
  /** Intrinsic size stamped at promotion time; null on historical rows. */
  width: number | null;
  height: number | null;
  /**
   * Curated picture class inside one entry (airport official / airport fan /
   * rehearsal / show ...). Null means unfiled, which the timeline shows as the
   * entry's single "all photos" box.
   */
  asset_group: string | null;
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
async function loadRows(categories: readonly ProjectCategory[]): Promise<DoorEntryRow[]> {
  if (categories.length === 0) return [];

  const { data, error } = await applyPublicProjectFilter(
    getSupabaseAdmin().schema('lmsy_archive').from('projects').select(ENTRY_COLUMNS)
  )
    .in('category', categories as unknown as string[])
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('release_date', { ascending: false, nullsFirst: false });

  if (error || !data) return [];

  const rows = data as unknown as Omit<DoorEntryRow, 'imageCount' | 'href'>[];
  const ids = rows.map((row) => row.id);

  // One query for every count. A hall with 46 entries should not fire 46
  // round-trips just to print "8 images" on a card.
  const counts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: assets } = await getSupabaseAdmin()
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('project_id')
      .in('project_id', ids);

    for (const asset of (assets ?? []) as Array<{ project_id: string | null }>) {
      if (!asset.project_id) continue;
      counts[asset.project_id] = (counts[asset.project_id] ?? 0) + 1;
    }
  }

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

  const { data: assets } = await getSupabaseAdmin()
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, caption, catalog_id, rotation, asset_group, width, height')
    .eq('project_id', entry.id)
    .order('created_at', { ascending: true });

  return { entry, assets: (assets ?? []) as unknown as DoorAssetRow[] };
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
  const map = new Map<string, DoorEntryGroup[]>();
  if (!entries || entries.length === 0) return map;

  for (const entry of entries) map.set(entry.id, []);

  // A curated entry can pre-declare its classes (projects.asset_groups, an
  // ordered jsonb array of names). Declared classes get their box even before
  // any picture is filed into them, in the curator's order; classes found on
  // actual assets but not declared are appended after.
  const { data: projectRows } = await getSupabaseAdmin()
    .schema('lmsy_archive')
    .from('projects')
    .select('id, asset_groups')
    .in(
      'id',
      entries.map((entry) => entry.id)
    );

  const declared = new Map<string, string[]>();
  for (const row of (projectRows ?? []) as Array<{
    id: string;
    asset_groups: unknown;
  }>) {
    const list = Array.isArray(row.asset_groups)
      ? (row.asset_groups as unknown[]).filter(
          (name): name is string => typeof name === 'string' && name.length > 0
        )
      : [];
    if (list.length > 0) declared.set(row.id, list);
    for (const name of list) {
      map.set(row.id, [
        ...(map.get(row.id) ?? []),
        { key: name, count: 0, cover: null },
      ]);
    }
  }

  const ids = entries.map((entry) => entry.id);
  const { data: assets } = await getSupabaseAdmin()
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('project_id, asset_group, image_url, created_at')
    .in('project_id', ids)
    .order('created_at', { ascending: true });

  for (const asset of (assets ?? []) as Array<{
    project_id: string | null;
    asset_group: string | null;
    image_url: string | null;
  }>) {
    if (!asset.project_id || !map.has(asset.project_id)) continue;
    const groups = map.get(asset.project_id)!;
    let group = groups.find((item) => item.key === asset.asset_group);
    if (!group) {
      group = { key: asset.asset_group, count: 0, cover: null };
      groups.push(group);
    }
    group.count += 1;
    if (!group.cover && asset.image_url) group.cover = asset.image_url;
  }

  // An entry whose classes are all declared and none of which has pictures
  // keeps its declared (empty) boxes; a declared class that also holds the
  // unfiled null bucket only shows once the null bucket has pictures.
  return map;
}
