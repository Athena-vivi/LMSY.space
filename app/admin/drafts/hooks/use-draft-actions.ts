/**
 * useDraftActions - CRUD Operations Hook
 *
 * Handles all API operations with optimistic updates
 */

'use client';

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
  const ensureProjectForDraft = async (id: string) => {
    const draft = drafts.find((item) => item.id === id);
    if (draft?.project_id) {
      return draft.project_id;
    }

    const response = await fetch(`/api/admin/drafts/${id}/create-project`, {
      method: 'POST',
    });

    const result = await response.json();

    if (!response.ok || !result.success || !result.data?.id) {
      throw new Error(result.error || 'Create project failed');
    }

    updateDraftOptimistically(id, { project_id: result.data.id });
    return result.data.id as string;
  };

  const ensureMilestoneProjectForDraft = async (id: string) => {
    const draft = drafts.find((item) => item.id === id);
    if (draft?.project_id) {
      return draft.project_id;
    }

    const response = await fetch(`/api/admin/drafts/${id}/link-milestone-project`, {
      method: 'POST',
    });

    const result = await response.json();

    if (!response.ok || !result.success || !result.data?.id) {
      throw new Error(result.error || 'Link milestone project failed');
    }

    updateDraftOptimistically(id, { project_id: result.data.id });
    return result.data.id as string;
  };

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
    } catch {
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
    } catch {
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
    } catch {
      await fetchDrafts(); // Revert on error
      showToast('BATCH_PUBLISH_FAILED', 'error');
    }
  };

  const handleAddToAssets = async (id: string) => {
    try {
      const draft = drafts.find((item) => item.id === id);
      if (!draft?.project_id) {
        throw new Error('Create or link a project first');
      }

      const response = await fetch(`/api/admin/drafts/${id}/to-gallery`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Add to assets failed');
      }

      showToast(result.created ? 'ADDED_TO_ASSETS' : 'ALREADY_IN_ASSETS');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ADD_TO_ASSETS_FAILED';
      showToast(message, 'error');
    }
  };

  const handleCreateProject = async (id: string) => {
    try {
      const existingDraft = drafts.find((draft) => draft.id === id);
      if (existingDraft?.project_id) {
        showToast('PROJECT_ALREADY_LINKED');
        return;
      }

      await ensureProjectForDraft(id);
      showToast('PROJECT_CREATED');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'CREATE_PROJECT_FAILED';
      showToast(message, 'error');
    }
  };

  const handleLinkExistingProject = async (id: string, projectId: string) => {
    try {
      const response = await fetch(`/api/admin/drafts/${id}/link-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data?.id) {
        throw new Error(result.error || 'Link project failed');
      }

      updateDraftOptimistically(id, { project_id: result.data.id });
      showToast(result.relinked ? 'PROJECT_RELINKED' : 'PROJECT_LINKED');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'LINK_PROJECT_FAILED';
      showToast(message, 'error');
      return false;
    }
  };

  const handleSetMilestone = async (id: string, year: '2022' | '2023' | '2024' | '2025' | 'infinity') => {
    try {
      await ensureMilestoneProjectForDraft(id);

      const assetResponse = await fetch(`/api/admin/drafts/${id}/to-gallery`, {
        method: 'POST',
      });
      const assetResult = await assetResponse.json();

      if (!assetResponse.ok || !assetResult.success) {
        throw new Error(assetResult.error || 'Failed to create asset');
      }

      const imageId = assetResult.data?.id;
      if (!imageId) {
        throw new Error('Missing asset id');
      }

      const milestoneResponse = await fetch('/api/admin/gallery/milestone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, year }),
      });

      const milestoneResult = await milestoneResponse.json();

      if (!milestoneResponse.ok || !milestoneResult.success) {
        throw new Error(milestoneResult.details || milestoneResult.error || 'Failed to set milestone');
      }

      showToast(`MILESTONE_${year.toUpperCase()}_SET`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SET_MILESTONE_FAILED';
      showToast(message, 'error');
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
    handlePublish,
    handleUnpublish,
    handleBatchPublish,
    handleCreateProject,
    handleLinkExistingProject,
    handleAddToAssets,
    handleSetMilestone,
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
