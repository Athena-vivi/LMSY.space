/**
 * Shared keyset (seek) pagination for lib/data.
 *
 * Extracted from app/api/admin/vault/assets/route.ts (P1-3 Phase 0) with the
 * behaviour unchanged - the helpers just gained a home so the next paged read
 * reuses them instead of forking them.
 *
 * Why keyset and not offset: an offset window shifts when a row is inserted
 * mid-walk, which duplicate-reads one row and skips another while an upload
 * is running. (created_at, id) is immune to that, and `id` breaks ties on
 * created_at - a few hundred rows can share a timestamp, so without it a page
 * boundary could repeat or skip rows.
 *
 * The cursor is opaque to callers: "<created_at>|<id>", the same wire format
 * the vault has always used, so cursors already in browser URLs stay valid.
 */

export interface Cursor {
  createdAt: string;
  id: string;
}

export function parseCursor(raw: string | null): Cursor | null {
  if (!raw) return null;
  const separator = raw.indexOf('|');
  if (separator <= 0) return null;

  const createdAt = raw.slice(0, separator).trim();
  const id = raw.slice(separator + 1).trim();
  if (!createdAt || !id) return null;

  return { createdAt, id };
}

export function encodeCursor(row: { created_at: string; id: string }): string {
  return `${row.created_at}|${row.id}`;
}

/**
 * The or(...) clause that seeks past a cursor:
 * created_at < c OR (created_at = c AND id < id).
 */
export function keysetOr(cursor: Cursor): string {
  return `created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt.${cursor.id})`;
}

/**
 * Structural shape of the supabase-js builder chain this helper needs.
 *
 * Deliberately minimal: the admin client is still `any` (retired in Phase 4)
 * and spelling out the full PostgrestFilterBuilder generics here would be
 * type theatre. `limit()` returns a PromiseLike because the builder itself is
 * the thenable - there is no separate execute() step on this chain.
 */
interface KeysetBuilder {
  or(filter: string): KeysetBuilder;
  order(column: string, options?: { ascending?: boolean }): KeysetBuilder;
  limit(n: number): PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
    count: number | null;
  }>;
}

export interface KeysetPage<T> {
  rows: T[];
  total: number;
  nextCursor: string | null;
}

export interface KeysetPageOptions {
  cursor: Cursor | null;
  limit: number;
  /** Default: (created_at desc, id desc) - the order the vault displays. */
  order?: Array<[string, boolean]>;
}

/**
 * One page plus the cursor-free total.
 *
 * `buildBase` must return the filtered query WITHOUT the cursor and WITH
 * count:'exact'. The count answers "how many rows match the filters", so it
 * must be asked before the cursor narrows the set - otherwise page 2 of a
 * 1,332-row table would report 1,272 matches and the header counter would
 * shrink as you scroll. The helper therefore asks for it on a second,
 * cursor-free builder (one row returned and thrown away; there is no
 * head-only variant on this chain that keeps the same filters).
 *
 * Throws on a page error: HTTP shaping is the route's job, not the data
 * layer's.
 */
export async function keysetPage<T extends { created_at: string; id: string }>(
  buildBase: () => KeysetBuilder,
  opts: KeysetPageOptions
): Promise<KeysetPage<T>> {
  const order: Array<[string, boolean]> = opts.order ?? [
    ['created_at', false],
    ['id', false],
  ];

  let rowsQuery = opts.cursor ? buildBase().or(keysetOr(opts.cursor)) : buildBase();
  for (const [column, ascending] of order) {
    rowsQuery = rowsQuery.order(column, { ascending });
  }

  const [pageResult, countResult] = await Promise.all([
    rowsQuery.limit(opts.limit),
    buildBase().limit(1),
  ]);

  if (pageResult.error) {
    throw new Error(pageResult.error.message);
  }

  const rows = (pageResult.data ?? []) as T[];
  const total = countResult.count ?? pageResult.count ?? rows.length;
  const last = rows[rows.length - 1] as { created_at: string; id: string } | undefined;
  // A short page is the last page; anything else keeps the cursor.
  const nextCursor = rows.length < opts.limit || !last ? null : encodeCursor(last);

  return { rows, total, nextCursor };
}
