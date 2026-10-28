'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { X, Loader2, MoveRight, Check, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getImageUrl } from '@/lib/image-url';

export interface MoveAsset {
  id: string;
  image_url: string;
  catalog_id: string | null;
  rotation: number | null;
}

export interface MoveProject {
  id: string;
  title: string;
  category: string | null;
  project_kind?: string | null;
  catalog_id?: string | null;
}

interface MoveAssetsPanelProps {
  open: boolean;
  onClose: () => void;
  sourceProject: MoveProject | null;
  assets: MoveAsset[];
  projects: MoveProject[];
  onMoved: (info: { moved: number; sourceProjectId: string; sourceEmptied: boolean }) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

interface ConflictRow {
  assetId: string;
  catalogId: string | null;
  reason: string;
}

/**
 * Move pictures from the selected event into another one.
 *
 * The server re-numbers each picture under the target event and moves the file
 * to its new key, so the target column only has to say where they go. That
 * column sits on the left and is only as wide as its widest event name - there
 * are hundreds of events but each name is short, while the pictures need every
 * pixel left over. A search box narrows the list, because scrolling 351 rows to
 * find one is the actual cost here.
 *
 * A drag carries one picture; the checkboxes carry a batch. Dropping a picture
 * that is part of the current selection moves the whole selection, which is
 * what a curator expects after ticking a few boxes.
 */
export default function MoveAssetsPanel({
  open,
  onClose,
  sourceProject,
  assets,
  projects,
  onMoved,
  showToast,
}: MoveAssetsPanelProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [query, setQuery] = useState('');

  const targets = useMemo(() => {
    const others = projects.filter((project) => project.id !== sourceProject?.id);
    const groups = new Map<string, MoveProject[]>();
    for (const project of others) {
      const key = project.category || 'other';
      const bucket = groups.get(key) ?? [];
      bucket.push(project);
      groups.set(key, bucket);
    }
    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [projects, sourceProject?.id]);

  const target = projects.find((project) => project.id === targetId) ?? null;

  /**
   * Narrow the target list to what the curator types. Matches the title, the
   * catalog code and the door name, so "feat", "social" and "LMSY-FEAT-DAILY"
   * all find the same row. Empty groups drop out instead of leaving headers.
   */
  const visibleTargets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return targets;

    return targets
      .map((group) => ({
        ...group,
        items: group.items.filter((project) =>
          [project.title, project.catalog_id, project.project_kind, group.category]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(needle))
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [targets, query]);

  const matchCount = useMemo(
    () => visibleTargets.reduce((total, group) => total + group.items.length, 0),
    [visibleTargets]
  );

  const toggle = (assetId: string) => {
    setSelected((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const move = async (assetIds: string[], destinationId: string) => {
    if (busy || !sourceProject || assetIds.length === 0) return;

    setBusy(true);
    setConflicts([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const response = await fetch('/api/admin/gallery/move-assets', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ assetIds, targetProjectId: destinationId }),
      });

      const result = await response.json();

      if (response.status === 409 && Array.isArray(result.conflicts)) {
        setConflicts(result.conflicts as ConflictRow[]);
        showToast(`无法迁移：${result.conflicts[0]?.reason ?? '目标编号已被占用'}`, 'error');
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Move failed');
      }

      const sourceInfo = (result.sources as Array<{ projectId: string; remaining: number }> | undefined)
        ?.find((item) => item.projectId === sourceProject.id);

      setSelected([]);
      showToast(`已迁走 ${result.moved} 张`);
      onMoved({
        moved: result.moved as number,
        sourceProjectId: sourceProject.id,
        sourceEmptied: sourceInfo?.remaining === 0,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '迁移失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDrop = (event: React.DragEvent, destinationId: string) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('text/plain') || dragging;
    setDragging(null);
    if (!draggedId) return;

    const ids = selected.includes(draggedId) ? selected : [draggedId];
    setTargetId(destinationId);
    void move(ids, destinationId);
  };

  if (!open || !sourceProject) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm" onClick={busy ? undefined : onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex h-[86vh] w-full max-w-6xl flex-col border bg-[#0a0a0a]"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
            <div className="min-w-0">
              <h2 className="truncate font-serif text-base text-ink">迁移图片</h2>
              <p className="mt-0.5 truncate font-mono text-[10px] tracking-wider text-ink-2">
                {sourceProject.title} · {assets.length} 张 · 已选 {selected.length} 张
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={busy}
              className="text-ink-2 transition-colors hover:text-ink disabled:opacity-30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* Targets - width follows the widest event name, never a fixed half */}
            <div
              className="order-1 flex min-h-0 w-full shrink-0 flex-col border-b md:w-max md:max-w-[360px] md:min-w-[220px] md:border-b-0 md:border-r"
              style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <div className="border-b px-3 py-2" style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}>
                <div className="flex items-center gap-2 border border-white/10 bg-black/60 px-2 py-1.5">
                  <Search className="h-3 w-3 shrink-0 text-ink-2/50" strokeWidth={2} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索事件名称或编号"
                    className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-ink outline-none placeholder:text-ink-2/40"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="shrink-0 text-ink-2/50 transition-colors hover:text-ink"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-ink-2/50">
                  目标事件 · 拖到某一行 · {query ? `${matchCount} 个匹配` : `${matchCount} 个`}
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {visibleTargets.length === 0 ? (
                  <p className="px-1 py-6 text-center font-mono text-[10px] text-ink-2/40">
                    没有匹配的事件
                  </p>
                ) : (
                  <div className="space-y-3">
                    {visibleTargets.map((group) => (
                      <div key={group.category}>
                        <p className="mb-1 px-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-2/50">
                          {group.category}
                        </p>
                        <div className="space-y-1">
                          {group.items.map((project) => {
                            const isTarget = project.id === targetId;
                            return (
                              <div
                                key={project.id}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => handleDrop(event, project.id)}
                                onClick={() => setTargetId(project.id)}
                                className={`cursor-pointer border px-2 py-1.5 transition-colors ${
                                  isTarget
                                    ? 'border-lmsy-yellow/60 bg-lmsy-yellow/[0.08]'
                                    : 'border-transparent hover:border-white/15 hover:bg-white/[0.03]'
                                }`}
                              >
                                <p className="truncate font-mono text-[11px] text-ink">{project.title}</p>
                                <p className="truncate font-mono text-[9px] text-ink-2/60">
                                  {project.catalog_id || project.project_kind || '—'}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Source pictures - takes everything the list does not need */}
            <div className="order-2 min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-ink-2/70">
                源事件 · 点选或直接拖拽
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {assets.map((asset) => {
                  const imageUrl = getImageUrl(asset.image_url);
                  const isSelected = selected.includes(asset.id);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      draggable={!busy}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', asset.id);
                        setDragging(asset.id);
                      }}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => toggle(asset.id)}
                      className={`relative aspect-[3/4] overflow-hidden border transition-colors ${
                        isSelected ? 'border-lmsy-yellow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={asset.catalog_id || ''}
                          fill
                          className="object-cover"
                          style={{ transform: `rotate(${asset.rotation ?? 0}deg)` }}
                          unoptimized
                        />
                      ) : null}
                      {isSelected && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center bg-lmsy-yellow text-black">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-left font-mono text-[8px] text-ink-2">
                        {asset.catalog_id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t px-5 py-3" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
            <p className="min-w-0 flex-1 truncate font-mono text-[10px] text-ink-2/70">
              {conflicts.length > 0
                ? `${conflicts.length} 张无法迁移：${conflicts[0].reason}`
                : target
                  ? `将迁到：${target.title}`
                  : '先在左侧选一个目标事件'}
            </p>
            <button
              onClick={() => target && move(selected, target.id)}
              disabled={busy || selected.length === 0 || !target}
              className="flex shrink-0 items-center gap-2 border border-lmsy-yellow/30 bg-lmsy-yellow/[0.06] px-3 py-2 font-mono text-[11px] text-lmsy-yellow/90 transition-colors hover:bg-lmsy-yellow/[0.12] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
              ) : (
                <MoveRight className="h-3 w-3" strokeWidth={1.5} />
              )}
              迁移 {selected.length} 张
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
