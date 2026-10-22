/**
 * Drafts Folder Rail (layout B)
 *
 * The inbox is grouped by project, the way a folder pane works. The order is
 * not alphabetical: this is a work list, so the unassigned bucket sits on top
 * (it is the one that still needs a decision), projects with drafts follow
 * from the smallest to the largest - a project with hundreds of drafts is
 * usually done - then empty project folders (they exist so new images have
 * somewhere to be filed), and the read-only "all drafts" view is pinned to
 * the bottom, separated by a rule so it does not read as another folder.
 *
 * Selecting a folder only narrows the grid on the right - it never changes a
 * draft's ownership. Dropping a thumbnail on a folder is the one gesture that
 * does write, and it goes through the existing batch-link endpoint. Project
 * folders also carry a hover rename affordance, because a name fix should not
 * require a detour to project management.
 */

'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useAdminLang } from '@/lib/admin-i18n';

export interface DraftFolder {
  id: string;
  title: string;
  count: number;
  thumb?: string | null;
  tone: 'all' | 'unassigned' | 'project';
}

interface DraftsFolderRailProps {
  folders: DraftFolder[];
  activeId: string;
  onSelect: (id: string) => void;
  loading?: boolean;
  onDropOnFolder?: (folderId: string, payload: string) => void;
  onRenameFolder?: (folder: DraftFolder) => void;
}

export function DraftsFolderRail({
  folders,
  activeId,
  onSelect,
  loading,
  onDropOnFolder,
  onRenameFolder,
}: DraftsFolderRailProps) {
  const { t } = useAdminLang();
  const [overId, setOverId] = useState<string | null>(null);

  // "All drafts" is a view, not a place - only real projects and the unassigned
  // bucket accept a drop.
  const acceptsDrop = (folder: DraftFolder) => folder.tone !== 'all';

  return (
    <div className="border border-white/10 bg-white/[0.02]">
      <div className="px-3 py-2.5 border-b border-white/10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
          {t('d.folders.title')}
        </p>
      </div>

      <ul className="max-h-[calc(100vh-260px)] overflow-y-auto py-1">
        {loading && folders.length === 0 && (
          <li className="px-3 py-2 font-mono text-[11px] text-ink-2">{t('common.loading')}</li>
        )}

        {folders.map((folder) => {
          const active = folder.id === activeId;
          const unassigned = folder.tone === 'unassigned';
          const isOver = overId === folder.id;
          return (
            <li
              key={folder.id}
              onDragOver={(event) => {
                if (!acceptsDrop(folder)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (overId !== folder.id) setOverId(folder.id);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                setOverId((prev) => (prev === folder.id ? null : prev));
              }}
              onDrop={(event) => {
                if (!acceptsDrop(folder)) return;
                event.preventDefault();
                setOverId(null);
                const payload =
                  event.dataTransfer.getData('application/x-lmsy-drafts') ||
                  event.dataTransfer.getData('text/plain');
                if (payload) onDropOnFolder?.(folder.id, payload);
              }}
              className={
                folder.tone === 'all'
                  ? 'group mt-1 border-t border-white/10 pt-1'
                  : 'group relative' + (isOver ? ' ring-2 ring-inset ring-lmsy-yellow' : '')
              }
            >
              <button
                type="button"
                onClick={() => onSelect(folder.id)}
                aria-current={active ? 'true' : undefined}
                className={`w-full flex items-center gap-2 px-2.5 py-2 text-left transition-colors border-l-2 ${
                  isOver
                    ? 'border-lmsy-yellow bg-lmsy-yellow/15'
                    : active
                      ? 'border-lmsy-yellow bg-lmsy-yellow/[0.08]'
                      : 'border-transparent hover:bg-white/[0.04]'
                }`}
              >
                {folder.tone === 'all' ? (
                  <span className="h-7 w-7 shrink-0 bg-white/10" aria-hidden />
                ) : folder.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={folder.thumb}
                    alt=""
                    className="h-7 w-7 shrink-0 object-cover bg-white/5"
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <span
                    className={`h-7 w-7 shrink-0 ${unassigned ? 'bg-amber-500/20' : 'bg-white/10'}`}
                    aria-hidden
                  />
                )}

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[13px] leading-tight ${
                      isOver
                        ? 'text-lmsy-yellow'
                        : active
                          ? 'text-foreground'
                          : unassigned
                            ? 'text-amber-300/90'
                            : 'text-ink-2'
                    }`}
                    title={folder.title}
                  >
                    {isOver ? t('d.folders.dropHint') : folder.title}
                  </span>
                </span>

                <span
                  className={`shrink-0 font-mono text-[11px] tabular-nums ${
                    active ? 'text-lmsy-yellow' : 'text-ink-2'
                  }`}
                >
                  {folder.count}
                </span>
              </button>

              {/* Rename affordance: only real projects, revealed on hover so
                  the rail stays quiet until it is needed. Sits on top of the
                  main button as a sibling, never nested inside it. */}
              {folder.tone === 'project' && onRenameFolder && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRenameFolder(folder);
                  }}
                  title={t('d.folders.rename')}
                  aria-label={`${t('d.folders.rename')}: ${folder.title}`}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-ink-2 opacity-0 transition-opacity hover:text-lmsy-yellow focus:opacity-100 group-hover:opacity-100"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <p className="px-3 py-2 border-t border-white/10 font-mono text-[10px] leading-relaxed text-ink-2/70">
        {t('d.folders.dragHint')}
      </p>
    </div>
  );
}
