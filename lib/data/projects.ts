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
  /**
   * The three display-control columns. Every read here selects the whole row,
   * so they are always present; they are declared (not left to the index
   * signature) because PublicProjectShape is structural and
   * isPublicProject(row) must accept a row straight out of this module
   * without a cast. Optional, because a caller may select a narrower list.
   */
  portal_visible?: boolean | null;
  curation_status?: string | null;
  is_container?: boolean | null;
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
  /**
   * Null for a FEAT topic: a topic is a long-lived set and carries no date
   * segment in its ids (spec 4.9), so the wizard does not ask for one.
   */
  eventDate: string | null;
  /** Structured city (live events); feeds the subject code. */
  city: string | null;
  portalVisible: boolean;
  workId: string | null;
  /** 'theme' for a /features topic; null keeps the column's own default. */
  projectKind?: string | null;
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
  const ascii = slugifyAscii(input.title);
  // A topic has no date, so its slug is the plain ascii title - the same
  // shape the existing theme row uses (`back-view`).
  const compact = input.eventDate ? input.eventDate.replace(/-/g, '') : '';
  const base = compact ? `${compact}-${ascii || 'event'}` : ascii || 'topic';
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
    city: input.city,
    slug,
    curation_status: 'draft',
    portal_visible: input.portalVisible,
    portal_priority: 0,
    work_id: input.workId,
    ...(input.projectKind ? { project_kind: input.projectKind } : {}),
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

/** Admin dashboard: all editorial + series projects, newest release first. GET /api/admin/editorial. */
export async function listEditorialSeriesProjects(db: AdminClient): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .or('category.eq.editorial,category.eq.series')
    .order('release_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<Record<string, unknown>>;
}

/** Clear the previously-featured editorial project before promoting a new one. PUT /api/admin/editorial. */
export async function clearEditorialHomepageFeatured(db: AdminClient, exceptId: string): Promise<void> {
  const { error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .update({ homepage_featured: false })
    .eq('category', 'editorial')
    .eq('homepage_featured', true)
    .neq('id', exceptId);

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

// ---------------------------------------------------------------------------
// Door 1 - dramas (moved from app/dramas/*)
//
// One table, one kind field: a series is a project row (project_kind =
// 'series') and every entry under it is another row pointing back through
// work_id. The three pages read that shape three different ways, so each
// query keeps its own column list rather than sharing a wider one - the
// detail pages carry the two visibility columns because they run
// isPublicProject() on the row themselves.
//
// Error style per page: all three swallow a read failure (the old code only
// ever destructured `data`), so a failed query renders an empty door - the
// same behaviour as every other public page here.
// ---------------------------------------------------------------------------

/** The uuid test the drama pages share; a key is either a slug or a uuid. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DRAMA_SERIES_COLUMNS =
  'id, work_id, slug, title, title_i18n, description, description_i18n, subtype, event_date, release_date, cover_url';

/** The series row plus the two columns isPublicProject() reads. */
export const DRAMA_SERIES_DETAIL_COLUMNS = `${DRAMA_SERIES_COLUMNS}, curation_status, portal_visible`;

export interface DramaSeriesRow {
  id: string;
  work_id: string | null;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  description?: string | null;
  description_i18n?: LocalizedText | null;
  subtype: string | null;
  event_date: string | null;
  release_date: string | null;
  cover_url: string | null;
  /** Present on the detail pages' rows only; isPublicProject() reads them. */
  curation_status?: string | null;
  portal_visible?: boolean | null;
}

/** The three series cards on /dramas. Answers [] on a read failure. */
export async function listDramaSeries(db: AdminClient): Promise<DramaSeriesRow[]> {
  const { data } = await applyPublicProjectFilter(
    db.schema('lmsy_archive').from('projects').select(DRAMA_SERIES_COLUMNS)
  )
    .eq('category', 'drama_work')
    .eq('project_kind', 'series')
    // Newest series first: a new work appears at the top of the door the day
    // it is added, which is how every other door is read too.
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('release_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  return (data ?? []) as unknown as DramaSeriesRow[];
}

/**
 * Entry count per series, grouped by work_id: an entry carries the same
 * work_id as its series, so the grouping key is the work, not the series
 * row. Deliberately NOT public-filtered (verbatim) - /dramas only ever asks
 * about series it just read through the public filter. Answers {} on a read
 * failure.
 */
export async function countDramaEntriesByWorkId(
  db: AdminClient,
  workIds: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (workIds.length === 0) return counts;

  const { data } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('work_id')
    .in('work_id', workIds)
    .neq('project_kind', 'series');

  for (const row of (data ?? []) as Array<{ work_id: string | null }>) {
    if (!row.work_id) continue;
    counts[row.work_id] = (counts[row.work_id] ?? 0) + 1;
  }
  return counts;
}

/**
 * One series by slug, or by id when the slug looks like a uuid. NOT
 * public-filtered: the page applies isPublicProject() itself, so a draft
 * series still resolves and 404s through the page's own rule. Answers null
 * on a read failure (verbatim - the old code only read `data`).
 */
export async function getDramaSeriesByKey(
  db: AdminClient,
  key: string
): Promise<DramaSeriesRow | null> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select(DRAMA_SERIES_DETAIL_COLUMNS)
    .eq('category', 'drama_work')
    .eq('project_kind', 'series')
    .eq('slug', key)
    .maybeSingle();

  if (data) return data as DramaSeriesRow;
  if (!UUID_PATTERN.test(key)) return null;

  const { data: byId } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select(DRAMA_SERIES_DETAIL_COLUMNS)
    .eq('category', 'drama_work')
    .eq('project_kind', 'series')
    .eq('id', key)
    .maybeSingle();

  return (byId as DramaSeriesRow | null) ?? null;
}

export const DRAMA_ENTRY_COLUMNS =
  'id, work_id, slug, title, title_i18n, event_date, description, description_i18n, watch_url, video_url_bilibili, video_url_youtube, tags, portal_priority, project_kind, subtype, cover_url, created_at';

export interface DramaEntryRow {
  id: string;
  work_id: string | null;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  event_date: string | null;
  description: string | null;
  description_i18n: LocalizedText | null;
  watch_url: string | null;
  /** Where the footage of this entry lives; the site keeps only the links. */
  video_url_bilibili: string | null;
  video_url_youtube: string | null;
  tags: string[] | null;
  portal_priority: number | null;
  project_kind: string | null;
  subtype: string | null;
  cover_url: string | null;
  created_at: string | null;
}

/**
 * Every entry under one series, newest first. NOT public-filtered (verbatim):
 * the page resolves the series through the public rule first, and the entry
 * list follows the work it already trusts. Answers [] on a read failure.
 */
export async function listDramaEntries(
  db: AdminClient,
  workId: string
): Promise<DramaEntryRow[]> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select(DRAMA_ENTRY_COLUMNS)
    .eq('work_id', workId)
    .neq('project_kind', 'series')
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('release_date', { ascending: false, nullsFirst: false })
    .order('portal_priority', { ascending: true });

  return (data ?? []) as unknown as DramaEntryRow[];
}

export interface DramaSiblingRow {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  subtype: string | null;
  event_date: string | null;
  release_date: string | null;
  cover_url: string | null;
}

/**
 * The sibling strip at the bottom of a series page: the other series cards,
 * public-filtered. Answers [] on a read failure.
 */
export async function listDramaSeriesSiblings(db: AdminClient): Promise<DramaSiblingRow[]> {
  const { data } = await applyPublicProjectFilter(
    db
      .schema('lmsy_archive')
      .from('projects')
      .select('id, slug, title, title_i18n, subtype, event_date, release_date, cover_url')
  )
    .eq('category', 'drama_work')
    .eq('project_kind', 'series')
    .order('event_date', { ascending: false, nullsFirst: false });

  return (data ?? []) as unknown as DramaSiblingRow[];
}

/**
 * The series header of /dramas/[slug]/[event]: one query that addresses the
 * row by id when the slug looks like a uuid, by slug otherwise. NOT
 * public-filtered (the page runs isPublicProject on the row). Answers null
 * on a read failure.
 */
export async function getDramaEventSeries(
  db: AdminClient,
  key: string
): Promise<DramaSeriesRow | null> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select(
      'id, work_id, slug, title, title_i18n, subtype, event_date, release_date, cover_url, curation_status, portal_visible'
    )
    .eq('category', 'drama_work')
    .eq('project_kind', 'series')
    .eq(UUID_PATTERN.test(key) ? 'id' : 'slug', key)
    .maybeSingle();

  return (data as DramaSeriesRow | null) ?? null;
}

/**
 * One entry of a series, addressed by the work it belongs to plus its own
 * slug (or uuid). Answers null on a read failure.
 */
export async function getDramaEntryByKey(
  db: AdminClient,
  workId: string,
  key: string
): Promise<DramaEntryRow | null> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select(DRAMA_ENTRY_COLUMNS)
    .eq('work_id', workId)
    .neq('project_kind', 'series')
    .eq(UUID_PATTERN.test(key) ? 'id' : 'slug', key)
    .maybeSingle();

  return (data as DramaEntryRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// People (moved from app/people/*)
// ---------------------------------------------------------------------------

/** Ids of every visitor-visible project, for the per-person counts. Answers [] on a read failure. */
export async function listPublicProjectIds(db: AdminClient): Promise<string[]> {
  const { data } = await applyPublicProjectFilter(
    db.schema('lmsy_archive').from('projects').select('id')
  );

  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

export interface PersonProjectRow {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  category: string | null;
  subtype: string | null;
  project_kind: string | null;
  work_id: string | null;
  event_date: string | null;
  cover_url: string | null;
}

/**
 * The projects one person appears in, newest first. The id list comes from
 * project_people (Phase 3); this is the public-filtered projects half.
 * Answers [] on a read failure.
 */
export async function listPersonProjects(
  db: AdminClient,
  ids: string[]
): Promise<PersonProjectRow[]> {
  if (ids.length === 0) return [];

  const { data } = await applyPublicProjectFilter(
    db
      .schema('lmsy_archive')
      .from('projects')
      .select('id, slug, title, title_i18n, category, subtype, project_kind, work_id, event_date, cover_url')
      .in('id', ids)
  ).order('event_date', { ascending: false, nullsFirst: false });

  return (data ?? []) as unknown as PersonProjectRow[];
}

// ---------------------------------------------------------------------------
// Homepage (moved from app/api/home/*)
// ---------------------------------------------------------------------------

export interface HomeSummaryProjectRow {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  category: string | null;
  event_date: string | null;
  cover_url: string | null;
  homepage_featured: boolean | null;
  portal_priority: number | null;
}

/**
 * Every public project with the columns the summary block ranks by.
 * Returns null on a read failure - the route answers 500 there, so the
 * failure has to stay distinguishable from an empty archive.
 */
export async function listHomeSummaryProjects(
  db: AdminClient
): Promise<HomeSummaryProjectRow[] | null> {
  const { data, error } = await applyPublicProjectFilter(
    db
      .schema('lmsy_archive')
      .from('projects')
      .select('id, slug, title, title_i18n, category, event_date, cover_url, homepage_featured, portal_priority')
  );

  if (error) return null;
  return (data ?? []) as unknown as HomeSummaryProjectRow[];
}

export interface PortalProjectRow {
  id: string;
  cover_url: string | null;
}

/**
 * The projects of one homepage hall, in cover-priority order. Returns null
 * on a read failure - the route answers { cover: null, count: 0 } per hall
 * there, so an unreadable hall degrades alone instead of failing the page.
 */
export async function listPublicPortalProjects(
  db: AdminClient,
  category: string
): Promise<PortalProjectRow[] | null> {
  const { data, error } = await applyPublicProjectFilter(
    db
      .schema('lmsy_archive')
      .from('projects')
      .select('id, cover_url')
      .eq('category', category)
  )
    .order('portal_priority', { ascending: false })
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) return null;
  return (data ?? []) as unknown as PortalProjectRow[];
}

// ---------------------------------------------------------------------------
// Editorial (moved from lib/editorial-issues.ts and app/api/editorial)
//
// One issue is one project row (category = 'editorial') plus its gallery
// pages. Both readers embed the pages in one request - the embedded select
// cannot carry an ORDER BY, so the page sort happens in the caller on the
// catalog plate, which is the page number.
// ---------------------------------------------------------------------------

/** Columns shared by the /editorial rack and the /features rack. */
export const EDITORIAL_ISSUE_COLUMNS = `
  id,
  slug,
  title,
  title_i18n,
  description,
  description_i18n,
  category,
  cover_url,
  blur_data,
  release_date,
  catalog_id,
  created_at,
  gallery_assets (
    id,
    image_url,
    blur_data,
    caption,
    catalog_id,
    created_at
  )
`;

export interface EditorialIssueRow {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  description: string | null;
  description_i18n: LocalizedText | null;
  category: string | null;
  cover_url: string | null;
  blur_data: string | null;
  release_date: string | null;
  catalog_id: string | null;
  created_at: string | null;
  gallery_assets: Array<{
    id: string;
    image_url: string;
    blur_data: string | null;
    caption: string | null;
    catalog_id: string | null;
    created_at: string | null;
  }> | null;
}

/** Every public issue, newest first - the rack on /editorial. Answers [] on a read failure. */
export async function listEditorialIssues(db: AdminClient): Promise<EditorialIssueRow[]> {
  const { data } = await applyPublicProjectFilter(
    db.schema('lmsy_archive').from('projects').select(EDITORIAL_ISSUE_COLUMNS).eq('category', 'editorial')
  )
    // Newest issue first. Issues whose date is still unknown sink to the end
    // instead of floating to the top on a NULL sort key.
    .order('release_date', { ascending: false, nullsFirst: false })
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  return (data ?? []) as unknown as EditorialIssueRow[];
}

/** One issue by slug (or uuid), same visibility rule as the rack. Null on a read failure. */
export async function getEditorialIssueByKey(
  db: AdminClient,
  key: string
): Promise<EditorialIssueRow | null> {
  const { data } = await applyPublicProjectFilter(
    db
      .schema('lmsy_archive')
      .from('projects')
      .select(EDITORIAL_ISSUE_COLUMNS)
      .eq('category', 'editorial')
      .eq(UUID_PATTERN.test(key) ? 'id' : 'slug', key)
  ).maybeSingle();

  return (data as EditorialIssueRow | null) ?? null;
}

/** Every public theme project (project_kind = 'theme'), for the rack on /features. Answers [] on a read failure. */
export async function listFeatureTopics(db: AdminClient): Promise<EditorialIssueRow[]> {
  const { data } = await applyPublicProjectFilter(
    db.schema('lmsy_archive').from('projects').select(EDITORIAL_ISSUE_COLUMNS).eq('project_kind', 'theme')
  )
    .order('release_date', { ascending: false, nullsFirst: false })
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  return (data ?? []) as unknown as EditorialIssueRow[];
}

/**
 * The JSON API's own column list: the rack columns plus the homepage feature
 * fields the rack never selects. Returns null on a read failure - the route
 * answers 500 EDITORIAL_QUERY_FAILED there.
 */
export interface EditorialApiIssueRow extends EditorialIssueRow {
  homepage_featured: boolean | null;
  homepage_excerpt: string | null;
  homepage_excerpt_i18n: LocalizedText | null;
  homepage_cover_url: string | null;
}

export async function listEditorialIssuesForApi(
  db: AdminClient
): Promise<EditorialApiIssueRow[] | null> {
  const { data, error } = await applyPublicProjectFilter(
    db
      .schema('lmsy_archive')
      .from('projects')
      .select(`
        id,
        slug,
        title,
        title_i18n,
        description,
        description_i18n,
        category,
        cover_url,
        homepage_featured,
        homepage_excerpt,
        homepage_excerpt_i18n,
        homepage_cover_url,
        blur_data,
        release_date,
        catalog_id,
        created_at,
        gallery_assets (
          id,
          image_url,
          blur_data,
          caption,
          catalog_id,
          created_at
        )
      `)
      .eq('category', 'editorial')
  ).order('release_date', { ascending: false, nullsFirst: false });

  if (error) return null;
  return (data ?? []) as unknown as EditorialApiIssueRow[];
}

// ---------------------------------------------------------------------------
// Chronicle (moved from lib/timeline.ts and lib/series-slugs.ts)
// ---------------------------------------------------------------------------

export interface TimelineProjectRow {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  category: string;
  /**
   * The sub-class the row is filed under. Required for the address: a hall
   * whose second level is a sub-class (appearances / live-events / live)
   * builds `<door>/<subtype>/<slug>`, so without this column every row would
   * be addressed as `/unfiled/` and 404 on the page that owns it.
   */
  subtype: string | null;
  project_kind: string | null;
  /** Which series a drama entry belongs to; the second key of its address. */
  work_id: string | null;
  event_date: string | null;
  release_date: string | null;
}

/**
 * Public projects for the chronicle. Deliberately NOT filtered by year: a
 * project dated 2025 can own assets dated 2026, and filtering the list by
 * year would orphan those assets. Returns null on a read failure - the
 * caller logs and answers an empty timeline, keeping the failure visible.
 *
 * `subtype` and `work_id` are part of the address, not decoration: entryPath()
 * turns them into the second URL key, and a row read without them is addressed
 * to the wrong shelf (every appearance as `/unfiled/`) or dropped entirely (a
 * drama entry with no work_id resolves to no series). Both columns must stay
 * in this select.
 */
export async function listPublicTimelineProjects(
  db: AdminClient
): Promise<TimelineProjectRow[] | null> {
  const { data, error } = await applyPublicProjectFilter(
    db
      .schema('lmsy_archive')
      .from('projects')
      .select(
        'id, slug, title, title_i18n, category, subtype, project_kind, work_id, event_date, release_date'
      )
  );

  if (error) return null;
  return (data ?? []) as unknown as TimelineProjectRow[];
}

export interface SeriesSlugRow {
  id: string;
  slug: string | null;
  category: string | null;
  project_kind: string | null;
  work_id: string | null;
}

/**
 * The three drama series rows behind work_id -> slug. Returns null on a read
 * failure - the caller answers an empty map, verbatim.
 */
export async function listSeriesSlugRows(
  db: AdminClient
): Promise<SeriesSlugRow[] | null> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('id, slug, category, project_kind, work_id')
    .eq('category', 'drama_work')
    .eq('project_kind', 'series');

  if (error) return null;
  return (data ?? []) as unknown as SeriesSlugRow[];
}

// ---------------------------------------------------------------------------
// Sitemap (moved from app/sitemap.ts)
// ---------------------------------------------------------------------------

export interface SitemapProjectRow {
  id: string;
  work_id: string | null;
  slug: string | null;
  category: string | null;
  project_kind: string | null;
  subtype: string | null;
  created_at: string | null;
}

/** Every public row the sitemap may advertise. Answers [] on a read failure. */
export async function listPublicSitemapProjects(
  db: AdminClient
): Promise<SitemapProjectRow[]> {
  const { data } = await applyPublicProjectFilter(
    db
      .schema('lmsy_archive')
      .from('projects')
      .select('id, work_id, slug, category, project_kind, subtype, created_at')
  );

  return (data ?? []) as unknown as SitemapProjectRow[];
}

export interface DramaEventSlugRow {
  id: string;
  work_id: string | null;
  slug: string | null;
  created_at: string | null;
}

/** Door 1's third level: every entry hanging off the given works. Answers [] on a read failure. */
export async function listDramaEventSlugRows(
  db: AdminClient,
  workIds: string[]
): Promise<DramaEventSlugRow[]> {
  if (workIds.length === 0) return [];

  const { data } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('id, work_id, slug, created_at')
    .in('work_id', workIds)
    .neq('project_kind', 'series');

  return (data ?? []) as unknown as DramaEventSlugRow[];
}

// ---------------------------------------------------------------------------
// Admin preview (moved from app/admin/preview/[id]/page.tsx)
// ---------------------------------------------------------------------------

/**
 * A project by slug, or by id when the key looks like a uuid. NOT
 * public-filtered: the preview page runs isPublicProject() itself. Answers
 * null on a read failure (verbatim - the page only read `data`).
 */
export async function getProjectBySlugOrId(
  db: AdminClient,
  key: string
): Promise<ProjectRow | null> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .eq('slug', key)
    .maybeSingle();

  if (data) return data as ProjectRow;
  if (!UUID_PATTERN.test(key)) return null;

  const { data: byId } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .eq('id', key)
    .maybeSingle();

  return (byId as ProjectRow | null) ?? null;
}

export interface RelatedProjectRow {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  category: string | null;
  event_date: string | null;
  release_date: string | null;
}

/** "More in this category" on the preview page: same hall, other rows. Answers [] on a read failure. */
export async function listRelatedProjects(
  db: AdminClient,
  options: { excludeId: string; category: string; limit: number }
): Promise<RelatedProjectRow[]> {
  const { data } = await applyPublicProjectFilter(
    db
      .schema('lmsy_archive')
      .from('projects')
      .select('id, slug, title, title_i18n, category, event_date, release_date')
      .neq('id', options.excludeId)
      .eq('category', options.category)
      .order('event_date', { ascending: false, nullsFirst: false })
      .limit(options.limit)
  );

  return (data ?? []) as unknown as RelatedProjectRow[];
}

// ---------------------------------------------------------------------------
// Admin reads (moved from app/api/admin/*)
// ---------------------------------------------------------------------------

/** One project's category (the upload route's door code). Null when missing or unreadable, verbatim. */
export async function getProjectCategory(
  db: AdminClient,
  id: string
): Promise<string | null> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('category')
    .eq('id', id)
    .maybeSingle();

  return (data as { category: string | null } | null)?.category ?? null;
}

/**
 * Whether a project id exists (the ingest route's 400 guard). A failed read
 * answers false, verbatim: the route treats error and missing identically.
 */
export async function projectExists(db: AdminClient, id: string): Promise<boolean> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  return Boolean(data);
}

export interface ProjectVisibilityRow {
  portal_visible: boolean | null;
  curation_status: string | null;
}

/**
 * The two visibility columns /api/project-gallery gates on. Null when the
 * row is missing or unreadable, verbatim - the route answers 404 either way.
 */
export async function getProjectVisibility(
  db: AdminClient,
  id: string
): Promise<ProjectVisibilityRow | null> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('portal_visible, curation_status')
    .eq('id', id)
    .maybeSingle();

  return (data as ProjectVisibilityRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Curation tree (moved from lib/curation.ts)
// ---------------------------------------------------------------------------

export interface CurationProjectRow {
  id: string;
  slug: string | null;
  title: string;
  category: string | null;
  subtype: string | null;
  project_kind: string | null;
  work_id: string | null;
  event_date: string | null;
  release_date: string | null;
  cover_url: string | null;
}

/**
 * The visitor-visible rows of the halls the admin curation page draws. The
 * category list stays the caller's decision (it duplicates the registry on
 * purpose); this is only the query. Answers [] on a read failure.
 */
export async function listCurationProjects(
  db: AdminClient,
  categories: readonly string[]
): Promise<CurationProjectRow[]> {
  if (categories.length === 0) return [];

  const { data } = await applyPublicProjectFilter(
    db
      .schema('lmsy_archive')
      .from('projects')
      .select('id, slug, title, category, subtype, project_kind, work_id, event_date, release_date, cover_url')
  ).in('category', categories as unknown as string[]);

  return (data ?? []) as unknown as CurationProjectRow[];
}

/**
 * The visitor-visible theme projects (project_kind = 'theme') for the
 * features door in the admin curation tree. Same columns and visibility
 * filter as listCurationProjects, so a theme lines up with the same
 * CurationRow shape the assembler expects. Answers [] on a read failure.
 */
export async function listCurationThemes(db: AdminClient): Promise<CurationProjectRow[]> {
  const { data } = await applyPublicProjectFilter(
    db
      .schema('lmsy_archive')
      .from('projects')
      .select('id, slug, title, category, subtype, project_kind, work_id, event_date, release_date, cover_url')
      .eq('project_kind', 'theme')
  )
    .order('release_date', { ascending: false, nullsFirst: false })
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  return (data ?? []) as unknown as CurationProjectRow[];
}
