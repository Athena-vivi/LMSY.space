import { getSupabasePublic } from './client.ts';
import { listPublicProjectIds } from './projects.ts';
import { applyPublicProjectFilter } from '../project-visibility.ts';

/**
 * The two numbers on the splash door plaque.
 *
 * They are the homepage's own claim about itself ("this is what is behind this
 * door"), so they have to be the same numbers a visitor can actually reach:
 *
 *   events - the projects that pass `applyPublicProjectFilter`, i.e. exactly
 *            the rows the doors and the timeline list. Ingestion containers and
 *            unpublished batches are not content and are not counted.
 *   images - gallery_assets attached to those same projects, which is verbatim
 *            what the gallery page queries (`.in('project_id', publicIds)`).
 *
 * Counting, not listing: `count: 'exact', head: true` makes PostgREST answer
 * with a count and no rows, so the 1000-row response cap that has bitten the
 * data layer before cannot silently truncate these.
 *
 * Never throws. A missing or failed count answers 0, and the splash falls back
 * to its plain line rather than printing "0 events".
 */
export interface ArchiveCounts {
  events: number;
  images: number;
}

export const EMPTY_ARCHIVE_COUNTS: ArchiveCounts = { events: 0, images: 0 };

export async function getPublicArchiveCounts(): Promise<ArchiveCounts> {
  try {
    const db = getSupabasePublic();

    // The gallery's own rule needs the ids, so this is one extra small read;
    // the projects table is a few dozen rows, not an archive of rows.
    const projectIds = await listPublicProjectIds(db);

    const eventsQuery = applyPublicProjectFilter(
      db.schema('lmsy_archive').from('projects').select('id', { count: 'exact', head: true })
    );

    const imagesQuery =
      projectIds.length > 0
        ? db
            .schema('lmsy_archive')
            .from('gallery_assets')
            .select('id', { count: 'exact', head: true })
            .in('project_id', projectIds)
        : null;

    const [events, images] = await Promise.all([eventsQuery, imagesQuery]);

    return {
      events: events.error ? 0 : (events.count ?? 0),
      images: images && !images.error ? (images.count ?? 0) : 0,
    };
  } catch (error) {
    console.error('[ARCHIVE_COUNTS] Failed to count the public archive:', error);
    return EMPTY_ARCHIVE_COUNTS;
  }
}
