import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  listGalleryAssets,
  sanitizeSearchTerm,
  ASSET_PAGE_DEFAULT_LIMIT,
  ASSET_PAGE_MAX_LIMIT,
} from '@/lib/data/gallery-assets';
import { parseCursor } from '@/lib/data/keyset';

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
 *
 * P1-3 Phase 1: the query itself moved to lib/data/gallery-assets.ts; this
 * route is now param parsing, auth and response shaping only.
 */

/** A door holds a few dozen batches; this is the URL-length guard, not a limit. */
const MAX_PROJECT_IDS = 100;

function parseLimit(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return ASSET_PAGE_DEFAULT_LIMIT;
  return Math.min(parsed, ASSET_PAGE_MAX_LIMIT);
}

/**
 * A door or a shelf is several project rows, and its cover picker offers the
 * pictures of all of them. Comma separated, same shape /api/admin/gallery
 * accepts, so the callers can hand over the ids they already hold.
 */
function parseProjectIds(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_PROJECT_IDS);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const q = sanitizeSearchTerm(params.get('q'));
  const tag = (params.get('tag') ?? '').trim();
  const projectId = (params.get('projectId') ?? '').trim();
  const projectIds = parseProjectIds(params.get('project_ids'));
  const cursor = parseCursor(params.get('cursor'));
  const limit = parseLimit(params.get('limit'));

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const page = await listGalleryAssets(supabaseAdmin, {
      q,
      tag,
      projectId,
      projectIds,
      cursor,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: { rows: page.rows, total: page.total, nextCursor: page.nextCursor },
      debug: {
        limit,
        returned: page.rows.length,
        total: page.total,
        filtered: Boolean(q || tag || projectId || projectIds.length),
        projects: projectIds.length,
        paged: Boolean(cursor),
        has_next: page.nextCursor !== null,
      },
    });
  } catch (error) {
    // The repository throws on a page error (it does not shape HTTP); the old
    // route reported the same failure as 'Failed to fetch assets'.
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch assets',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
