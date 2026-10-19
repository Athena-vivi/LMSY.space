/**
 * Draft Inbox Page (Refactored)
 *
 * This is now a thin composition layer that assembles all modular components.
 * All business logic has been extracted to hooks.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DraftsHeader,
  DraftsFilterBar,
  DraftsContent,
  DraftsActionsBar,
  DraftsFolderRail,
  DraftsToast,
  DeleteConfirmModal,
  EditModal,
  BatchEditModal,
  LinkProjectModal,
  type DraftFolder,
} from './components';
import { useDrafts } from './hooks/use-drafts';
import { useDraftActions } from './hooks/use-draft-actions';
import { useDraftForms } from './hooks/use-draft-forms';
import { useAdminLang } from '@/lib/admin-i18n';
import type { DraftItem } from '@/lib/supabase/types';

function thumbOf(drafts: DraftItem[]): string | null {
  const withMedia = drafts.find((d) => d.media_type === 'image' && d.r2_media_url);
  return withMedia?.r2_media_url ?? null;
}

export default function DraftsPage() {
  const { t } = useAdminLang();

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

  const [linkProjectDraftId, setLinkProjectDraftId] = useState<string | null>(null);

  // Folder pane (layout B). Purely a way of looking at the inbox: selecting a
  // folder never writes anything, and drafts keep whatever project they had.
  const [activeFolder, setActiveFolder] = useState('all');
  const [projectTitles, setProjectTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/admin/projects', { cache: 'no-store' });
        const result = await response.json();
        if (cancelled || !result?.projects) return;
        const map: Record<string, string> = {};
        for (const project of result.projects as Array<{ id: string; title?: string; slug?: string }>) {
          map[project.id] = project.title || project.slug || project.id;
        }
        setProjectTitles(map);
      } catch {
        // A missing project name only costs a label; the grouping still works
        // on project_id, so there is nothing to recover from here.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const folders = useMemo<DraftFolder[]>(() => {
    const groups = new Map<string, DraftItem[]>();
    const orphans: DraftItem[] = [];

    for (const draft of draftsState.drafts) {
      if (!draft.project_id) {
        orphans.push(draft);
        continue;
      }
      const bucket = groups.get(draft.project_id);
      if (bucket) bucket.push(draft);
      else groups.set(draft.project_id, [draft]);
    }

    const projectFolders: DraftFolder[] = [...groups.entries()]
      .map(([id, items]) => ({
        id,
        title: projectTitles[id] || '…',
        count: items.length,
        thumb: thumbOf(items),
        tone: 'project' as const,
      }))
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));

    const list: DraftFolder[] = [
      {
        id: 'all',
        title: t('d.folders.all'),
        count: draftsState.drafts.length,
        thumb: null,
        tone: 'all',
      },
    ];

    if (orphans.length > 0) {
      list.push({
        id: 'unassigned',
        title: t('d.folders.unassigned'),
        count: orphans.length,
        thumb: thumbOf(orphans),
        tone: 'unassigned',
      });
    }

    return [...list, ...projectFolders];
  }, [draftsState.drafts, projectTitles, t]);

  const visibleDrafts = useMemo(() => {
    if (activeFolder === 'all') return draftsState.filteredDrafts;
    if (activeFolder === 'unassigned') {
      return draftsState.filteredDrafts.filter((d) => !d.project_id);
    }
    return draftsState.filteredDrafts.filter((d) => d.project_id === activeFolder);
  }, [draftsState.filteredDrafts, activeFolder]);

  // Select-all must only reach the drafts currently on screen, otherwise a
  // folder view would silently select items the curator cannot see.
  const toggleSelectAllVisible = () => {
    const ids = visibleDrafts.map((d) => d.id);
    const allSelected = ids.length > 0 && ids.every((id) => draftsState.selectedIds.has(id));
    draftsState.setSelectedIds(allSelected ? new Set<string>() : new Set(ids));
  };

  const activeFolderLabel = folders.find((f) => f.id === activeFolder)?.title ?? '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <DraftsHeader />

      <div className="grid gap-6 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <DraftsFolderRail
            folders={folders}
            activeId={activeFolder}
            onSelect={setActiveFolder}
            loading={draftsState.loading}
          />
        </aside>

        <div className="min-w-0 space-y-6">
          {/* Below lg the rail collapses into a select so the folder is still reachable */}
          <div className="lg:hidden">
            <label className="sr-only" htmlFor="draft-folder-select">
              {t('d.folders.select')}
            </label>
            <select
              id="draft-folder-select"
              value={activeFolder}
              onChange={(e) => setActiveFolder(e.target.value)}
              className="w-full px-3 py-2 bg-transparent text-ink-2 text-xs font-mono focus:outline-none border border-white/10 focus:border-lmsy-yellow/40 tracking-wider"
            >
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.title} ({folder.count})
                </option>
              ))}
            </select>
          </div>

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
            filteredDrafts={visibleDrafts}
            selectedIds={draftsState.selectedIds}
            toggleSelectAll={toggleSelectAllVisible}
            fetchDrafts={draftsState.fetchDrafts}
            loading={draftsState.loading}
          />

          {/* Content */}
          <DraftsContent
            drafts={draftsState.drafts}
            filteredDrafts={visibleDrafts}
            loading={draftsState.loading}
            selectedIds={draftsState.selectedIds}
            onToggleSelect={draftsState.toggleSelect}
            onPublish={actions.handlePublish}
            onUnpublish={actions.handleUnpublish}
            onCreateProject={actions.handleCreateProject}
            onLinkExistingProject={setLinkProjectDraftId}
            onAddToAssets={actions.handleAddToAssets}
            onSetMilestone={actions.handleSetMilestone}
            onEdit={forms.handleOpenEdit}
            onDelete={(id, r2Key) => {
              const result = actions.handleDelete(id, r2Key);
              forms.showDeleteConfirm(result.id, result.r2Key);
            }}
          />
        </div>
      </div>

      {/* Floating Batch Action Bar */}
      <DraftsActionsBar
        selectedIds={draftsState.selectedIds}
        onBatchPublish={actions.handleBatchPublish}
        onBatchToGallery={actions.handleBatchToGallery}
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

      <LinkProjectModal
        draftId={linkProjectDraftId}
        isOpen={linkProjectDraftId !== null}
        onClose={() => setLinkProjectDraftId(null)}
        onSelect={actions.handleLinkExistingProject}
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

      {/* Screen-reader only: which folder is open */}
      <span className="sr-only" aria-live="polite">
        {activeFolderLabel}
      </span>
    </div>
  );
}
