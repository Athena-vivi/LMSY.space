import type { SupabaseClient } from '@supabase/supabase-js';
import type { GalleryItem } from './supabase/types';
import { applyPublicProjectFilter } from './project-visibility';
import { entryPath, seriesSlugMapFrom } from './entry-path';

/**
 * Gallery data layer, shared by the SSR first screen (app/gallery/page.tsx,
 * server anon client) and the client-side pagination/filtering
 * (app/gallery/gallery-client.tsx, browser client). Same query logic on both
 * sides so the first server-rendered page and every "load more" page behave
 * identically.
 *
 * Phase-4 batch 2 visibility rule: the visible-project id set is fetched once
 * with the same applyPublicProjectFilter helper every other public page uses;
 * asset queries are constrained with .in('project_id', ids). On lookup failure
 * the id set stays empty, which fail-closes the gallery (empty grid) instead of
 * leaking hidden assets.
 */

// Only the columns this page renders (list + lightbox). The previous
// `select('*')` also pulled every long text column (excerpt, title, credits,
// i18n blobs) for all 330 rows.
export const GALLERY_COLUMNS =
  'id, image_url, caption, caption_i18n, tag, catalog_id, created_at, event_date, is_cover, is_editorial, curator_note, rotation, sequence, source_url, source_platform, project_id, width, height';

export const PAGE_SIZE = 60;

// Sentinel for the untagged filter: rows whose tag column IS NULL cannot be
// matched with .eq(), they need .is('tag', null).
export const UNTAGGED = '__untagged__';

export interface ProjectRef {
  id: string;
  title: string;
  title_i18n: Record<string, string | null> | null;
  slug: string | null;
  category: string | null;
  subtype: string | null;
  project_kind: string | null;
  work_id: string | null;
  /** The event's public address, resolved below - null when it has none. */
  href: string | null;
}

/**
 * work_id -> series slug, for the drama entries that are addressed under their
 * series. Three rows, fetched once and shared by every batch. The promise is
 * cached module-level (same behaviour the client page had); slugs only change
 * on a deploy, so a warm instance reusing it is fine.
 */
let seriesSlugPromise: Promise<Map<string, string>> | null = null;
export function loadSeriesSlugs(sb: AnySupabaseClient): Promise<Map<string, string>> {
  if (!seriesSlugPromise) {
    seriesSlugPromise = (async () => {
      const { data } = await sb
        .schema('lmsy_archive')
        .from('projects')
        .select('id, slug, category, project_kind, work_id')
        .eq('category', 'drama_work')
        .eq('project_kind', 'series');
      return seriesSlugMapFrom((data ?? []) as never);
    })();
  }
  return seriesSlugPromise;
}

/**
 * Both the server anon client (getSupabasePublic) and the browser client bind
 * the lmsy_archive schema, so the parameter type must not pin "public".
 */
type AnySupabaseClient = SupabaseClient<any, any, any, any, any>;

export async function fetchPublicProjectIds(sb: AnySupabaseClient): Promise<string[]> {
  const { data, error } = await applyPublicProjectFilter(
    sb.schema('lmsy_archive').from('projects').select('id')
  );
  if (error || !data) return [];
  return data.map((row) => (row as { id: string }).id);
}

export async function fetchProjectRefs(
  sb: AnySupabaseClient,
  ids: string[]
): Promise<Record<string, ProjectRef>> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return {};
  const [{ data, error }, seriesSlugs] = await Promise.all([
    sb
      .schema('lmsy_archive')
      .from('projects')
      .select('id, title, title_i18n, slug, category, subtype, project_kind, work_id')
      .in('id', unique),
    loadSeriesSlugs(sb),
  ]);
  if (error || !data) return {}; // fail-safe: hide the entry, never crash
  const map: Record<string, ProjectRef> = {};
  for (const row of data as unknown as Array<Omit<ProjectRef, 'href'>>) {
    map[row.id] = { ...row, href: entryPath(row, seriesSlugs) };
  }
  return map;
}

export async function fetchGalleryPage(
  sb: AnySupabaseClient,
  from: number,
  tag: string,
  projectIds: string[]
): Promise<{ rows: GalleryItem[]; failed: boolean }> {
  if (projectIds.length === 0) {
    // Fail-closed: no visible projects resolved (or lookup failed) -> the
    // result set is empty, never "everything".
    return { rows: [], failed: false };
  }

  let query = sb
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select(GALLERY_COLUMNS)
    .in('project_id', projectIds);

  if (tag === UNTAGGED) {
    query = query.is('tag', null);
  } else if (tag !== 'All') {
    query = query.eq('tag', tag);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }) // stable tiebreaker so paging never repeats/skips
    .range(from, from + PAGE_SIZE - 1);

  if (error) return { rows: [], failed: true };
  return { rows: (data || []) as unknown as GalleryItem[], failed: false };
}
