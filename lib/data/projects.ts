/**
 * projects repository (lib/data).
 *
 * Second table to gain a repository (gallery_assets was first, P1-3 Phase 1).
 * Every query below is a verbatim move of an existing read or write - the
 * point of this module is that the next change (generated types in Phase 4,
 * an anon+RLS client for public reads) happens here instead of in ~30 files.
 *
 * Error style follows the caller's contract, and the split is deliberate:
 * - admin-facing functions THROW; the route maps the message onto its own
 *   500 response (same status, same error string as before the move)
 * - public-door functions answer empty on a read failure, because the doors
 *   render an empty shelf rather than crashing a public page - that is the
 *   verbatim contract of lib/door-data.ts, moved with the query
 */

import type { AdminClient } from './client.ts';
import { keysetOr, type Cursor } from './keyset.ts';
import { applyPublicProjectFilter } from '../project-visibility.ts';
import type { LocalizedText } from '../localized-content.ts';

/** The two columns keyset paging relies on; the rest of the row passes through. */
export interface ProjectRow {
  id: string;
  created_at: string;
  release_date: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Vault walk (moved from app/api/admin/vault/route.ts, fetchEveryProject)
// ---------------------------------------------------------------------------

export const PROJECT_WALK_PAGE_SIZE = 1000;
/** Hard stop well past the ten-thousand row mark. */
export const PROJECT_WALK_MAX_PAGES = 50;

export interface ProjectWalkResult {
  rows: ProjectRow[];
  /** True when the loop stopped at PROJECT_WALK_MAX_PAGES instead of the last row. */
  truncated: boolean;
}

/**
 * Every project row, newest created first - the vault's editorial tab.
 *
 * Keyset walk, not one select: PostgREST answers at most 1000 rows per
 * request (Supabase's db-max-rows), so a single .select('*') would silently
 * truncate the list. The walk always orders by created_at, because the
 * display column for projects (release_date) is nullable and a cursor
 * cannot step past NULLs; the caller re-sorts by display order afterwards.
 *
 * Throws on a page error: the vault route answered that case with a 500 and
 * dropped the partial rows anyway, so the partial walk is not carried over.
 */
export async function walkAllProjects(db: AdminClient): Promise<ProjectWalkResult> {
  const rows: ProjectRow[] = [];
  let cursor: Cursor | null = null;

  for (let page = 0; page < PROJECT_WALK_MAX_PAGES; page += 1) {
    let query = db
      .schema('lmsy_archive')
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PROJECT_WALK_PAGE_SIZE);

    if (cursor) {
      query = query.or(keysetOr(cursor));
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const batch = (data ?? []) as ProjectRow[];
    if (batch.length === 0) return { rows, truncated: false };

    rows.push(...batch);
    const last = batch[batch.length - 1] as unknown as { created_at: string; id: string };
    cursor = { createdAt: last.created_at, id: last.id };

    if (batch.length < PROJECT_WALK_PAGE_SIZE) return { rows, truncated: false };
  }

  return { rows, truncated: true };
}

// ---------------------------------------------------------------------------
// Admin list (moved from GET /api/admin/projects)
// ---------------------------------------------------------------------------

/**
 * The admin projects list: every row, newest publication first.
 *
 * Verbatim from the route, ordering included: PostgREST sorts DESC with
 * NULLs FIRST by default and 136 of the 183 rows have no release_date, so
 * a "nulls last" re-sort would reshuffle the list. At 183 rows a single
 * request sits far under the 1000-row cap; if the table ever grows past it,
 * this read needs the walk above (reported, deliberately not changed here).
 */
export async function listAllProjectsByReleaseDate(db: AdminClient): Promise<ProjectRow[]> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .order('release_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectRow[];
}

// ---------------------------------------------------------------------------
// Single row
// ---------------------------------------------------------------------------

/** One row by id, or null. maybeSingle semantics (admin edit, cover route). */
export async function getProjectById(db: AdminClient, id: string): Promise<ProjectRow | null> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as ProjectRow | null) ?? null;
}

/**
 * One row by id, throwing when missing. .single() semantics, which is what
 * merge and split relied on (a missing row surfaces as PGRST116, not null).
 */
export async function getProjectByIdStrict(db: AdminClient, id: string): Promise<ProjectRow> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Project not found');
  return data as ProjectRow;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Raw insert with the full row back (the split route builds its own field list). */
export async function insertProject(
  db: AdminClient,
  payload: Record<string, unknown>
): Promise<ProjectRow> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Insert returned no row');
  return data as ProjectRow;
}

export interface CreateProjectInput {
  title: string;
  category: string;
  subtype: string | null;
  eventDate: string;
  portalVisible: boolean;
  workId: string | null;
}

function slugifyAscii(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The promote wizard's event creation: a <YYYYMMDD>-<ascii-title> slug,
 * deduped with a numeric suffix, then the insert with the same defaults the
 * route always sent (curation draft, portal_priority 0). The wizard files
 * pictures into the new project right away, so it starts portal-visible
 * unless the curator unticks that.
 */
export async function createProject(
  db: AdminClient,
  input: CreateProjectInput
): Promise<ProjectRow> {
  const compact = input.eventDate.replace(/-/g, '');
  const base = `${compact}-${slugifyAscii(input.title) || 'event'}`;
  let slug = base;
  for (let i = 2; ; i++) {
    const { data: taken } = await db
      .schema('lmsy_archive')
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${base}-${i}`;
  }

  return insertProject(db, {
    title: input.title,
    category: input.category,
    subtype: input.subtype,
    event_date: input.eventDate,
    slug,
    curation_status: 'draft',
    portal_visible: input.portalVisible,
    portal_priority: 0,
    work_id: input.workId,
  });
}

/**
 * Partial update; returns the selected rows. An empty array means the id
 * matched nothing, which is how the admin route answers 404 (it deliberately
 * avoids .single(), which throws PGRST116 on zero rows).
 */
export async function updateProject(
  db: AdminClient,
  id: string,
  patch: Record<string, unknown>
): Promise<ProjectRow[]> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .update(patch)
    .eq('id', id)
    .select();

  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectRow[];
}

export async function deleteProject(db: AdminClient, id: string): Promise<void> {
  const { error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/**
 * The cover pointer (projects.cover_url). A cover is a pointer, not a file:
 * null clears it back to the automatic first-picture cover.
 */
export async function setProjectCover(
  db: AdminClient,
  id: string,
  coverUrl: string | null
): Promise<void> {
  const { error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .update({ cover_url: coverUrl })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Public door reads (moved from lib/door-data.ts)
// ---------------------------------------------------------------------------

/**
 * The columns every door entry page reads. Moved here so the door list and
 * the repository cannot drift apart.
 */
export const DOOR_ENTRY_COLUMNS =
  'id, slug, title, title_i18n, description, description_i18n, category, subtype, event_date, release_date, cover_url, watch_url, project_kind, video_url_bilibili, video_url_youtube, interview_md';

export interface DoorEntryProjectRow {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  description: string | null;
  description_i18n: LocalizedText | null;
  /** The hall the row belongs to; a shared door holds several. */
  category: string | null;
  subtype: string | null;
  event_date: string | null;
  release_date: string | null;
  cover_url: string | null;
  watch_url: string | null;
  project_kind: string | null;
  video_url_bilibili: string | null;
  video_url_youtube: string | null;
  interview_md: string | null;
}

/**
 * Every visitor-visible entry of one or more halls, newest first.
 *
 * Verbatim from lib/door-data.ts loadRows (the image-count query moved to
 * gallery-assets.ts). Visibility is the shared rule from
 * lib/project-visibility.ts, applied here so every public read honours it.
 * Answers [] on a read failure: the doors render an empty shelf rather than
 * crashing a public page - the verbatim contract of the caller.
 */
export async function listPublicDoorEntries(
  db: AdminClient,
  categories: readonly string[]
): Promise<DoorEntryProjectRow[]> {
  if (categories.length === 0) return [];

  const { data, error } = await applyPublicProjectFilter(
    db.schema('lmsy_archive').from('projects').select(DOOR_ENTRY_COLUMNS)
  )
    .in('category', categories as unknown as string[])
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('release_date', { ascending: false, nullsFirst: false });

  if (error || !data) return [];
  return data as unknown as DoorEntryProjectRow[];
}

export interface ProjectGroupMetaRow {
  id: string;
  asset_groups: unknown;
  asset_group_covers: unknown;
}

/**
 * Declared picture classes plus the curator-picked class covers, per entry
 * id (the level-2 timeline boxes). Answers [] on a read failure - verbatim
 * from lib/door-data.ts buildEntryGroups.
 */
export async function getProjectGroupMeta(
  db: AdminClient,
  ids: string[]
): Promise<ProjectGroupMetaRow[]> {
  if (ids.length === 0) return [];

  const { data } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('id, asset_groups, asset_group_covers')
    .in('id', ids);

  return (data ?? []) as ProjectGroupMetaRow[];
}

export interface ProjectTalkCoverRow {
  id: string;
  talk_resource_covers: unknown;
}

/**
 * talk_resource_covers picks per entry id (the talks door's resource boxes:
 * Bilibili / YouTube / photos / transcript). Answers [] on a read failure -
 * verbatim from lib/door-data.ts loadTalkResourceCovers.
 */
export async function getProjectTalkCoverPicks(
  db: AdminClient,
  ids: string[]
): Promise<ProjectTalkCoverRow[]> {
  if (ids.length === 0) return [];

  const { data } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('id, talk_resource_covers')
    .in('id', ids);

  return (data ?? []) as ProjectTalkCoverRow[];
}
