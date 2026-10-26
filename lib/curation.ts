import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { loadCategoryCovers, secondLevelsFor } from './cover-slots';
import { listCurationAssets } from '@/lib/data/gallery-assets';
import { listCurationProjects } from '@/lib/data/projects';
import {
  assembleCurationTree,
  type CurationDoor,
} from './curation-assemble';
import type { ProjectCategory } from './category-registry';

export type {
  CurationDoor,
  CurationEvent,
  CurationShelf,
  CurationCoverSlot,
} from './curation-assemble';

/**
 * Reads the tree the admin curation page draws: door -> shelf -> event.
 *
 * Three cover levels, three different columns (portal_slot / interview_slot /
 * category_slot / projects.cover_url). This is the only reader that looks at
 * all of them together - the front end only ever needs its own level.
 *
 * Only what a visitor can reach is listed: rows go through the same visibility
 * rule as the doors, so a draft's cover is not counted as a cover.
 *
 * The two queries live in lib/data (projects / gallery-assets repositories);
 * this module keeps the category list, the cover levels and the assembly.
 */

const DOOR_CATEGORIES = [
  'drama_work',
  'editorial',
  'live_event',
  'public_appearance',
  'commercial',
  'interview',
  'variety',
  'radio',
  'press',
  'live_stream',
];

export async function loadCurationTree(): Promise<CurationDoor[]> {
  const supabaseAdmin = getSupabaseAdmin();

  const [projectData, assetData] = await Promise.all([
    listCurationProjects(supabaseAdmin, DOOR_CATEGORIES),
    listCurationAssets(supabaseAdmin),
  ]);

  const paths = DOOR_CATEGORIES.flatMap((category) =>
    secondLevelsFor(category as ProjectCategory).map((level) => level.path)
  );

  const covers = await loadCategoryCovers(supabaseAdmin, paths);
  const shelfCovers = new Map<string, string>();
  for (const [path, cover] of covers) shelfCovers.set(path, cover.imageUrl);

  return assembleCurationTree({
    rows: projectData,
    assets: assetData,
    shelfCovers,
  });
}
