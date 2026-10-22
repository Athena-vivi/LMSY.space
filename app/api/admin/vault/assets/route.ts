import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * One page of gallery_assets, filtered on the server.
 *
 * The Asset Vault used to hand the browser every row and let it filter, which
 * stops working past a few thousand assets: PostgREST truncates a single
 * request at 1000 rows and the JSON grows to megabytes. Here the browser asks
 * for 60 rows at a time and the database does the search.
 *
 * Paging is keyset, not offset. Offset windows shift when a row is inserted
 * mid-walk, which duplicate-read one row and skipped another while an upload
 * was running. (created_at, id) is immune to that, and `id` breaks ties on
 * created_at - a few hundred rows share a timestamp, so without it a page
 * boundary could repeat or skip rows.
 *
 * Order is (created_at desc, id desc), which is the order the vault already
 * displayed, so paging does not reshuffle the grid.
 */

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 200;
const MAX_TERM_LENGTH = 120;

interface Cursor {
  createdAt: string;
  id: string;
}

function parseCursor(raw: string | null): Cursor | null {
  if (!raw) return null;
  const separator = raw.indexOf('|');
  if (separator <= 0) return null;

  const createdAt = raw.slice(0, separator).trim();
  const id = raw.slice(separator + 1).trim();
  if (!createdAt || !id) return null;

  return { createdAt, id };
}

function encodeCursor(row: { created_at: string; id: string }): string {
  return `${row.created_at}|${row.id}`;
}

/**
 * Strip characters that would break PostgREST's `or=(...)` grammar: commas and
 * parentheses end a clause, `%` `*` `_` are LIKE wildcards, and a backslash is
 * the escape character. A user typing any of those should get a literal
 * search, not a syntax error or a match-everything query.
 */
function searchTerm(raw: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/[,()%_\\*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TERM_LENGTH);
}

function parseLimit(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const q = searchTerm(params.get('q'));
  const tag = (params.get('tag') ?? '').trim();
  const projectId = (params.get('projectId') ?? '').trim();
  const cursor = parseCursor(params.get('cursor'));
  const limit = parseLimit(params.get('limit'));

  try {
    const supabaseAdmin = getSupabaseAdmin();

    /**
     * The filters, without the cursor. `count: 'exact'` on this builder answers
     * "how many assets match the search", so it must be asked before the cursor
     * narrows the set - otherwise page 2 of a 1,332 row table would report
     * 1,272 matches and the header counter would shrink as you scroll.
     */
    const buildFilters = () => {
      let query = supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('*', { count: 'exact' });

      if (projectId) query = query.eq('project_id', projectId);
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

    let rowsQuery = buildFilters();
    if (cursor) {
      rowsQuery = rowsQuery.or(
        `created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt.${cursor.id})`
      );
    }

    const [pageResult, countResult] = await Promise.all([
      rowsQuery
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit),
      // Cursor-free count. One row is returned and thrown away; there is no
      // head-only variant on this builder chain that keeps the same filters.
      buildFilters().limit(1),
    ]);

    if (pageResult.error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch assets', details: pageResult.error.message },
        { status: 500 }
      );
    }

    const rows = pageResult.data ?? [];
    const total = countResult.count ?? pageResult.count ?? rows.length;
    const last = rows[rows.length - 1] as
      | { created_at: string; id: string }
      | undefined;
    // A short page is the last page; anything else keeps the cursor.
    const nextCursor = rows.length < limit || !last ? null : encodeCursor(last);

    return NextResponse.json({
      success: true,
      data: { rows, total, nextCursor },
      debug: {
        limit,
        returned: rows.length,
        total,
        filtered: Boolean(q || tag || projectId),
        paged: Boolean(cursor),
        has_next: nextCursor !== null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
