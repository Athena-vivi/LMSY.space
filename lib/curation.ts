import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { loadCategoryCovers, secondLevelsFor } from './cover-slots';
import {
  assembleCurationTree,
  type CurationAsset,
  type CurationDoor,
  type CurationRow,
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
 */

const VISIBLE_SELECT =
  'id, slug, title, category, subtype, project_kind, work_id, event_date, release_date, cover_url';

const DOOR_CATEGORIES = [
  'drama_work',
  'editorial',
  'live_event',
  'public_appearance',
  'commercial',
  'interview',
  'variety',
  'radio',
  'live_stream',
];

export async function loadCurationTree(): Promise<CurationDoor[]> {
  const supabaseAdmin = getSupabaseAdmin();

  const [{ data: projectData }, { data: assetData }] = await Promise.all([
    applyPublicProjectFilter(
      supabaseAdmin.schema('lmsy_archive').from('projects').select(VISIBLE_SELECT)
    ).in('category', DOOR_CATEGORIES),
    supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id, project_id, image_url, catalog_id, portal_slot, interview_slot'),
  ]);

  const paths = DOOR_CATEGORIES.flatMap((category) =>
    secondLevelsFor(category as ProjectCategory).map((level) => level.path)
  );

  const covers = await loadCategoryCovers(paths);
  const shelfCovers = new Map<string, string>();
  for (const [path, cover] of covers) shelfCovers.set(path, cover.imageUrl);

  return assembleCurationTree({
    rows: (projectData ?? []) as unknown as CurationRow[],
    assets: (assetData ?? []) as unknown as CurationAsset[],
    shelfCovers,
  });
}
