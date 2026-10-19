/**
 * Drafts Folder Rail (layout B)
 *
 * The inbox is grouped by project, the way a folder pane works: one entry for
 * every project that still has drafts, plus a pinned bucket for drafts that
 * were never linked to anything. Selecting a folder only narrows the grid on
 * the right - it never changes a draft's ownership.
 */

'use client';

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
}

export function DraftsFolderRail({ folders, activeId, onSelect, loading }: DraftsFolderRailProps) {
  const { t } = useAdminLang();

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
          return (
            <li key={folder.id}>
              <button
                type="button"
                onClick={() => onSelect(folder.id)}
                aria-current={active ? 'true' : undefined}
                className={`w-full flex items-center gap-2 px-2.5 py-2 text-left transition-colors border-l-2 ${
                  active
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
                      active ? 'text-foreground' : unassigned ? 'text-amber-300/90' : 'text-ink-2'
                    }`}
                    title={folder.title}
                  >
                    {folder.title}
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
