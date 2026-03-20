/**
 * useDraftForms - Form State Management Hook
 *
 * Manages edit modal and batch edit modal states
 */

'use client';

import { useState, useCallback } from 'react';
import type { DraftItem } from '@/lib/supabase/types';
import { normalizeLocalizedText } from '@/lib/localized-content';
import { translateFieldMap, type AdminTranslateTarget } from '@/lib/admin-translate';

interface DraftFormState {
  title: { en: string; zh: string; th: string };
  description: { en: string; zh: string; th: string };
  tags: string[];
  is_featured: boolean;
  event_date: string;
  chronicle_visible: boolean;
  chronicle_title: { en: string; zh: string; th: string };
  chronicle_excerpt: { en: string; zh: string; th: string };
}

const emptyFormState: DraftFormState = {
  title: { en: '', zh: '', th: '' },
  description: { en: '', zh: '', th: '' },
  tags: [],
  is_featured: false,
  event_date: '',
  chronicle_visible: true,
  chronicle_title: { en: '', zh: '', th: '' },
  chronicle_excerpt: { en: '', zh: '', th: '' },
};

function buildDraftPayload(form: DraftFormState) {
  return {
    ...form,
    chronicle_title: form.chronicle_title.en || form.chronicle_title.zh || form.chronicle_title.th || '',
    chronicle_excerpt: form.chronicle_excerpt.en || form.chronicle_excerpt.zh || form.chronicle_excerpt.th || '',
    chronicle_title_i18n: form.chronicle_title,
    chronicle_excerpt_i18n: form.chronicle_excerpt,
  };
}

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
      chronicle_visible: draft.chronicle_visible ?? true,
      chronicle_title: normalizeLocalizedText(draft.chronicle_title_i18n, draft.chronicle_title || ''),
      chronicle_excerpt: normalizeLocalizedText(draft.chronicle_excerpt_i18n, draft.chronicle_excerpt || ''),
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
        body: JSON.stringify(buildDraftPayload(editForm)),
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
  const handleTranslate = useCallback(async (targetLang: AdminTranslateTarget, isBatch = false) => {
    const form = isBatch ? batchEditForm : editForm;

    const hasEnglishSource =
      !!form.title.en.trim() ||
      !!form.description.en.trim() ||
      !!form.chronicle_title.en.trim() ||
      !!form.chronicle_excerpt.en.trim();

    if (!hasEnglishSource) {
      showToast('NO_ENG_CONTENT', 'error');
      return;
    }

    setTranslating(true);
    try {
      const translated = await translateFieldMap(
        {
          title: form.title.en,
          description: form.description.en,
          chronicleTitle: form.chronicle_title.en,
          chronicleExcerpt: form.chronicle_excerpt.en,
        },
        targetLang,
        {
          title: 'title',
          description: 'description',
          chronicleTitle: 'title',
          chronicleExcerpt: 'description',
        }
      );

      const setter = isBatch ? setBatchEditForm : setEditForm;
      setter(prev => ({
        ...prev,
        title: { ...prev.title, [targetLang]: translated.title || '' },
        description: { ...prev.description, [targetLang]: translated.description || '' },
        chronicle_title: { ...prev.chronicle_title, [targetLang]: translated.chronicleTitle || '' },
        chronicle_excerpt: { ...prev.chronicle_excerpt, [targetLang]: translated.chronicleExcerpt || '' },
      }));
      showToast('TRANSLATION_SUCCESS');
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
      chronicle_visible: firstItem.chronicle_visible ?? true,
      chronicle_title: normalizeLocalizedText(firstItem.chronicle_title_i18n, firstItem.chronicle_title || ''),
      chronicle_excerpt: normalizeLocalizedText(firstItem.chronicle_excerpt_i18n, firstItem.chronicle_excerpt || ''),
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
            ...buildDraftPayload(batchEditForm),
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
