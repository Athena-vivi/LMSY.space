/**
 * Draft Inbox Page (Refactored)
 *
 * This is now a thin composition layer that assembles all modular components.
 * All business logic has been extracted to hooks.
 */

'use client';

import { useState } from 'react';
import type { DraftItem } from '@/lib/supabase/types';
import {
  DraftsHeader,
  DraftsFilterBar,
  DraftsContent,
  DraftsActionsBar,
  DraftsToast,
  DeleteConfirmModal,
  EditModal,
  BatchEditModal,
} from './components';
import { useDrafts } from './hooks/use-drafts';
import { useDraftActions } from './hooks/use-draft-actions';
import { useDraftForms } from './hooks/use-draft-forms';

export default function DraftsPage() {
  // Core data state
  const draftsState = useDrafts();

  // CRUD operations
  const actions = useDraftActions(draftsState);

  // Form state
  const forms = useDraftForms({
    drafts: draftsState.drafts,
    fetchDrafts: draftsState.fetchDrafts,
    showToast: draftsState.showToast,
  });

  // Local video hover state
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <DraftsHeader />

      {/* Filter Bar */}
      <DraftsFilterBar
        searchQuery={draftsState.searchQuery}
        setSearchQuery={draftsState.setSearchQuery}
        filterStatus={draftsState.filterStatus}
        setFilterStatus={draftsState.setFilterStatus}
        filterMediaType={draftsState.filterMediaType}
        setFilterMediaType={draftsState.setFilterMediaType}
        filteredDrafts={draftsState.filteredDrafts}
        selectedIds={draftsState.selectedIds}
        toggleSelectAll={draftsState.toggleSelectAll}
        fetchDrafts={draftsState.fetchDrafts}
        loading={draftsState.loading}
      />

      {/* Content */}
      <DraftsContent
        drafts={draftsState.drafts}
        filteredDrafts={draftsState.filteredDrafts}
        loading={draftsState.loading}
        selectedIds={draftsState.selectedIds}
        onToggleSelect={draftsState.toggleSelect}
        onPublish={actions.handlePublish}
        onUnpublish={actions.handleUnpublish}
        onEdit={forms.handleOpenEdit}
        onDelete={(id, r2Key) => {
          const result = actions.handleDelete(id, r2Key);
          forms.showDeleteConfirm(result.id, result.r2Key);
        }}
      />

      {/* Floating Batch Action Bar */}
      <DraftsActionsBar
        selectedIds={draftsState.selectedIds}
        onBatchPublish={actions.handleBatchPublish}
        onBatchDelete={() => {
          const result = actions.handleBatchDelete();
          forms.showDeleteConfirm(undefined, undefined, result.count);
        }}
        onBatchEdit={() => forms.handleOpenBatchEdit(draftsState.selectedIds)}
        onClearSelection={() => draftsState.setSelectedIds(new Set())}
      />

      {/* Toast Notification */}
      <DraftsToast toast={draftsState.toast} />

      {/* Edit Modal */}
      <EditModal
        editingItem={forms.editingItem}
        editForm={forms.editForm}
        setEditForm={forms.setEditForm}
        translating={forms.translating}
        onClose={forms.handleCloseEdit}
        onSave={forms.handleSaveEdit}
        onTranslate={forms.handleTranslate}
      />

      {/* Batch Edit Modal */}
      <BatchEditModal
        drafts={draftsState.drafts}
        batchEditing={forms.batchEditing}
        batchEditForm={forms.batchEditForm}
        setBatchEditForm={forms.setBatchEditForm}
        batchOrder={forms.batchOrder}
        translating={forms.translating}
        selectedIds={draftsState.selectedIds}
        onClose={forms.handleCloseBatchEdit}
        onSave={() => forms.handleSaveBatchEdit(draftsState.selectedIds)}
        onTranslate={forms.handleTranslate}
        onMoveItem={forms.handleMoveItem}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        deleteConfirm={forms.deleteConfirm}
        onClose={forms.hideDeleteConfirm}
        onExecute={() => {
          if (forms.deleteConfirm.type === 'single') {
            actions.executeDelete(forms.deleteConfirm.id!);
          } else {
            actions.executeBatchDelete();
          }
        }}
      />
    </div>
  );
}
