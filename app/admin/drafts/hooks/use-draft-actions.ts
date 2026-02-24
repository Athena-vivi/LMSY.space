/**
 * useDraftActions - CRUD Operations Hook
 *
 * Handles all API operations with optimistic updates
 */

'use client';

import { useCallback } from 'react';
import type { DraftItem } from '@/lib/supabase/types';

interface UseDraftActionsProps {
  drafts: DraftItem[];
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  fetchDrafts: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  updateDraftOptimistically: (id: string, updates: Partial<DraftItem>) => void;
  removeDraftOptimistically: (id: string) => void;
}

export function useDraftActions({
  drafts,
  selectedIds,
  setSelectedIds,
  fetchDrafts,
  showToast,
  updateDraftOptimistically,
  removeDraftOptimistically,
}: UseDraftActionsProps) {

  /**
   * Publish single item
   */
  const handlePublish = async (id: string) => {
    // Optimistic update
    updateDraftOptimistically(id, {
      status: 'published' as const,
      published_at: new Date().toISOString()
    });
    setSelectedIds(new Set([...selectedIds].filter(x => x !== id)));

    try {
      const response = await fetch(`/api/admin/drafts/${id}/publish`, { method: 'POST' });
      if (!response.ok) throw new Error('Publish failed');
      showToast('ITEM_PUBLISHED');
    } catch (error) {
      await fetchDrafts(); // Revert on error
      showToast('PUBLISH_FAILED', 'error');
    }
  };

  /**
   * Unpublish single item
   */
  const handleUnpublish = async (id: string) => {
    // Optimistic update
    updateDraftOptimistically(id, {
      status: 'draft' as const,
      published_at: null
    });

    try {
      const response = await fetch(`/api/admin/drafts/${id}/unpublish`, { method: 'POST' });
      if (!response.ok) throw new Error('Unpublish failed');
      showToast('ITEM_UNPUBLISHED');
    } catch (error) {
      await fetchDrafts(); // Revert on error
      showToast('UNPUBLISH_FAILED', 'error');
    }
  };

  /**
   * Batch publish
   */
  const handleBatchPublish = async () => {
    const ids = Array.from(selectedIds);

    // Optimistic update
    ids.forEach(id => {
      updateDraftOptimistically(id, {
        status: 'published' as const,
        published_at: new Date().toISOString()
      });
    });
    setSelectedIds(new Set());

    try {
      const response = await fetch('/api/admin/drafts/batch-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) throw new Error('Batch publish failed');

      const result = await response.json();
      showToast(`${result.published || 0}_ITEMS_PUBLISHED`);
    } catch (error) {
      await fetchDrafts(); // Revert on error
      showToast('BATCH_PUBLISH_FAILED', 'error');
    }
  };

  /**
   * Delete single item (with confirmation)
   */
  const handleDelete = (id: string, r2Key: string | null) => {
    return { id, r2Key };
  };

  /**
   * Execute single delete
   */
  const executeDelete = async (id: string) => {
    // Optimistic update
    removeDraftOptimistically(id);

    try {
      const response = await fetch(`/api/admin/drafts/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');

      showToast('ITEM_DELETED');
    } catch (error) {
      await fetchDrafts(); // Revert on error
      showToast('DELETE_FAILED', 'error');
    }
  };

  /**
   * Batch delete (with confirmation)
   */
  const handleBatchDelete = () => {
    return { count: selectedIds.size };
  };

  /**
   * Execute batch delete
   */
  const executeBatchDelete = async () => {
    const ids = Array.from(selectedIds);

    // Optimistic update
    ids.forEach(id => removeDraftOptimistically(id));
    setSelectedIds(new Set());

    try {
      const response = await fetch('/api/admin/drafts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) throw new Error('Batch delete failed');

      showToast(`${ids.length}_ITEMS_DELETED`);
    } catch (error) {
      await fetchDrafts(); // Revert on error
      showToast('BATCH_DELETE_FAILED', 'error');
    }
  };

  return {
    handlePublish,
    handleUnpublish,
    handleBatchPublish,
    handleDelete,
    executeDelete,
    handleBatchDelete,
    executeBatchDelete,
  };
}

/**
 * Delete confirmation state type
 */
export interface DeleteConfirmState {
  show: boolean;
  type: 'single' | 'batch';
  id?: string;
  r2Key?: string | null;
  count?: number;
}
