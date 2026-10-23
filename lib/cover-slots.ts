import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { listCategorySlotCovers } from '@/lib/data/gallery-assets';
import {
  PROJECT_CATEGORIES,
  categoryHref,
  doorCategories,
  subtypeSegment,
  SUBTYPES_BY_CATEGORY,
  type ProjectCategory,
} from './category-registry';

/**
 * Covers of a door's second level.
 *
 * Three levels of cover now exist, and each one is pinned in a different place:
 *
 *   door      gallery_assets.portal_slot    (five homepage entries)
 *             gallery_assets.interview_slot (the two soul-resonance halls)
 *   category  gallery_assets.category_slot   <- this module
 *   event     projects.cover_url
 *
 * A category is addressed by its **path**, not by its category value, because
 * the same category can sit under two doors: `interview` is only reachable at
 * `/talks/interview`. Storing the path keeps the slot and the visitor's address
 * the same string, and there is exactly one slot per shelf.
 *
 * Drama is the exception by design: its second level is the series itself, a
 * `projects` row, so its cover is that row's `cover_url` and no slot is needed.
 */

export interface SecondLevel {
  /** e.g. `/live-events/fanmeeting` - the exact address of the shelf */
  path: string;
  category: ProjectCategory;
}

export interface SlotCover {
  id: string;
  imageUrl: string;
  blurData: string | null;
}

/**
 * Halls whose second level is not a sub-class or a category:
 *   drama_work  -> the series (projects rows)
 *   editorial   -> the issue (the row itself)
 *   commercial  -> the project (the row itself)
 * plus the three deprecated halls, which have no door at all.
 */
const NO_SHELF_LEVEL: ReadonlySet<ProjectCategory> = new Set<ProjectCategory>([
  'drama_work',
  'editorial',
  'commercial',
  'behind_the_scenes',
  'personal_travel',
  'early_archive',
]);

/** The shelves of one hall, in the order the door renders them. */
export function secondLevelsFor(category: ProjectCategory): SecondLevel[] {
  if (NO_SHELF_LEVEL.has(category)) return [];

  const door = categoryHref(category);
  if (!door) return [];

  // /talks: the category itself is the second level.
  if (doorCategories(door).includes(category)) {
    return [{ path: `${door}/${category}`, category }];
  }

  // /live-events, /appearances, /live: one shelf per sub-class.
  const subtypes = SUBTYPES_BY_CATEGORY[category] ?? [];
  return subtypes.map((definition) => ({
    path: `${door}/${subtypeSegment(definition.value)}`,
    category,
  }));
}

/** Every shelf in the archive, in door order. */
export function secondLevels(): SecondLevel[] {
  return PROJECT_CATEGORIES.flatMap((category) => secondLevelsFor(category));
}

/** True for a path that really is a shelf - the only values a slot may hold. */
export function isSecondLevelPath(path: string): boolean {
  return secondLevels().some((level) => level.path === path);
}

/**
 * Pinned covers, keyed by shelf path. A path with no row is a shelf that is
 * still on automatic: the door falls back to the first covered entry.
 */
export async function loadCategoryCovers(
  paths: readonly string[]
): Promise<Map<string, SlotCover>> {
  const map = new Map<string, SlotCover>();
  if (paths.length === 0) return map;

  const rows = await listCategorySlotCovers(getSupabaseAdmin(), paths);

  for (const row of rows) {
    if (!row.category_slot) continue;
    map.set(row.category_slot, {
      id: row.id,
      imageUrl: row.image_url,
      blurData: row.blur_data ?? null,
    });
  }

  return map;
}
