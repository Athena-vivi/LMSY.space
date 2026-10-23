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
