/**
 * gallery_assets repository (lib/data).
 *
 * First consumer: GET /api/admin/vault/assets (P1-3 Phase 1). That route used
 * to build its filters, its keyset walk and its cursor-free count inline;
 * that logic now lives here so the next paged asset read reuses it instead of
 * forking it.
 *
 * The behaviour the old route relied on is preserved on purpose:
 * - search terms are stripped of PostgREST or()-grammar characters
 * - a project-id SET wins over the single-project filter
 * - duplicate `or` params AND together (this client has no .and())
 * - the count is asked cursor-free, so it does not shrink while paging
 */

import type { AdminClient } from './client.ts';
import { keysetPage, type Cursor, type KeysetPage } from './keyset.ts';
import type { LocalizedText } from '../localized-content.ts';

/** Page-size contract, shared with the route so there is one source of truth. */
export const ASSET_PAGE_DEFAULT_LIMIT = 60;
export const ASSET_PAGE_MAX_LIMIT = 200;
const MAX_TERM_LENGTH = 120;
/** A door holds a few dozen batches; this is the URL-length guard, not a limit. */
const MAX_PROJECT_IDS = 100;

/** The two columns keyset paging relies on; the rest of the row passes through. */
export interface GalleryAssetRow {
  id: string;
  created_at: string;
  [key: string]: unknown;
}

export interface ListAssetsFilter {
  /** Raw search term; sanitized here before it reaches the or() grammar. */
  q?: string | null;
  tag?: string | null;
  projectId?: string | null;
  /** Wins over projectId when non-empty (the picker sends a whole door). */
  projectIds?: string[];
  cursor?: Cursor | null;
  /** Clamped to [1, ASSET_PAGE_MAX_LIMIT]; defaults to ASSET_PAGE_DEFAULT_LIMIT. */
  limit?: number;
}

/**
 * Strip characters that would break PostgREST's `or=(...)` grammar: commas and
 * parentheses end a clause, `%` `*` `_` are LIKE wildcards, and a backslash is
 * the escape character. A user typing any of those should get a literal
 * search, not a syntax error or a match-everything query.
 *
 * Exported because the route also needs it: whether filters count as active is
 * decided by the sanitized term, not the raw one.
 */
export function sanitizeSearchTerm(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/[,()%_\\*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TERM_LENGTH);
}

/** The repository owns its own limits even when the route already parsed them. */
function clampLimit(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw) || raw <= 0) {
    return ASSET_PAGE_DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(raw), ASSET_PAGE_MAX_LIMIT);
}

/**
 * One keyset page of gallery_assets with the cursor-free match count.
 * Filters are combined with AND; `q` searches caption, tag and catalog_id.
 */
export async function listGalleryAssets(
  db: AdminClient,
  filters: ListAssetsFilter
): Promise<KeysetPage<GalleryAssetRow>> {
  const q = sanitizeSearchTerm(filters.q);
  const tag = (filters.tag ?? '').trim();
  const projectId = (filters.projectId ?? '').trim();
  const projectIds = (filters.projectIds ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_PROJECT_IDS);
  const limit = clampLimit(filters.limit);

  const buildBase = () => {
    let query = db
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('*', { count: 'exact' });

    // A set of projects wins over the single one: the picker sends the ids of
    // a whole door, and `eq` would narrow that back to one event.
    if (projectIds.length > 0) query = query.in('project_id', projectIds);
    else if (projectId) query = query.eq('project_id', projectId);
    if (tag) query = query.eq('tag', tag);
    // Two `or` params. PostgREST ANDs duplicate parameters rather than letting
    // the last one win, so the search and the cursor narrow each other.
    // Verified on the live table: a term matching 66 rows plus a cursor
    // returned 64, i.e. both clauses applied. This client has no `.and()`
    // builder, so a second `.or()` is the only way to say it.
    if (q) {
      query = query.or(
        `caption.ilike.%${q}%,tag.ilike.%${q}%,catalog_id.ilike.%${q}%`
      );
    }

    return query;
  };

  return keysetPage<GalleryAssetRow>(buildBase, {
    cursor: filters.cursor ?? null,
    limit,
  });
}

// ---------------------------------------------------------------------------
// Vault payload (moved from app/api/admin/vault/route.ts)
// ---------------------------------------------------------------------------

/**
 * The true gallery_assets row count, for the vault tab badges.
 *
 * Swallows its error and answers 0: the vault route never checked this one
 * query (count ?? 0) while checking every sibling. That is verbatim
 * behaviour, not an oversight to fix inside a move.
 */
export async function countAllAssets(db: AdminClient): Promise<number> {
  const { count, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id', { count: 'exact', head: true });

  if (error) return 0;
  return count ?? 0;
}

export interface PortalSlotAssetRow {
  id: string;
  image_url: string;
  blur_data: string | null;
  portal_slot: string | null;
  interview_slot: string | null;
}

/**
 * The fixed homepage slots: at most one row per slot, so a filter is enough
 * - no paging, no ordering (verbatim from the vault route).
 */
export async function listPortalSlotAssets(db: AdminClient): Promise<PortalSlotAssetRow[]> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, blur_data, portal_slot, interview_slot')
    .or('portal_slot.not.is.null,interview_slot.not.is.null');

  if (error) throw new Error(error.message);
  return (data ?? []) as PortalSlotAssetRow[];
}

export interface MilestoneAssetRow {
  id: string;
  image_url: string;
  milestone_priority: number;
  caption: string | null;
  tag: string | null;
}

/** The year photos (gallery_assets.milestone_priority), for the timeline. */
export async function listMilestoneAssets(db: AdminClient): Promise<MilestoneAssetRow[]> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, milestone_priority, caption, tag')
    .not('milestone_priority', 'is', null);

  if (error) throw new Error(error.message);
  return (data ?? []) as MilestoneAssetRow[];
}

export const TAG_WALK_PAGE_SIZE = 1000;
export const TAG_WALK_MAX_PAGES = 50;

/**
 * Every tag in use, for the vault filter dropdown.
 *
 * There is no group-by in PostgREST, so this walks the one column instead of
 * every row: ~1,350 rows of {id, tag} is a few kilobytes, versus the
 * megabytes a full row select cost. Moved verbatim from the vault route.
 */
export async function listTagsInUse(db: AdminClient): Promise<string[]> {
  const tags = new Set<string>();
  let cursor: string | null = null;

  for (let page = 0; page < TAG_WALK_MAX_PAGES; page += 1) {
    let query = db
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id, tag')
      .order('id', { ascending: true })
      .limit(TAG_WALK_PAGE_SIZE);

    if (cursor) query = query.gt('id', cursor);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const batch = (data ?? []) as Array<{ id: string; tag: string | null }>;
    if (batch.length === 0) break;

    for (const row of batch) if (row.tag) tags.add(row.tag);
    cursor = batch[batch.length - 1].id;

    if (batch.length < TAG_WALK_PAGE_SIZE) break;
  }

  return [...tags].sort((a, b) => a.localeCompare(b));
}

// ---------------------------------------------------------------------------
// Cover route (moved from app/api/admin/projects/[id]/cover/route.ts)
// ---------------------------------------------------------------------------

export interface AssetCoverRef {
  id: string;
  image_url: string;
  project_id: string | null;
}

/** One asset by id, the cover route's preflight. maybeSingle semantics. */
export async function getAssetById(db: AdminClient, id: string): Promise<AssetCoverRef | null> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, project_id')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as AssetCoverRef | null) ?? null;
}

/** Drop the per-batch cover flag on every asset of a project. */
export async function clearCoverFlags(db: AdminClient, projectId: string): Promise<void> {
  const { error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .update({ is_cover: false })
    .eq('project_id', projectId);

  if (error) throw new Error(error.message);
}

/** Mark one asset as its batch's cover. */
export async function setCoverFlag(db: AdminClient, assetId: string): Promise<void> {
  const { error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .update({ is_cover: true })
    .eq('id', assetId);

  if (error) throw new Error(error.message);
}

/**
 * Re-file every asset of one project under another (the merge route's
 * second step). Throws on error - the route maps it to its own 500.
 */
export async function moveAssetsToProject(
  db: AdminClient,
  fromProjectId: string,
  toProjectId: string
): Promise<void> {
  const { error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .update({ project_id: toProjectId })
    .eq('project_id', fromProjectId);

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Door reads (moved from lib/door-data.ts)
// ---------------------------------------------------------------------------

/**
 * imageCount per entry for a door's cards.
 *
 * Paged on purpose (2026-10-23 fix): the old single .in() request silently
 * truncated at PostgREST's 1000-row cap, and live_event already holds 1,633
 * assets across 57 entries - roughly 600 assets fell past the cap and the
 * door cards printed too few "N images". The walk mirrors
 * listEntryGroupAssets below. A page error answers {} (no counts), the
 * same shape the old single query failed with.
 */
export async function countAssetsByProject(
  db: AdminClient,
  ids: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (ids.length === 0) return counts;

  for (let from = 0; ; from += ASSET_WALK_PAGE_SIZE) {
    const { data, error } = await db
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('project_id')
      .in('project_id', ids)
      .order('id', { ascending: true })
      .range(from, from + ASSET_WALK_PAGE_SIZE - 1);

    if (error) return {};

    const page = (data ?? []) as Array<{ project_id: string | null }>;
    for (const asset of page) {
      if (!asset.project_id) continue;
      counts[asset.project_id] = (counts[asset.project_id] ?? 0) + 1;
    }

    if (page.length < ASSET_WALK_PAGE_SIZE) break;
  }

  return counts;
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
  asset_group: string | null;
}

/** One entry's pictures, upload order (the level-3 wall). Answers [] on a read failure. */
export async function listEntryAssets(
  db: AdminClient,
  projectId: string
): Promise<DoorAssetRow[]> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, caption, catalog_id, rotation, asset_group, width, height')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  return (data ?? []) as unknown as DoorAssetRow[];
}

export interface EntryGroupAssetRow {
  project_id: string | null;
  asset_group: string | null;
  image_url: string | null;
  catalog_id: string | null;
}

const ASSET_WALK_PAGE_SIZE = 1000;

/**
 * Every asset of the given entries, oldest first, for the level-2 class
 * boxes. Paged with .range(): PostgREST caps one request at 1000 rows and
 * the fan-meeting shelf alone holds 1,200+ pictures, so a single .in()
 * dropped the newest entries' boxes entirely (2026-10-23 fix, moved
 * verbatim). A page error stops the walk and keeps what was collected -
 * also verbatim.
 */
export async function listEntryGroupAssets(
  db: AdminClient,
  ids: string[]
): Promise<EntryGroupAssetRow[]> {
  const assets: EntryGroupAssetRow[] = [];
  if (ids.length === 0) return assets;

  for (let from = 0; ; from += ASSET_WALK_PAGE_SIZE) {
    const { data } = await db
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('project_id, asset_group, image_url, catalog_id, created_at')
      .in('project_id', ids)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + ASSET_WALK_PAGE_SIZE - 1);

    const page = (data ?? []) as EntryGroupAssetRow[];
    assets.push(...page);
    if (page.length < ASSET_WALK_PAGE_SIZE) break;
  }

  return assets;
}

// ---------------------------------------------------------------------------
// Door 1 - drama pages (moved from app/dramas/[slug]/*)
// ---------------------------------------------------------------------------

export interface DramaEntryAssetRow {
  id: string;
  image_url: string;
  caption: string | null;
  catalog_id: string | null;
  rotation: number | null;
  project_id: string | null;
}

/**
 * The pictures of a series page's entries, upload order - one read fills
 * every card's first frame and image count. Answers [] on a read failure
 * (verbatim: the page only destructured `data`).
 */
export async function listDramaEntryAssets(
  db: AdminClient,
  projectIds: string[]
): Promise<DramaEntryAssetRow[]> {
  if (projectIds.length === 0) return [];

  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, caption, catalog_id, rotation, project_id')
    .in('project_id', projectIds)
    .order('created_at', { ascending: true });

  return (data ?? []) as unknown as DramaEntryAssetRow[];
}

export interface EventPageAssetRow {
  id: string;
  image_url: string;
  caption: string | null;
  catalog_id: string | null;
  rotation: number | null;
  width: number | null;
  height: number | null;
}

/** The picture wall of one dated entry. Answers [] on a read failure. */
export async function listEventPageAssets(
  db: AdminClient,
  projectId: string
): Promise<EventPageAssetRow[]> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, caption, catalog_id, rotation, width, height')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  return (data ?? []) as unknown as EventPageAssetRow[];
}

// ---------------------------------------------------------------------------
// Cover candidates (moved from app/people/[slug], app/api/home/summary,
// app/admin/preview/[id])
//
// pickCoversByProject() reads these rows in the order they arrive: the
// is_cover flag first, then the -000 catalog plate, then the first row. The
// two orders below are therefore part of the contract, not decoration.
// ---------------------------------------------------------------------------

export interface CoverCandidateRow {
  project_id: string | null;
  image_url: string;
  is_cover: boolean | null;
  catalog_id: string | null;
}

/**
 * Cover rows with the flagged one first (home/summary, /people/[slug]).
 * Answers [] on a read failure.
 */
export async function listCoverCandidates(
  db: AdminClient,
  projectIds: string[]
): Promise<CoverCandidateRow[]> {
  if (projectIds.length === 0) return [];

  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('project_id, image_url, is_cover, catalog_id')
    .in('project_id', projectIds)
    .order('is_cover', { ascending: false })
    .order('created_at', { ascending: true, nullsFirst: false });

  return (data ?? []) as unknown as CoverCandidateRow[];
}

/**
 * Cover rows in plain upload order (the preview page's "more in this
 * category"). Answers [] on a read failure.
 */
export async function listRelatedCoverCandidates(
  db: AdminClient,
  projectIds: string[]
): Promise<CoverCandidateRow[]> {
  if (projectIds.length === 0) return [];

  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('project_id, image_url, is_cover, catalog_id')
    .in('project_id', projectIds)
    .order('created_at', { ascending: true, nullsFirst: false });

  return (data ?? []) as unknown as CoverCandidateRow[];
}

// ---------------------------------------------------------------------------
// Homepage (moved from app/api/home/summary and app/api/home/portals)
// ---------------------------------------------------------------------------

export interface PinnedInterviewCoverRow {
  image_url: string;
  interview_slot: string;
}

/**
 * The curator-pinned soul-resonance covers (Asset Vault -> PORTALS). A pin
 * wins over whatever the projects happen to carry. Answers [] on a read
 * failure (verbatim: the route only destructured `data`).
 */
export async function listPinnedInterviewCovers(
  db: AdminClient
): Promise<PinnedInterviewCoverRow[]> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('image_url, interview_slot')
    .not('interview_slot', 'is', null);

  return (data ?? []) as unknown as PinnedInterviewCoverRow[];
}

export interface MilestoneCoverRow {
  milestone_priority: number;
  image_url: string | null;
}

/**
 * The per-year representative photos (priority 1 = 2022), in slot order.
 * Answers [] on a read failure (verbatim: the route only destructured `data`).
 */
export async function listMilestoneCoverAssets(
  db: AdminClient
): Promise<MilestoneCoverRow[]> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('milestone_priority, image_url')
    .not('milestone_priority', 'is', null)
    .order('milestone_priority', { ascending: true });

  return (data ?? []) as unknown as MilestoneCoverRow[];
}

export interface PinnedPortalCoverRow {
  image_url: string;
  blur_data: string | null;
}

/**
 * The image the curator pinned to one homepage hall. Null when the hall has
 * no pin or the read failed - verbatim, the route only read `data`.
 */
export async function getPinnedPortalCover(
  db: AdminClient,
  category: string
): Promise<PinnedPortalCoverRow | null> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('image_url, blur_data')
    .eq('portal_slot', category)
    .maybeSingle();

  return (data as PinnedPortalCoverRow | null) ?? null;
}

/** The portal cover fallback chain, per attempt: -000 plate, featured, any. */
export type PortalCoverMode = 'catalog' | 'featured' | 'any';

/**
 * One cover candidate of a project, newest first. Null when nothing matches
 * or the read failed - the caller then tries the next fallback, verbatim.
 */
export async function getPortalCoverCandidate(
  db: AdminClient,
  projectId: string,
  mode: PortalCoverMode
): Promise<PinnedPortalCoverRow | null> {
  let query = db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('image_url, blur_data')
    .eq('project_id', projectId);

  if (mode === 'catalog') query = query.like('catalog_id', '%-000');
  else if (mode === 'featured') query = query.eq('is_featured', true);

  const { data } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as PinnedPortalCoverRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Public project gallery (moved from app/api/project-gallery)
// ---------------------------------------------------------------------------

export interface ProjectGalleryAssetRow {
  id: string;
  created_at: string;
  image_url: string;
  is_cover: boolean | null;
  catalog_id: string | null;
  sequence: number | null;
  category_tag: string | null;
  [key: string]: unknown;
}

/**
 * Every asset of one project, upload order, optionally narrowed to one
 * category_tag. Throws on a read failure - the route maps the message onto
 * its own 500, verbatim.
 */
export async function listProjectGalleryAssets(
  db: AdminClient,
  projectId: string,
  category: string
): Promise<ProjectGalleryAssetRow[]> {
  let query = db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (category !== 'all') query = query.eq('category_tag', category);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProjectGalleryAssetRow[];
}

// ---------------------------------------------------------------------------
// Admin preview page (moved from app/admin/preview/[id]/page.tsx)
// ---------------------------------------------------------------------------

/**
 * The columns the preview grid renders (the previous select('*') pulled
 * excerpt/credits/i18n blobs the grid never shows). Answers [] on a read
 * failure (verbatim: the page only destructured `data`).
 */
export const PREVIEW_GALLERY_COLUMNS =
  'id, image_url, caption, caption_i18n, catalog_id, category_tag, curator_note, is_featured, event_date, created_at, is_cover, rotation, sequence, width, height';

export async function listPreviewProjectImages(
  db: AdminClient,
  projectId: string
): Promise<ProjectGalleryAssetRow[]> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select(PREVIEW_GALLERY_COLUMNS)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  return (data ?? []) as unknown as ProjectGalleryAssetRow[];
}

// ---------------------------------------------------------------------------
// Admin reads (moved from app/api/admin/upload, app/api/milestones,
// lib/cover-slots.ts)
// ---------------------------------------------------------------------------

/**
 * The highest catalog id under a prefix, for the "next sequence" preview.
 * Null when nothing matches or the read failed - verbatim, the routes only
 * read `data`.
 */
export async function getLatestCatalogIdForPrefix(
  db: AdminClient,
  prefix: string
): Promise<string | null> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('catalog_id')
    .like('catalog_id', prefix)
    .order('catalog_id', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as { catalog_id: string | null } | null)?.catalog_id ?? null;
}

/**
 * The homepage timeline's milestone images. Returns null on a read failure -
 * the public route answers 500 there, so the failure has to stay
 * distinguishable from an empty set.
 */
export async function listMilestonePriorityAssets(
  db: AdminClient
): Promise<MilestoneCoverRow[] | null> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, milestone_priority')
    .not('milestone_priority', 'is', null)
    .order('milestone_priority', { ascending: true });

  if (error) return null;
  return (data ?? []) as unknown as MilestoneCoverRow[];
}

export interface CategorySlotCoverRow {
  id: string;
  image_url: string;
  blur_data: string | null;
  category_slot: string | null;
}

/**
 * The covers pinned to a door's second level (category_slot). Answers [] on
 * a read failure - verbatim from lib/cover-slots.ts.
 */
export async function listCategorySlotCovers(
  db: AdminClient,
  paths: readonly string[]
): Promise<CategorySlotCoverRow[]> {
  if (paths.length === 0) return [];

  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, blur_data, category_slot')
    .in('category_slot', paths as string[]);

  return (data ?? []) as unknown as CategorySlotCoverRow[];
}

// ---------------------------------------------------------------------------
// Curation tree (moved from lib/curation.ts)
// ---------------------------------------------------------------------------

export interface CurationAssetRow {
  id: string;
  project_id: string | null;
  image_url: string;
  catalog_id: string | null;
  portal_slot: string | null;
  interview_slot: string | null;
}

/**
 * Every asset row the admin curation page folds into its tree.
 *
 * NOT paged, deliberately verbatim: the single .select() predates the
 * 1000-row discovery and a fix (with before/after evidence, the same way
 * countAssetsByProject was fixed) is a separate change - this move must not
 * alter behaviour. Answers [] on a read failure.
 */
export async function listCurationAssets(db: AdminClient): Promise<CurationAssetRow[]> {
  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, project_id, image_url, catalog_id, portal_slot, interview_slot');

  return (data ?? []) as unknown as CurationAssetRow[];
}

// ---------------------------------------------------------------------------
// Chronicle (moved from lib/timeline.ts)
//
// The walk below is the year-scoped, id-cursored read the chronicle uses:
// callers pass a year so the query carries an event_date range instead of
// scanning the whole table (PostgREST answers at most 1000 rows per request,
// and an unbounded .in() silently truncated the timeline once already), and
// within a year the walk pages on the id cursor so a busy year is still read
// in full. The cursor is `id`, not `offset`: the table is written to while
// the page renders, and an offset window shifts under concurrent inserts.
// ---------------------------------------------------------------------------

const TIMELINE_ASSET_PAGE_SIZE = 1000;
/** Hard stop far past any plausible single year; the caller logs if reached. */
export const TIMELINE_ASSET_MAX_PAGES = 30;

export interface TimelineAssetRow {
  id: string;
  image_url: string;
  event_date: string;
  caption: string | null;
  caption_i18n: LocalizedText | null;
  catalog_id: string | null;
  project_id: string;
  width?: number | null;
  height?: number | null;
}

export interface TimelineAssetWalk {
  rows: TimelineAssetRow[];
  /** True when the walk stopped at TIMELINE_ASSET_MAX_PAGES, not the last row. */
  truncated: boolean;
}

/** First and last day of a calendar year, as the half-open range PostgREST wants. */
function yearRange(year: string): { from: string; to: string } {
  const start = Number(year);
  return { from: `${year}-01-01`, to: `${start + 1}-01-01` };
}

/**
 * Every dated asset of the given projects for one year, read in full.
 * Returns null when a page fails, so the caller can distinguish "no assets"
 * from "the query broke" - the old code logged and answered an empty
 * timeline for the failure, and that distinction is kept.
 */
export async function listTimelineAssetsForYear(
  db: AdminClient,
  projectIds: string[],
  year?: string
): Promise<TimelineAssetWalk | null> {
  const baseQuery = () =>
    db
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id, image_url, event_date, caption, caption_i18n, catalog_id, project_id, width, height')
      .in('project_id', projectIds)
      .not('event_date', 'is', null);

  const rows: TimelineAssetRow[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < TIMELINE_ASSET_MAX_PAGES; page += 1) {
    let query: ReturnType<typeof baseQuery> = baseQuery();

    if (year) {
      const { from, to } = yearRange(year);
      query = query.gte('event_date', from).lt('event_date', to);
    }

    // Ordered by the cursor column only - a cursor cannot step through a
    // composite sort. The display order is rebuilt in memory by the caller.
    query = query.order('id', { ascending: true }).limit(TIMELINE_ASSET_PAGE_SIZE);
    if (cursor) query = query.gt('id', cursor);

    const { data, error } = await query;
    if (error) return null;

    const batch = (data ?? []) as unknown as TimelineAssetRow[];
    rows.push(...batch);
    if (batch.length < TIMELINE_ASSET_PAGE_SIZE) return { rows, truncated: false };

    cursor = batch[batch.length - 1].id;
  }

  return { rows, truncated: true };
}

export interface AssetEventDateBounds {
  earliest: string | null;
  latest: string | null;
}

/**
 * The span of dated assets, for the chronicle year filter. Both bounds come
 * back null when the table holds no dated asset or a read failed - verbatim,
 * the caller only read `data`.
 */
export async function getAssetEventDateBounds(
  db: AdminClient
): Promise<AssetEventDateBounds> {
  const [earliest, latest] = await Promise.all([
    db
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('event_date')
      .not('event_date', 'is', null)
      .order('event_date', { ascending: true })
      .limit(1),
    db
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('event_date')
      .not('event_date', 'is', null)
      .order('event_date', { ascending: false })
      .limit(1),
  ]);

  return {
    earliest: (earliest.data?.[0] as { event_date?: string } | undefined)?.event_date ?? null,
    latest: (latest.data?.[0] as { event_date?: string } | undefined)?.event_date ?? null,
  };
}

/**
 * How many assets fall in a calendar year - a HEAD count that transfers no
 * rows, so the year filter can price every year in the span cheaply.
 * Swallows its error and answers 0, verbatim.
 */
export async function countAssetsInYear(
  db: AdminClient,
  year: string
): Promise<number> {
  const { from, to } = yearRange(year);
  const { count, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id', { count: 'exact', head: true })
    .gte('event_date', from)
    .lt('event_date', to);

  if (error) return 0;
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Draft delete guard (moved from lib/draft-delete-guard.ts)
//
// The guard takes a structural client (its unit tests pass a stub with only
// from().select()), so these two queries deliberately do NOT call .schema():
// the admin client defaults to lmsy_archive, and the stub has no schema
// method to call. Throws on a read failure - the guard re-wraps the message
// with its own "Failed to load R2 references from <table>" prefix, verbatim.
// ---------------------------------------------------------------------------

/** Structural minimum of the guard's client; the admin client satisfies it. */
export interface GuardQueryClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: 'gallery_assets' | 'projects'): { select(columns: string): PromiseLike<{ data: any; error: any }> };
}

export async function listAllAssetImageUrls(
  client: GuardQueryClient
): Promise<Array<{ image_url: string | null }>> {
  const { data, error } = await client.from('gallery_assets').select('image_url');
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ image_url: string | null }>;
}

export async function listAllProjectCoverRefs(
  client: GuardQueryClient
): Promise<Array<{ cover_url: string | null; homepage_cover_url: string | null }>> {
  const { data, error } = await client.from('projects').select('cover_url, homepage_cover_url');
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ cover_url: string | null; homepage_cover_url: string | null }>;
}
