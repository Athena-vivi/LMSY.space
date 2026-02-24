/**
 * useDraftForms - Form State Management Hook
 *
 * Manages edit modal and batch edit modal states
 */

'use client';

import { useState, useCallback } from 'react';
import type { DraftItem } from '@/lib/supabase/types';

interface DraftFormState {
  title: { en: string; zh: string; th: string };
  description: { en: string; zh: string; th: string };
  tags: string[];
  is_featured: boolean;
  event_date: string;
}

const emptyFormState: DraftFormState = {
  title: { en: '', zh: '', th: '' },
  description: { en: '', zh: '', th: '' },
  tags: [],
  is_featured: false,
  event_date: '',
};

interface UseDraftFormsProps {
  drafts: DraftItem[];
  fetchDrafts: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export function useDraftForms({ drafts, fetchDrafts, showToast }: UseDraftFormsProps) {
  // Edit modal state
  const [editingItem, setEditingItem] = useState<DraftItem | null>(null);
  const [editForm, setEditForm] = useState<DraftFormState>(emptyFormState);
  const [translating, setTranslating] = useState(false);

  // Batch edit state
  const [batchEditing, setBatchEditing] = useState(false);
  const [batchEditForm, setBatchEditForm] = useState<DraftFormState>(emptyFormState);
  const [batchOrder, setBatchOrder] = useState<string[]>([]);

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
      description: {
        en: draft.description.en || '',
        zh: draft.description.zh || '',
        th: draft.description.th || '',
      },
      tags: draft.tags || [],
      is_featured: draft.is_featured || false,
      event_date: draft.event_date || '',
    });
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingItem(null);
  }, []);

  /**
   * Save edit changes
   */
  const handleSaveEdit = useCallback(async () => {
    if (!editingItem) return;

    try {
      const response = await fetch(`/api/admin/drafts/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error('Update failed');

      // Refresh to get updated data
      await fetchDrafts();
      handleCloseEdit();
      showToast('ITEM_UPDATED');
    } catch (error) {
      showToast('UPDATE_FAILED', 'error');
    }
  }, [editingItem, editForm, fetchDrafts, handleCloseEdit, showToast]);

  /**
   * Translation function
   */
  const handleTranslate = useCallback(async (targetLang: 'zh' | 'th', isBatch = false) => {
    const form = isBatch ? batchEditForm : editForm;

    if (!form.title.en && !form.description.en) {
      showToast('NO_ENG_CONTENT', 'error');
      return;
    }

    setTranslating(true);
    try {
      const response = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.en,
          description: form.description.en,
          targetLang,
        }),
      });

      if (!response.ok) throw new Error('Translation failed');

      const result = await response.json();
      if (result.success) {
        const setter = isBatch ? setBatchEditForm : setEditForm;
        setter(prev => ({
          ...prev,
          title: { ...prev.title, [targetLang]: result.data.title || '' },
          description: { ...prev.description, [targetLang]: result.data.description || '' },
        }));
        showToast('TRANSLATION_SUCCESS');
      }
    } catch (error) {
      showToast('TRANSLATION_FAILED', 'error');
    } finally {
      setTranslating(false);
    }
  }, [editForm, batchEditForm, showToast]);

  /**
   * Batch edit functions
   */
  const handleOpenBatchEdit = useCallback((selectedIds: Set<string>) => {
    const selectedItems = drafts.filter(d => selectedIds.has(d.id));
    if (selectedItems.length === 0) return;

    // Initialize with first item's data
    const firstItem = selectedItems[0];
    setBatchEditForm({
      title: {
        en: firstItem.title.en || '',
        zh: firstItem.title.zh || '',
        th: firstItem.title.th || '',
      },
      description: {
        en: firstItem.description.en || '',
        zh: firstItem.description.zh || '',
        th: firstItem.description.th || '',
      },
      tags: firstItem.tags || [],
      is_featured: firstItem.is_featured || false,
      event_date: firstItem.event_date || '',
    });
    setBatchOrder(Array.from(selectedIds));
    setBatchEditing(true);
  }, [drafts]);

  const handleCloseBatchEdit = useCallback(() => {
    setBatchEditing(false);
  }, []);

  const handleMoveItem = useCallback((index: number, direction: 'up' | 'down') => {
    const newOrder = [...batchOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setBatchOrder(newOrder);
  }, [batchOrder]);

  const handleSaveBatchEdit = useCallback(async (selectedIds: Set<string>) => {
    const selectedItems = drafts.filter(d => selectedIds.has(d.id));

    try {
      // Update each item with its order
      const updatePromises = selectedItems.map(async (item, index) => {
        const response = await fetch(`/api/admin/drafts/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...batchEditForm,
            sequence_order: index,
          }),
        });
        return response.json();
      });

      await Promise.all(updatePromises);

      // Refresh drafts
      await fetchDrafts();
      handleCloseBatchEdit();
      showToast('BATCH_UPDATE_SUCCESS');
    } catch (error) {
      showToast('BATCH_UPDATE_FAILED', 'error');
    }
  }, [batchEditForm, drafts, fetchDrafts, handleCloseBatchEdit, showToast]);

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

    // Batch edit
    batchEditing,
    batchEditForm,
    setBatchEditForm,
    batchOrder,
    handleOpenBatchEdit,
    handleCloseBatchEdit,
    handleMoveItem,
    handleSaveBatchEdit,

    // Translation
    translating,
    handleTranslate,

    // Delete confirmation
    deleteConfirm,
    showDeleteConfirm,
    hideDeleteConfirm,
  };
}
