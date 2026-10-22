/**
 * useDraftActions - Delete Operations Hook
 *
 * Publish, unpublish, batch publish, project linking and milestone flags used
 * to live here. Filing into events is the promote wizard's job now, so the only
 * operations left on the inbox are the two deletes.
 */

'use client';

interface UseDraftActionsProps {
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  fetchDrafts: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  removeDraftOptimistically: (id: string) => void;
}

export function useDraftActions({
  selectedIds,
  setSelectedIds,
  fetchDrafts,
  showToast,
  removeDraftOptimistically,
}: UseDraftActionsProps) {
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
    } catch {
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
 *
 * Server-side protection (B2-T1): the API keeps R2 objects that published
 * content still references and reports them in the response. The temporary
 * front-end kill switch that guarded the pre-fix window has been removed.
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
    } catch {
      await fetchDrafts(); // Revert on error
      showToast('BATCH_DELETE_FAILED', 'error');
    }
  };

  return {
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
