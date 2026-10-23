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
 * imageCount per entry for a door's cards, in one query.
 *
 * KNOWN LANDMINE, deliberately carried over verbatim: this is a single
 * .in() request and PostgREST truncates at 1000 rows. live_event already
 * holds 1,633 assets across 57 entries, so roughly 600 assets fall past the
 * cap today and the door cards undercount. The fix is paging this walk (same
 * shape as listEntryGroupAssets below) and lands as its own commit after
 * the door-data migration, so the move stays behaviour-identical.
 */
export async function countAssetsByProject(
  db: AdminClient,
  ids: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (ids.length === 0) return counts;

  const { data } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('project_id')
    .in('project_id', ids);

  for (const asset of (data ?? []) as Array<{ project_id: string | null }>) {
    if (!asset.project_id) continue;
    counts[asset.project_id] = (counts[asset.project_id] ?? 0) + 1;
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
