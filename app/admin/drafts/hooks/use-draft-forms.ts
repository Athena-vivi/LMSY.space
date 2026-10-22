/**
 * useDraftForms - Form State Management Hook
 *
 * The edit modal now carries a single field: the English title. Saving sends
 * only that field, so every other column on the row keeps its value. The batch
 * editor is gone - filing happens through the promote wizard instead.
 */

'use client';

import { useState, useCallback } from 'react';
import type { DraftItem } from '@/lib/supabase/types';

interface DraftFormState {
  title: { en: string; zh: string; th: string };
}

const emptyFormState: DraftFormState = {
  title: { en: '', zh: '', th: '' },
};

interface UseDraftFormsProps {
  drafts: DraftItem[];
  fetchDrafts: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export function useDraftForms({ fetchDrafts, showToast }: UseDraftFormsProps) {
  // Edit modal state
  const [editingItem, setEditingItem] = useState<DraftItem | null>(null);
  const [editForm, setEditForm] = useState<DraftFormState>(emptyFormState);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'single' | 'batch';
    id?: string;
    r2Key?: string | null;
    count?: number;
  }>({ show: false, type: 'single' });

  /**
   * Open edit modal with draft data
   */
  const handleOpenEdit = useCallback((draft: DraftItem) => {
    setEditingItem(draft);
    setEditForm({
      title: {
        en: draft.title.en || '',
        zh: draft.title.zh || '',
        th: draft.title.th || '',
      },
    });
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingItem(null);
  }, []);

  /**
   * Save edit changes.
   *
   * Only `title` is sent. zh/th are carried through unchanged from the row that
   * was opened, so a rename in English cannot blank the other two languages.
   */
  const handleSaveEdit = useCallback(async () => {
    if (!editingItem) return;

    try {
      const response = await fetch(`/api/admin/drafts/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editForm.title }),
      });

      if (!response.ok) throw new Error('Update failed');

      // Refresh to get updated data
      await fetchDrafts();
      handleCloseEdit();
      showToast('ITEM_UPDATED');
    } catch {
      showToast('UPDATE_FAILED', 'error');
    }
  }, [editingItem, editForm, fetchDrafts, handleCloseEdit, showToast]);

  /**
   * Delete confirmation handlers
   */
  const showDeleteConfirm = useCallback((id?: string, r2Key?: string | null, count?: number) => {
    if (id) {
      setDeleteConfirm({ show: true, type: 'single', id, r2Key });
    } else {
      setDeleteConfirm({ show: true, type: 'batch', count });
    }
  }, []);

  const hideDeleteConfirm = useCallback(() => {
    setDeleteConfirm({ show: false, type: 'single' });
  }, []);

  return {
    // Edit modal
    editingItem,
    editForm,
    setEditForm,
    handleOpenEdit,
    handleCloseEdit,
    handleSaveEdit,

    // Delete confirmation
    deleteConfirm,
    showDeleteConfirm,
    hideDeleteConfirm,
  };
}
