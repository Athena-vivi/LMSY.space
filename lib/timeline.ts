/**
 * Chronicle timeline data source (phase-4 batch 2, Task 2).
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
 */
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { normalizeLocalizedText, type LocalizedText } from '@/lib/localized-content';
import { isThemeProject } from '@/lib/project-kind';

// Pure helpers live in an alias-free module so they are directly testable.
export { formatChronicleDate, extractYears } from '@/lib/chronicle-dates';

export interface TimelineImageRef {
  id: string;
  image_url: string;
  caption: string | null;
  caption_i18n: LocalizedText | null;
  catalog_id: string | null;
}

export type ChronicleEvent =
  | {
      kind: 'project';
      id: string;
      /** Raw ISO date (YYYY-MM-DD) from projects.release_date. */
      date: string;
      title: string;
      titleI18n: LocalizedText;
      category: string;
      href: string;
    }
  | {
      kind: 'images';
      id: string;
      /** Raw ISO date (YYYY-MM-DD) from gallery_assets.event_date. */
      date: string;
      projectId: string;
      projectTitle: string;
      projectTitleI18n: LocalizedText;
      href: string;
      images: TimelineImageRef[];
    };

/**
 * Resolve a row's public address, or drop the event.
 *
 * 2026-10-21: there is no /projects namespace any more. An event is read under
 * the door that owns it (lib/entry-path.ts), and a row whose hall has no page
 * has no address - a timeline card that cannot be opened reads as broken, so
 * the row is left out rather than rendered dead. No publicly visible row is in
 * that situation today.
 */

export async function getChronicleEvents(): Promise<ChronicleEvent[]> {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdmin();

  // 1. Public projects (the same filter as list/detail/search/sitemap).
  const { data: projects, error: projectsError } = await applyPublicProjectFilter(
    supabase
      .schema('lmsy_archive')
      .from('projects')
      .select('id, slug, title, title_i18n, category, project_kind, event_date, release_date')
  );

  if (projectsError) {
    console.error('[CHRONICLE] Failed to fetch public projects:', projectsError);
    return [];
  }

  const rows = projects || [];
  const events: ChronicleEvent[] = [];
  // Door 1 addresses an entry under its series, so the map is resolved once.
  const { loadSeriesSlugMap } = await import('@/lib/series-slugs');
  const { entryPath } = await import('@/lib/entry-path');
  const seriesSlugs = await loadSeriesSlugMap();

  for (const p of rows) {
    // A theme project carries no single event date by definition ("Back View"
    // is a subject, not a happening). Putting a project point on the timeline
    // for it would mean inventing a date, so it is skipped here - its images
    // still show up below, each under the date it actually happened.
    if (isThemeProject(p as { project_kind?: unknown })) continue;

    // Event date first (when it actually happened). release_date is only a
    // fallback for rows that predate the phase-7 split - it is the source
    // publication date and must never be confused with the collection date.
    const date =
      ((p.event_date as string | null) || (p.release_date as string | null)) ?? '';
    if (!date) continue; // undated projects have no timeline slot
    const href = entryPath(p as never, seriesSlugs);
    if (!href) continue; // nowhere to send the visitor
    events.push({
      kind: 'project',
      id: `project-${p.id}`,
      date,
      title: p.title as string,
      titleI18n: normalizeLocalizedText(p.title_i18n as LocalizedText | null, p.title as string),
      category: p.category as string,
      href,
    });
  }

  // 2. Image groups for those projects (assets are always project-linked:
  //    verified 0 rows with NULL project_id).
  if (rows.length > 0) {
    const { data: assets, error: assetsError } = await supabase
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id, image_url, event_date, caption, caption_i18n, catalog_id, project_id')
      .in(
        'project_id',
        rows.map((r) => r.id)
      )
      .not('event_date', 'is', null)
      // Stable within-group order (phase-4 final acceptance finding):
      // PostgREST gives no ordering guarantee without ORDER BY, which made
      // thumbnails/lightbox sequences jitter between requests.
      .order('event_date', { ascending: true })
      .order('catalog_id', { ascending: true })
      .order('id', { ascending: true });

    if (assetsError) {
      console.error('[CHRONICLE] Failed to fetch public assets:', assetsError);
      return [];
    }

    const projectById = new Map(rows.map((r) => [r.id, r]));
    const groups = new Map<string, TimelineImageRef[]>();

    for (const a of assets || []) {
      const key = `${a.project_id}|${a.event_date}`;
      const bucket = groups.get(key) || [];
      bucket.push({
        id: a.id,
        image_url: a.image_url,
        caption: (a.caption as string | null) ?? null,
        caption_i18n: normalizeLocalizedText(a.caption_i18n as LocalizedText | null, (a.caption as string | null) ?? ''),
        catalog_id: (a.catalog_id as string | null) ?? null,
      });
      groups.set(key, bucket);
    }

    for (const [key, images] of groups) {
      const [projectId, date] = key.split('|');
      const project = projectById.get(projectId);
      if (!project) continue;
      const href = entryPath(project as never, seriesSlugs);
      if (!href) continue; // nowhere to send the visitor
      events.push({
        kind: 'images',
        id: `assets-${projectId}-${date}`,
        date,
        projectId,
        projectTitle: project.title as string,
        projectTitleI18n: normalizeLocalizedText(project.title_i18n as LocalizedText | null, project.title as string),
        href,
        images,
      });
    }
  }

  // Newest first; on the same date a project entry leads its image set.
  return events.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.kind !== b.kind) return a.kind === 'project' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}
