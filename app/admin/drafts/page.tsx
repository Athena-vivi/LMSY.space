/**
 * Draft Inbox Page
 *
 * Thin composition layer. Since pictures are filed straight into events via
 * the promote wizard, the page is a flat grid: filter, review, promote. The
 * old project-folder rail is gone - project management is where events live.
 */

'use client';

import { useState } from 'react';
import {
  DraftsHeader,
  DraftsFilterBar,
  DraftsContent,
  DraftsActionsBar,
  DraftsToast,
  DeleteConfirmModal,
  EditModal,
  PromoteWizardModal,
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

  // Self-serve promotion wizard: pick event + class, one click transcribes,
  // uploads and files the selected drafts under their catalog ids.
  const [promoteDraftIds, setPromoteDraftIds] = useState<string[] | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <DraftsHeader />

      <div className="min-w-0 space-y-6">
        {/* Filter Bar */}
        <DraftsFilterBar
          searchQuery={draftsState.searchQuery}
          setSearchQuery={draftsState.setSearchQuery}
          filterStatus={draftsState.filterStatus}
          setFilterStatus={draftsState.setFilterStatus}
          filterMediaType={draftsState.filterMediaType}
          setFilterMediaType={draftsState.setFilterMediaType}
          filterBatchId={draftsState.filterBatchId}
          setFilterBatchId={draftsState.setFilterBatchId}
          filterProjectId={draftsState.filterProjectId}
          setFilterProjectId={draftsState.setFilterProjectId}
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
          onEdit={forms.handleOpenEdit}
          onDelete={(id, r2Key) => {
            const result = actions.handleDelete(id, r2Key);
            forms.showDeleteConfirm(result.id, result.r2Key);
          }}
        />
      </div>

      {/* Floating Batch Action Bar */}
      <DraftsActionsBar
        selectedIds={draftsState.selectedIds}
        onPromote={(ids) => setPromoteDraftIds(ids)}
        onBatchDelete={() => {
          const result = actions.handleBatchDelete();
          forms.showDeleteConfirm(undefined, undefined, result.count);
        }}
        onClearSelection={() => draftsState.setSelectedIds(new Set())}
      />

      {/* Toast Notification */}
      <DraftsToast toast={draftsState.toast} />

      {/* Edit Modal */}
      <EditModal
        editingItem={forms.editingItem}
        editForm={forms.editForm}
        setEditForm={forms.setEditForm}
        onClose={forms.handleCloseEdit}
        onSave={forms.handleSaveEdit}
      />

      <PromoteWizardModal
        isOpen={promoteDraftIds !== null}
        draftIds={promoteDraftIds ?? []}
        onClose={() => setPromoteDraftIds(null)}
        onDone={(message) => {
          draftsState.setSelectedIds(new Set());
          void draftsState.fetchDrafts();
          draftsState.showToast(message);
        }}
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
