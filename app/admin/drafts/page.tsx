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
  RenameProjectModal,
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

/**
 * Which folder the rail should open on.
 *
 * Prefer a folder that actually holds work (unassigned bucket or a project
 * with drafts); empty project folders are listed for filing new images but
 * should not grab the landing spot. Falls back to the first non-"all" entry,
 * then "all".
 */
function landingFolderId(folders: DraftFolder[]): string {
  return (
    folders.find((folder) => folder.tone !== 'all' && folder.count > 0)?.id ??
    folders.find((folder) => folder.tone !== 'all')?.id ??
    folders[0]?.id ??
    ''
  );
}

export default function DraftsPage() {
  const { lang, t } = useAdminLang();

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
  // Quick rename straight from the folder rail - project management is where
  // the full form lives, but a name fix should not require hunting for it.
  const [renamingProject, setRenamingProject] = useState<{ id: string; title: string } | null>(null);

  const handleProjectRenamed = (id: string, title: string) => {
    setProjectTitles((prev) => ({ ...prev, [id]: title }));
    draftsState.showToast(
      lang === 'en' ? `Project renamed to ${title}` : `已重命名为「${title}」`
    );
  };

  // Folder pane (layout B). Purely a way of looking at the inbox: selecting a
  // folder never writes anything, and drafts keep whatever project they had.
  //
  // The rail is a work list, so the folder it opens on is the one that still
  // needs the most attention, not a fixed entry: unassigned first, otherwise
  // the smallest project (a project with hundreds of images is already done).
  // Empty until the first load settles - see the effect below.
  const [activeFolder, setActiveFolder] = useState('');
  const [projectTitles, setProjectTitles] = useState<Record<string, string>>({});
  const [projectOrder, setProjectOrder] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/admin/projects', { cache: 'no-store' });
        const result = await response.json();
        if (cancelled || !result?.projects) return;
        const map: Record<string, string> = {};
        const order: string[] = [];
        for (const project of result.projects as Array<{ id: string; title?: string; slug?: string }>) {
          map[project.id] = project.title || project.slug || project.id;
          order.push(project.id);
        }
        setProjectTitles(map);
        setProjectOrder(order);
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
      .sort((a, b) => a.count - b.count || a.title.localeCompare(b.title));

    // Every project from project management gets a folder, even when it holds
    // no drafts yet - an empty folder is where new images get filed, so it
    // must be visible and clickable. They sit after the projects that have
    // drafts (work first), ordered by name.
    const knownEmpty: DraftFolder[] = projectOrder
      .filter((id) => !groups.has(id))
      .map((id) => ({
        id,
        title: projectTitles[id] || '…',
        count: 0,
        thumb: null,
        tone: 'project' as const,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    // Order reflects what the rail is for: this is a work list, so the bucket
    // that still needs a decision sits on top, the projects with drafts below
    // it, then the empty project folders, and the read-only "everything" view
    // last where it is out of the way.
    const list: DraftFolder[] = [];

    if (orphans.length > 0) {
      list.push({
        id: 'unassigned',
        title: t('d.folders.unassigned'),
        count: orphans.length,
        thumb: thumbOf(orphans),
        tone: 'unassigned',
      });
    }

    list.push(...projectFolders, ...knownEmpty, {
      id: 'all',
      title: t('d.folders.all'),
      count: draftsState.drafts.length,
      thumb: null,
      tone: 'all',
    });

    return list;
  }, [draftsState.drafts, projectTitles, projectOrder, t]);

  // One rule covers two cases: the initial pick (activeFolder starts empty,
  // because the right folder is only knowable once the drafts are in) and a
  // folder vanishing under the curator - unfiling the last orphan removes the
  // unassigned bucket, and emptying a project folder removes that one. Neither
  // may leave the grid pointing at a folder that no longer exists.
  useEffect(() => {
    if (draftsState.loading) return;
    if (folders.some((folder) => folder.id === activeFolder)) return;
    setActiveFolder(landingFolderId(folders));
  }, [draftsState.loading, folders, activeFolder]);

  // Read through this instead of activeFolder: on the very first render the
  // state is still empty, and a folder that has just been emptied is gone from
  // the list. Both resolve to the landing folder without waiting for the
  // effect, so the grid never flashes an empty folder.
  const effectiveFolder = folders.some((folder) => folder.id === activeFolder)
    ? activeFolder
    : landingFolderId(folders);

  const visibleDrafts = useMemo(() => {
    if (effectiveFolder === 'all') return draftsState.filteredDrafts;
    if (effectiveFolder === 'unassigned') {
      return draftsState.filteredDrafts.filter((d) => !d.project_id);
    }
    return draftsState.filteredDrafts.filter((d) => d.project_id === effectiveFolder);
  }, [draftsState.filteredDrafts, effectiveFolder]);

  // Select-all must only reach the drafts currently on screen, otherwise a
  // folder view would silently select items the curator cannot see.
  const toggleSelectAllVisible = () => {
    const ids = visibleDrafts.map((d) => d.id);
    const allSelected = ids.length > 0 && ids.every((id) => draftsState.selectedIds.has(id));
    draftsState.setSelectedIds(allSelected ? new Set<string>() : new Set(ids));
  };

  const activeFolderLabel = folders.find((f) => f.id === effectiveFolder)?.title ?? '';

  // Dragging carries the whole selection when the grabbed card is part of it,
  // otherwise just the grabbed card - the same rule a file manager uses.
  const handleDragStartDraft = (id: string, event: React.DragEvent<HTMLDivElement>) => {
    const ids = draftsState.selectedIds.has(id) ? Array.from(draftsState.selectedIds) : [id];
    const payload = JSON.stringify({ draftIds: ids });
    event.dataTransfer.setData('application/x-lmsy-drafts', payload);
    event.dataTransfer.setData('text/plain', payload);
  };

  const handleDropOnFolder = async (folderId: string, payload: string) => {
    let ids: string[] = [];
    try {
      const parsed = JSON.parse(payload);
      ids = Array.isArray(parsed?.draftIds)
        ? parsed.draftIds.filter((value: unknown): value is string => typeof value === 'string')
        : [];
    } catch {
      return;
    }
    if (ids.length === 0) return;

    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    const affected = draftsState.drafts.filter((draft) => ids.includes(draft.id));
    if (affected.length === 0) return;

    const unlink = folderId === 'unassigned';
    if (!unlink && affected.every((draft) => draft.project_id === folderId)) {
      draftsState.showToast('DROPPED_ON_ITSELF');
      return;
    }

    // Move them in the UI first so the grid responds to the gesture, then write.
    for (const draft of affected) {
      draftsState.updateDraftOptimistically(draft.id, { project_id: unlink ? null : folderId });
    }
    draftsState.setSelectedIds(new Set<string>());

    try {
      const response = await fetch('/api/admin/drafts/batch-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unlink ? { ids, unlink: true } : { ids, projectId: folderId }),
      });
      if (!response.ok) throw new Error('batch-link failed');

      const count = affected.length;
      const plural = count > 1 ? (lang === 'en' ? 's' : '') : '';
      draftsState.showToast(
        unlink
          ? lang === 'en'
            ? `Unfiled ${count} item${plural}`
            : `已移出项目 · ${count} 张`
          : lang === 'en'
            ? `Filed ${count} item${plural} under ${folder.title}`
            : `已归入「${folder.title}」· ${count} 张`
      );
    } catch {
      await draftsState.fetchDrafts();
      draftsState.showToast('MOVE_FAILED', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <DraftsHeader />

      <div className="grid gap-6 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <DraftsFolderRail
            folders={folders}
            activeId={effectiveFolder}
            onSelect={setActiveFolder}
            loading={draftsState.loading}
            onDropOnFolder={handleDropOnFolder}
            onRenameFolder={(folder) => setRenamingProject({ id: folder.id, title: folder.title })}
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
              value={effectiveFolder}
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
            onDragStartDraft={handleDragStartDraft}
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

      <RenameProjectModal
        project={renamingProject}
        isOpen={renamingProject !== null}
        onClose={() => setRenamingProject(null)}
        onSaved={handleProjectRenamed}
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
