import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import {
  SUBTYPES_BY_CATEGORY,
  UNFILED_SUBTYPE_SEGMENT,
  categoryHref,
  subtypeSegment,
  type SubtypeDefinition,
} from '@/lib/category-registry';
import type { TranslationKey } from '@/lib/languages';
import type { LocalizedText } from '@/lib/localized-content';
import type { ProjectCategory, ProjectSubtype } from '@/lib/supabase/types';

/**
 * Reading layer for the doors that own a page (homepage entries 2-5).
 *
 * Door 1 has its own loader inside /dramas because it groups by series; the
 * other halls group by sub-class, which is what this module does. Both read
 * the same table through the same visibility rule - there is no second list.
 *
 * A door is three levels, same as door 1:
 *
 *   /live-events                     every sub-class as one picture card
 *   /live-events/brand-event         the entries filed under that sub-class
 *   /live-events/brand-event/<slug>  one entry: the picture wall
 *
 * Server-rendered on purpose: these pages are the crawl surface for the
 * entries underneath them, so the list cannot sit behind a client fetch.
 */

const ENTRY_COLUMNS =
  'id, slug, title, title_i18n, description, description_i18n, subtype, event_date, release_date, cover_url, watch_url, project_kind';

export interface DoorEntryRow {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  description: string | null;
  description_i18n: LocalizedText | null;
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
}

/** Newest first: a hall reads as a history, so the latest thing is on top. */
async function loadRows(category: ProjectCategory): Promise<DoorEntryRow[]> {
  const { data, error } = await applyPublicProjectFilter(
    getSupabaseAdmin().schema('lmsy_archive').from('projects').select(ENTRY_COLUMNS)
  )
    .eq('category', category)
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
    href: entryPath(category, row),
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

/** The address of one entry: the only address it has. */
export function entryPath(
  category: ProjectCategory,
  entry: { id: string; slug: string | null; subtype: ProjectSubtype | null }
): string {
  const slug = entry.slug || entry.id;
  const door = categoryHref(category);
  if (!doorHasCategories(category)) return `${door}/${slug}`;
  return `${door}/${segmentOfSubtype(entry.subtype, category)}/${slug}`;
}

/** The address of a hall's second level. */
export function categoryPath(category: ProjectCategory, key: string): string {
  return `${categoryHref(category)}/${key}`;
}

/**
 * The second level of a door: one card per sub-class, in the curated order,
 * keeping the frame for a sub-class that has no picture yet. The unfiled
 * bucket only appears when the hall really holds rows outside its own
 * sub-classes - it is a way to reach them, not a permanent empty shelf.
 */
export async function loadDoorCategories(category: ProjectCategory): Promise<DoorCategoryRow[]> {
  const rows = await loadRows(category);
  const definitions = doorSubtypes(category);

  const cards: DoorCategoryRow[] = definitions.map((definition) => {
    const own = rows.filter((row) => row.subtype === definition.value);
    const covered = own.find((row) => Boolean(row.cover_url));
    return {
      key: definition.value,
      labelKey: definition.labelKey,
      count: own.length,
      cover: covered?.cover_url ?? null,
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

/** Every visible entry of a hall, newest first. One level down from the door. */
export async function loadDoorEntries(category: ProjectCategory): Promise<DoorEntryRow[]> {
  return loadRows(category);
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
  const rows = await loadRows(category);
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
  const rows = await loadRows(category);
  const entry = rows.find((row) => (row.slug || row.id) === key);
  if (!entry) return null;

  if (doorHasCategories(category)) {
    if (!segment) return null;
    if (segmentOfSubtype(entry.subtype, category) !== segment) return null;
  }

  const { data: assets } = await getSupabaseAdmin()
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, caption, catalog_id, rotation')
    .eq('project_id', entry.id)
    .order('created_at', { ascending: true });

  return { entry, assets: (assets ?? []) as unknown as DoorAssetRow[] };
}
