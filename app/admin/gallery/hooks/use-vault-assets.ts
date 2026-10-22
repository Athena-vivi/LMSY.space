/**
 * Paged, server-filtered asset list for the ALL tab.
 *
 * The vault used to download every gallery row and filter in the browser,
 * which cannot hold past a few thousand images: PostgREST truncates at 1000
 * rows and the JSON reaches megabytes. Here the search, the tag filter and the
 * project filter all run in the database, and the grid loads 60 rows at a time.
 *
 * `total` is the size of the whole filtered set, so the header can say
 * "60 / 1,353" instead of counting what happens to be loaded.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { GalleryItem } from '@/lib/supabase';

export interface VaultAssetFilters {
  /** Free text: caption, tag or catalog id */
  q: string;
  /** Exact tag match */
  tag: string;
  /** Gallery rows linked to one project */
  projectId?: string;
  /**
   * Gallery rows linked to any of several projects - a door or a shelf holds
   * a batch per event, and its cover picker offers all of them at once.
   */
  projectIds?: string[];
  /**
   * Skip the request entirely until the caller needs rows. The pickers stay
   * mounted while closed and would otherwise fetch a page nobody looked at.
   */
  enabled?: boolean;
}

export interface VaultAssetsPage {
  rows: GalleryItem[];
  total: number;
  nextCursor: string | null;
}

export function useVaultAssets({
  q,
  tag,
  projectId,
  projectIds,
  enabled = true,
}: VaultAssetFilters) {
  const [rows, setRows] = useState<GalleryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Callers build their id list inline, so the array is a new reference on
  // every render. Comparing the joined form keeps it out of the effect deps
  // without dropping the change signal.
  const projectIdsKey = projectIds?.join(',') ?? '';

  // Responses can land out of order when a filter changes mid-request; only
  // the newest request is allowed to write state.
  const requestRef = useRef(0);

  const load = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!enabled) return;

      const requestId = requestRef.current + 1;
      requestRef.current = requestId;

      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Admin session not available');

        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (tag) params.set('tag', tag);
        if (projectId) params.set('projectId', projectId);
        if (projectIdsKey) params.set('project_ids', projectIdsKey);
        if (cursor) params.set('cursor', cursor);

        const response = await fetch(`/api/admin/vault/assets?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'include',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await response.json();

        // A stale reply must not overwrite a newer one, and must not clear
        // that newer request's loading flag either.
        if (requestRef.current !== requestId) return;

        if (!response.ok || !payload.success) {
          throw new Error(payload.details || payload.error || 'Failed to load assets');
        }

        const page = payload.data as VaultAssetsPage;
        setRows((prev) => (append ? [...prev, ...page.rows] : page.rows));
        setTotal(page.total);
        setNextCursor(page.nextCursor);
      } catch (err) {
        if (requestRef.current !== requestId) return;
        console.error('[VAULT_ASSETS] Failed to load assets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assets');
      } finally {
        if (requestRef.current === requestId) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [q, tag, projectId, projectIdsKey, enabled]
  );

  // A new filter set starts from the first page.
  useEffect(() => {
    void load(null, false);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    void load(nextCursor, true);
  }, [load, nextCursor, loadingMore]);

  /** Re-read from page one, e.g. after a delete changed the set. */
  const refresh = useCallback(() => {
    void load(null, false);
  }, [load]);

  /**
   * Drop rows from the loaded page without re-reading it. A delete only ever
   * targets loaded rows, and refetching would jump the grid back to page one.
   */
  const removeRows = useCallback((ids: string[]) => {
    const drop = new Set(ids);
    setRows((prev) => prev.filter((row) => !drop.has(row.id)));
    setTotal((prev) => Math.max(0, prev - drop.size));
  }, []);

  /** Apply an edit in place, for the same reason. */
  const updateRow = useCallback((id: string, patch: Partial<GalleryItem>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  return {
    rows,
    total,
    nextCursor,
    loading,
    loadingMore,
    error,
    loadMore,
    refresh,
    removeRows,
    updateRow,
    /** True once the filters return nothing, as opposed to "still loading". */
    empty: !loading && rows.length === 0,
  };
}

export type VaultAssetsState = ReturnType<typeof useVaultAssets>;
