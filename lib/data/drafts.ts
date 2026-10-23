/**
 * draft_items repository (lib/data).
 *
 * First consumer: GET /api/admin/drafts - the curation queue list, its
 * sidebar-badge count (drafts/stats), the single-row edit/delete pair
 * (drafts/[id]) and the dev-only seed endpoint (drafts/seed).
 *
 * Every query below is a verbatim move of the query those routes built inline:
 * same select list, same filters, same order, same range window, same error
 * semantics. The behaviours carried over on purpose:
 *
 * - the list filters out archived/rejected with .not('status','in',...) and
 *   hands back the window the caller asked for (limit/offset are passed
 *   through unclamped - the UI owns those numbers, not the data layer)
 * - the admin client already defaults to lmsy_archive, so these calls stay
 *   schema-less exactly like the routes were (see lib/supabase/admin.ts);
 *   adding .schema() here would be redundant today and misleading tomorrow
 * - .single() is kept where the route used it, including its zero-row
 *   behaviour: PostgREST answers PGRST116 for a missing id, so a missing row
 *   surfaces through the same error path it always did, and the route's own
 *   "not found" branch stays intact behind it
 * - admin-facing functions THROW; each route maps the message onto the same
 *   response it used to answer with (here: apiServerError, whose body does
 *   not depend on the error at all)
 */

import type { AdminClient } from './client.ts';

/** The id is the only column every function here is guaranteed to select. */
export interface DraftItemRow {
  id: string;
  [key: string]: unknown;
}

/** The delete guard needs nothing but the object's id and R2 key. */
export interface DraftItemRefRow {
  id: string;
  r2_key: string | null;
}

/** Just enough of the row to log what got created. */
export interface DraftItemIdRow {
  id: string;
}

// ---------------------------------------------------------------------------
// List (moved from GET /api/admin/drafts)
// ---------------------------------------------------------------------------

export interface ListDraftItemsFilter {
  /** Raw status query param; 'all' (and an absent value) mean "no filter". */
  status?: string | null;
  mediaType?: string | null;
  batchId?: string | null;
  projectId?: string | null;
  /** Window size, passed through unclamped - defaults live in the route. */
  limit: number;
  offset: number;
}

export interface DraftItemsPage {
  rows: DraftItemRow[];
  /**
   * The exact count PostgREST reported. The old route asked with a plain
   * .select('*') and no count option, so this is null today and the response
   * carried `"count": null` - null is the faithful answer, not 0.
   */
  count: number | null;
}

/**
 * One window of the curation queue, newest first.
 *
 * Verbatim from the route, including the default exclusion of archived and
 * rejected rows and the untouched limit/offset arithmetic (NaN included: the
 * numbers come from the UI and were never validated).
 *
 * Not paged internally: this is a caller-bounded window, not a full-table
 * read. A caller asking for a window wider than PostgREST's 1000-row cap gets
 * 1000 rows today and did before the move too.
 */
export async function listDraftItems(
  db: AdminClient,
  filters: ListDraftItemsFilter
): Promise<DraftItemsPage> {
  let query = db
    .from('draft_items')
    .select('*')
    .order('created_at', { ascending: false })
    .range(filters.offset, filters.offset + filters.limit - 1);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.mediaType && filters.mediaType !== 'all') {
    query = query.eq('media_type', filters.mediaType);
  }
  if (filters.batchId) {
    query = query.eq('batch_id', filters.batchId);
  }
  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId);
  }

  // Exclude archived and rejected by default.
  query = query.not('status', 'in', '("archived", "rejected")');

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { rows: (data ?? []) as DraftItemRow[], count: count ?? null };
}

// ---------------------------------------------------------------------------
// Count (moved from GET /api/admin/drafts/stats)
// ---------------------------------------------------------------------------

/**
 * Every draft row, for the sidebar badge.
 *
 * Head-only exact count: no body is transferred, so PostgREST's 1000-row
 * cap does not apply - it is a COUNT, not a page. Verbatim from the route,
 * which answered `count || 0`.
 */
export async function countDraftItems(db: AdminClient): Promise<number> {
  const { count, error } = await db
    .from('draft_items')
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Delete helpers (moved from DELETE /api/admin/drafts and /api/admin/drafts/[id])
// ---------------------------------------------------------------------------

/**
 * The R2 keys of the rows about to go, for the delete guard.
 *
 * Caller-bounded by the id list, like before: no order and no range, because
 * the guard only needs the set.
 */
export async function listDraftItemRefs(db: AdminClient, ids: string[]): Promise<DraftItemRefRow[]> {
  const { data, error } = await db.from('draft_items').select('id, r2_key').in('id', ids);

  if (error) throw new Error(error.message);
  return (data ?? []) as DraftItemRefRow[];
}

/** One row's id and R2 key. .single() semantics - a missing id throws PGRST116. */
export async function getDraftItemRef(db: AdminClient, id: string): Promise<DraftItemRefRow | null> {
  const { data, error } = await db
    .from('draft_items')
    .select('id, r2_key')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return (data as DraftItemRefRow | null) ?? null;
}

/** Drop rows by id set. Row deletion is not gated by the R2 outcome. */
export async function deleteDraftItems(db: AdminClient, ids: string[]): Promise<void> {
  const { error } = await db.from('draft_items').delete().in('id', ids);

  if (error) throw new Error(error.message);
}

export async function deleteDraftItem(db: AdminClient, id: string): Promise<void> {
  const { error } = await db.from('draft_items').delete().eq('id', id);

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Single row (moved from GET / PATCH /api/admin/drafts/[id])
// ---------------------------------------------------------------------------

/** One full row by id. .single() semantics - a missing id throws PGRST116. */
export async function getDraftItemById(db: AdminClient, id: string): Promise<DraftItemRow | null> {
  const { data, error } = await db.from('draft_items').select('*').eq('id', id).single();

  if (error) throw new Error(error.message);
  return (data as DraftItemRow | null) ?? null;
}

/**
 * Partial update from the curation form.
 *
 * The route validates nothing and forwards the request body; the repository
 * does not take that freedom further - it patches exactly what it is given.
 * .single() semantics, so a missing id throws instead of answering null.
 */
export async function updateDraftItem(
  db: AdminClient,
  id: string,
  patch: Record<string, unknown>
): Promise<DraftItemRow | null> {
  const { data, error } = await db
    .from('draft_items')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return (data as DraftItemRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Seed (moved from POST /api/admin/drafts/seed)
// ---------------------------------------------------------------------------

/**
 * The dev-only seed insert, field list included.
 *
 * The route builds the whole row itself (timestamps included) and only wants
 * the new id back - so the payload stays the caller's, not the repository's.
 */
export async function insertDraftItem(
  db: AdminClient,
  payload: Record<string, unknown>
): Promise<DraftItemIdRow> {
  const { data, error } = await db.from('draft_items').insert(payload).select('id').single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Insert returned no row');
  return data as DraftItemIdRow;
}
