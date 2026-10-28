'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, ExternalLink, ImagePlus, Images, Loader2, Star, X } from 'lucide-react';
import { useAdminHeaders } from '@/app/(en)/admin/gallery/hooks/use-admin-headers';
import { VaultImagePicker } from '@/app/(en)/admin/gallery/components/vault-image-picker';
import { getCdnUrl } from '@/app/(en)/admin/gallery/utils';
import { useAdminLang } from '@/lib/admin-i18n';
import { t as translate, type Language } from '@/lib/languages';
import type { GalleryItem } from '@/lib/supabase';
import type { CurationDoor, CurationEvent, CurationShelf } from '@/lib/curation';

/**
 * /admin/curation - 门 -> 分类 -> 事件，一棵树
 *
 * The three cover levels used to live on three screens: the five homepage doors
 * in Asset Vault, the two soul-resonance halls next to them, an event's cover
 * on its own curation page. Nothing showed the archive the way a visitor walks
 * it, so a curator could not answer "which shelf still has no picture".
 *
 * This page is the archive's own shape. Picking a node shows the cover it
 * currently shows, whether that cover is pinned or derived, and the one button
 * that changes it. The write goes to whichever column owns that level:
 *   door      portal_slot / interview_slot
 *   category  category_slot (keyed by path)
 *   event     projects.cover_url
 */

type NodeRef =
  | { kind: 'door'; doorKey: string }
  | { kind: 'shelf'; doorKey: string; shelfKey: string }
  | { kind: 'event'; doorKey: string; shelfKey: string | null; eventId: string };

interface Panel {
  title: string;
  subtitle: string;
  cover: string | null;
  pinned: boolean;
  /** empty-state hint when the node cannot hold a cover */
  canHoldCover: boolean;
  galleryHref: string | null;
  eventCount: number;
  size: string;
}

export default function CurationPage() {
  const { lang } = useAdminLang();
  const authHeaders = useAdminHeaders();

  const [doors, setDoors] = useState<CurationDoor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<NodeRef | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  /** id of the row that currently holds the slot, needed to clear it */
  const [currentAssetId, setCurrentAssetId] = useState<string>('');

  // Per-class cover editing (live-events timeline boxes): the picked event's
  // declared classes, each with its own pictures to click-cover from.
  const [groupCovers, setGroupCovers] = useState<{
    loading: boolean;
    covers: Record<string, string>;
    groups: Array<{
      key: string;
      assets: Array<GalleryItem & { asset_group?: string | null; catalog_id?: string | null }>;
    }>;
  } | null>(null);

  // Class editing. A class is not a row of its own - its name is the text in
  // gallery_assets.asset_group - so "drag a picture to another class" writes
  // one column on one row and "rename a class" rewrites that value everywhere.
  const [dragAssetId, setDragAssetId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [groupBusy, setGroupBusy] = useState(false);

  // Resource-box covers (Bilibili / YouTube / photos / transcript): each box
  // of an entry, pinned to one of that entry's pictures. A talk has all four;
  // every other entry has the two video boxes, because the entry pages of the
  // other doors render those two. Same column either way
  // (projects.talk_resource_covers), the name is just older than the reach.
  const [talkCovers, setTalkCovers] = useState<{
    covers: Record<string, string>;
    assets: Array<GalleryItem & { catalog_id?: string | null }>;
    /** [slot, label] pairs this entry actually shows. */
    slots: Array<[string, string]>;
    /** Talk entries also carry the pictures and transcript boxes. */
    isTalk: boolean;
  } | null>(null);

  const language = lang as Language;

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/curation', {
        headers: await authHeaders(),
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      setDoors(payload.data ?? []);
      setSelected((current) => current ?? { kind: 'door', doorKey: payload.data?.[0]?.key ?? '' });
    } catch (err) {
      console.error('[CURATION] load failed', err);
      setError('加载失败，请刷新');
    }
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const door = useMemo(
    () => (selected ? doors?.find((item) => item.key === selected.doorKey) ?? null : null),
    [doors, selected]
  );

  const shelf = useMemo(() => {
    if (!door || !selected || selected.kind === 'door') return null;
    if (selected.kind === 'shelf') {
      return door.shelves.find((item) => item.key === selected.shelfKey) ?? null;
    }
    return selected.shelfKey
      ? door.shelves.find((item) => item.key === selected.shelfKey) ?? null
      : null;
  }, [door, selected]);

  const event = useMemo(() => {
    if (!door || !selected || selected.kind !== 'event') return null;
    if (shelf) return shelf.events.find((item) => item.id === selected.eventId) ?? null;
    return door.events.find((item) => item.id === selected.eventId) ?? null;
  }, [door, selected, shelf]);

  const shelfTitle = shelf ? (shelf.labelKey ? translate(language, shelf.labelKey) : shelf.label) : null;

  const panel: Panel | null = useMemo(() => {
    if (!door || !selected) return null;

    if (selected.kind === 'event' && event) {
      return {
        title: event.title,
        subtitle: [translate(language, door.labelKey), shelfTitle].filter(Boolean).join(' · '),
        cover: event.cover,
        pinned: event.pinned,
        canHoldCover: true,
        galleryHref: event.galleryHref,
        eventCount: event.imageCount,
        size: 'aspect-[3/2]',
      };
    }

    if (selected.kind === 'shelf' && shelf) {
      // A series shelf has no path because it is a project row, not a URL
      // segment - its cover is its own cover_url, so it is still assignable.
      const isProjectShelf = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        shelf.key
      );
      return {
        title: shelfTitle ?? shelf.label,
        subtitle: shelf.path ?? '剧集',
        cover: shelf.cover,
        pinned: shelf.pinned,
        canHoldCover: Boolean(shelf.path) || isProjectShelf,
        galleryHref: null,
        eventCount: shelf.count,
        size: 'aspect-[4/5]',
      };
    }

    return {
      title: translate(language, door.labelKey),
      subtitle: door.href,
      cover: door.cover,
      pinned: door.pinned,
      canHoldCover: Boolean(door.coverSlot),
      galleryHref: null,
      eventCount: door.events.length + door.shelves.reduce((sum, item) => sum + item.count, 0),
      size: door.key === 'talks' || door.key === 'live_stream' ? 'aspect-[16/9]' : 'aspect-[4/5]',
    };
  }, [door, event, language, selected, shelf]);

  const projectIdsForPicker = useMemo(() => {
    if (!door || !selected) return [];
    if (selected.kind === 'event' && event) return [event.id];
    if (selected.kind === 'shelf' && shelf) return shelf.events.map((item) => item.id);
    return [
      ...door.events.map((item) => item.id),
      ...door.shelves.flatMap((item) => item.events.map((entry) => entry.id)),
    ];
  }, [door, event, selected, shelf]);

  const openPicker = () => setPickerOpen(true);

  const writeSlot = async (
    body: Record<string, unknown>,
    method: 'PATCH' | 'DELETE',
    url: string
  ) => {
    setBusy(true);
    try {
      const response = await fetch(url, {
        method,
        headers: await authHeaders(),
        credentials: 'include',
        body: method === 'DELETE' ? undefined : JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      setNote('已保存');
      setTimeout(() => setNote(null), 2500);
      setPickerOpen(false);
      await load();
    } catch (err) {
      console.error('[CURATION] write failed', err);
      setNote('保存失败');
      setTimeout(() => setNote(null), 3000);
    } finally {
      setBusy(false);
    }
  };

  // Load the picked event's classes and their pictures so a curator can
  // click-cover each class (the timeline box covers), not just the event.
  useEffect(() => {
    if (!selected || selected.kind !== 'event') {
      setGroupCovers(null);
      setTalkCovers(null);
      return;
    }
    let cancelled = false;
    setGroupCovers({ loading: true, covers: {}, groups: [] });
    (async () => {
      try {
        const [projRes, galRes] = await Promise.all([
          fetch(`/api/admin/projects/${selected.eventId}`, {
            headers: await authHeaders(),
            credentials: 'include',
          }),
          fetch(`/api/admin/gallery?project_id=${selected.eventId}`, {
            headers: await authHeaders(),
            credentials: 'include',
          }),
        ]);
        const proj = await projRes.json();
        const gal = await galRes.json();
        if (cancelled) return;
        const assetGroups: string[] = Array.isArray(proj?.data?.asset_groups)
          ? proj.data.asset_groups
          : [];
        const covers: Record<string, string> =
          proj?.data?.asset_group_covers && typeof proj.data.asset_group_covers === 'object'
            ? proj.data.asset_group_covers
            : {};
        const assets: Array<GalleryItem & { asset_group?: string | null; catalog_id?: string | null }> =
          gal?.data ?? [];
        const byGroup = new Map<string, typeof assets>();
        for (const asset of assets) {
          // Class covers are addressed by catalog_id; legacy rows without one
          // cannot be picked as a cover, so they stay out of the grid.
          if (!asset.catalog_id) continue;
          // '' is the unfiled bucket: the column is NULL and the door reader
          // shows it as one extra box ("all photos"). It used to be dropped
          // here, which is why pictures that had never been filed were
          // invisible on this page while the public timeline still showed them.
          const key = asset.asset_group ?? '';
          const list = byGroup.get(key) ?? [];
          list.push(asset);
          byGroup.set(key, list);
        }
        const keys = [
          ...assetGroups.filter((key) => byGroup.has(key)),
          ...[...byGroup.keys()].filter((key) => key !== '' && !assetGroups.includes(key)),
          // Unfiled last: the named classes are what a curator works with,
          // the leftovers are the queue.
          ...(byGroup.has('') ? [''] : []),
        ];
        setGroupCovers({
          loading: false,
          covers,
          groups: keys.map((key) => ({ key, assets: byGroup.get(key) ?? [] })),
        });

        // Talk entries keep the four resource boxes; every other entry gets
        // the two video boxes its own detail page renders.
        const isTalk = ['interview', 'variety', 'radio', 'press'].includes(
          proj?.data?.category ?? ''
        );
        setTalkCovers({
          covers:
            proj?.data?.talk_resource_covers && typeof proj.data.talk_resource_covers === 'object'
              ? proj.data.talk_resource_covers
              : {},
          assets: assets.filter((asset) => Boolean(asset.catalog_id)),
          isTalk,
          slots: isTalk
            ? [
                ['bilibili', 'Bilibili 视频'],
                ['youtube', 'YouTube 视频'],
                ['photos', '图片'],
                ['transcript', '文字实录'],
              ]
            : [
                ['bilibili', 'Bilibili 视频'],
                ['youtube', 'YouTube 视频'],
              ],
        });
      } catch {
        if (!cancelled) setGroupCovers({ loading: false, covers: {}, groups: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHeaders, selected]);

  const pickGroupCover = async (groupKey: string, catalogId: string) => {
    if (!event || !groupCovers) return;
    const next = { ...groupCovers.covers, [groupKey]: catalogId };
    setGroupCovers({ ...groupCovers, covers: next });
    await writeSlot(
      { asset_group_covers: next },
      'PATCH',
      `/api/admin/projects/${event.id}`
    );
  };

  const flash = (message: string, ms = 2400) => {
    setNote(message);
    setTimeout(() => setNote(null), ms);
  };

  /**
   * Drop a picture onto another class.
   *
   * Only gallery_assets.asset_group changes. The catalog_id, the R2 key, the
   * date and the cover slots all stay exactly as they are - the class is a
   * label on the row, it is not part of the picture's identity.
   *
   * An emptied class stays on screen as a "0 图" row so a mis-drop can be
   * dragged straight back; it disappears on the next load, because the public
   * reader only ever shows classes that have pictures.
   */
  const moveAssetToGroup = async (assetId: string, groupKey: string) => {
    if (!groupCovers || groupBusy) return;
    const from = groupCovers.groups.find((group) => group.assets.some((asset) => asset.id === assetId));
    if (!from || from.key === groupKey) return;
    const asset = from.assets.find((item) => item.id === assetId);
    if (!asset) return;

    const previous = groupCovers;
    const nextGroups = groupCovers.groups.map((group) => {
      if (group.key === from.key) {
        return { ...group, assets: group.assets.filter((item) => item.id !== assetId) };
      }
      if (group.key === groupKey) {
        return {
          ...group,
          assets: [...group.assets, { ...asset, asset_group: groupKey || null }],
        };
      }
      return group;
    });
    setGroupCovers({ ...groupCovers, groups: nextGroups });
    setGroupBusy(true);

    try {
      const response = await fetch('/api/admin/gallery/asset-group', {
        method: 'POST',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ action: 'move', ids: [assetId], group: groupKey || null }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      flash(`已移到「${groupKey || '未分类'}」`);
    } catch (err) {
      console.error('[CURATION] move class failed', err);
      setGroupCovers(previous);
      flash('移动失败', 3200);
    } finally {
      setGroupBusy(false);
      setDragAssetId(null);
      setDropTarget(null);
    }
  };

  /**
   * Rename a class inside this event.
   *
   * asset_group is free text, so 「机场图」 on another event is that event's
   * own class and stays as it is. Only this event's pictures move, plus its
   * declared order and picked cover, which are keyed by the name.
   */
  const renameGroup = async (from: string, rawTo: string) => {
    if (!groupCovers || groupBusy || !event) return;
    const to = rawTo.trim();
    if (!to || to === from) {
      setRenamingKey(null);
      return;
    }

    const previous = groupCovers;
    setGroupBusy(true);
    try {
      const response = await fetch('/api/admin/gallery/asset-group', {
        method: 'POST',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ action: 'rename', projectId: event.id, from, to }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        flash(payload?.error ?? '改名失败', 3600);
        setRenamingKey(null);
        return;
      }

      const nextGroups = groupCovers.groups.map((group) =>
        group.key === from
          ? {
              ...group,
              assets: group.assets.map((asset) => ({ ...asset, asset_group: to })),
            }
          : group
      );
      const nextCovers = { ...groupCovers.covers };
      if (from in nextCovers) {
        nextCovers[to] = nextCovers[from];
        delete nextCovers[from];
      }
      // Re-read the tree afterwards: the left column's counts changed with it.
      setGroupCovers({ ...groupCovers, groups: nextGroups, covers: nextCovers });
      setRenamingKey(null);
      flash(
        payload?.renamed ? `已改名为「${to}」· 这场 ${payload.renamed} 张图` : `已改名为「${to}」`,
        3000
      );
      await load();
    } catch (err) {
      console.error('[CURATION] rename class failed', err);
      setGroupCovers(previous);
      flash('改名失败', 3200);
    } finally {
      setGroupBusy(false);
    }
  };

  // Pin one of the event's pictures to a talk resource box. Clicking the
  // currently pinned picture clears the slot (back to the first-picture
  // default) - the four boxes have no "unfiled" notion of their own.
  const pickTalkCover = async (slot: string, catalogId: string) => {
    if (!event || !talkCovers) return;
    const next = { ...talkCovers.covers };
    if (next[slot] === catalogId) delete next[slot];
    else next[slot] = catalogId;
    setTalkCovers({ ...talkCovers, covers: next });
    await writeSlot(
      { talk_resource_covers: next },
      'PATCH',
      `/api/admin/projects/${event.id}`
    );
  };

  const saveCover = async (item: GalleryItem | null) => {
    if (!door || !selected) return;

    if (selected.kind === 'event' && event) {
      if (!item) {
        await writeSlot({}, 'DELETE', `/api/admin/projects/${event.id}/cover`);
        return;
      }
      await writeSlot({ imageId: item.id }, 'PATCH', `/api/admin/projects/${event.id}/cover`);
      return;
    }

    if (selected.kind === 'shelf' && shelf) {
      if (shelf.path) {
        await writeSlot(
          { imageId: item?.id ?? currentAssetId, categoryPath: item ? shelf.path : null },
          'PATCH',
          '/api/admin/gallery/portal'
        );
        return;
      }
      // A series is a project row: its cover is its own cover_url.
      if (!item) {
        await writeSlot({}, 'DELETE', `/api/admin/projects/${shelf.key}/cover`);
        return;
      }
      await writeSlot({ imageId: item.id }, 'PATCH', `/api/admin/projects/${shelf.key}/cover`);
      return;
    }

    const slot = door.coverSlot;
    if (!slot) return;
    const body =
      slot.kind === 'portal'
        ? { imageId: item?.id ?? currentAssetId, category: item ? slot.value : null }
        : { imageId: item?.id ?? currentAssetId, interview: item ? slot.value : null };
    await writeSlot(body, 'PATCH', '/api/admin/gallery/portal');
  };

  // The portal route needs the id of the row that currently holds the slot even
  // when clearing; the tree carries URLs, so resolve the id against the slot
  // list once per selection.
  useEffect(() => {
    if (!panel?.cover) {
      setCurrentAssetId('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/admin/gallery/portal', {
          headers: await authHeaders(),
          credentials: 'include',
        });
        const payload = await response.json();
        const all = [
          ...(payload?.data?.portals ?? []).map((row: { id: string; imageUrl: string }) => ({
            id: row.id,
            url: row.imageUrl,
          })),
          ...(payload?.data?.interviews ?? []).map((row: { id: string; imageUrl: string }) => ({
            id: row.id,
            url: row.imageUrl,
          })),
          ...(payload?.data?.categories ?? []).map((row: { id: string; imageUrl: string }) => ({
            id: row.id,
            url: row.imageUrl,
          })),
        ];
        const match = all.find((row) => getCdnUrl(row.url) === getCdnUrl(panel.cover!));
        if (!cancelled) setCurrentAssetId(match?.id ?? '');
      } catch {
        if (!cancelled) setCurrentAssetId('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHeaders, panel?.cover]);

  if (error) {
    return <div className="p-8 font-mono text-sm text-red-300">{error}</div>;
  }

  if (!doors) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-ink-2" />
      </div>
    );
  }

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-ink">策展</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
            Door → shelf → event
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-ink-2">
          {note && <span className="text-emerald-300/90">{note}</span>}
          <span>只列前台可见的内容</span>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
          {doors.map((item) => {
            const active = selected?.kind === 'door' && selected.doorKey === item.key;
            const open = expanded[item.key] ?? false;
            return (
              <div key={item.key}>
                <button
                  onClick={() => {
                    setSelected({ kind: 'door', doorKey: item.key });
                    toggle(item.key);
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                    active ? 'bg-lmsy-yellow/10 text-lmsy-yellow' : 'text-ink hover:bg-white/5'
                  }`}
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
                  />
                  <span className="truncate">{translate(language, item.labelKey)}</span>
                  <span className="ml-auto font-mono text-[10px] text-ink-2">
                    {item.events.length + item.shelves.reduce((sum, sub) => sum + sub.count, 0)}
                  </span>
                </button>

                {open && (
                  <div className="ml-4 border-l border-white/10 pl-2">
                    {item.events.map((entry) => (
                      <EventRow
                        key={entry.id}
                        entry={entry}
                        active={
                          selected?.kind === 'event' && selected.eventId === entry.id
                        }
                        onSelect={() =>
                          setSelected({ kind: 'event', doorKey: item.key, shelfKey: null, eventId: entry.id })
                        }
                      />
                    ))}

                    {item.shelves.map((sub) => (
                      <div key={sub.key}>
                        <button
                          onClick={() => {
                            setSelected({ kind: 'shelf', doorKey: item.key, shelfKey: sub.key });
                            toggle(`${item.key}:${sub.key}`);
                          }}
                          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] ${
                            selected?.kind === 'shelf' && selected.shelfKey === sub.key
                              ? 'bg-lmsy-blue/10 text-lmsy-blue'
                              : 'text-ink-2 hover:bg-white/5'
                          }`}
                        >
                          <ChevronRight
                            className={`h-3 w-3 shrink-0 transition-transform ${
                              expanded[`${item.key}:${sub.key}`] ? 'rotate-90' : ''
                            }`}
                          />
                          <span className="truncate">{sub.label}</span>
                          <span className="ml-auto font-mono text-[10px] text-ink-2/70">
                            {sub.count}
                          </span>
                        </button>

                        {expanded[`${item.key}:${sub.key}`] && (
                          <div className="ml-4 border-l border-white/10 pl-2">
                            {sub.events.length === 0 && (
                              <p className="px-2 py-1 font-mono text-[10px] text-ink-2/60">
                                收录中
                              </p>
                            )}
                            {sub.events.map((entry) => (
                              <EventRow
                                key={entry.id}
                                entry={entry}
                                active={
                                  selected?.kind === 'event' && selected.eventId === entry.id
                                }
                                onSelect={() =>
                                  setSelected({
                                    kind: 'event',
                                    doorKey: item.key,
                                    shelfKey: sub.key,
                                    eventId: entry.id,
                                  })
                                }
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
          {panel ? (
            <div className="grid gap-5 md:grid-cols-[190px_minmax(0,1fr)]">
              <div>
                <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2">
                  <span>封面</span>
                  <span>{panel.pinned ? '已指定' : '自动'}</span>
                </div>
                <div
                  className={`relative ${panel.size} overflow-hidden rounded border border-white/10 bg-black/40`}
                >
                  {panel.cover ? (
                    <Image
                      src={getCdnUrl(panel.cover) ?? panel.cover}
                      alt={panel.title}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="220px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center px-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2/70">
                      还没有图
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <h2 className="truncate font-serif text-xl text-ink">{panel.title}</h2>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
                  {panel.subtitle} · {panel.eventCount} 图
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => openPicker()}
                    disabled={!panel.canHoldCover}
                    className="inline-flex items-center gap-2 rounded border border-lmsy-yellow/30 bg-lmsy-yellow/10 px-3 py-1.5 text-xs text-lmsy-yellow hover:bg-lmsy-yellow/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Star className="h-3.5 w-3.5" />
                    换封面
                  </button>
                  {panel.pinned && (
                    <button
                      onClick={() => saveCover(null)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded border border-white/15 px-3 py-1.5 text-xs text-ink-2 hover:border-red-400/40 hover:text-red-300 disabled:opacity-40"
                    >
                      <X className="h-3.5 w-3.5" />
                      恢复自动
                    </button>
                  )}
                  {panel.galleryHref && (
                    <Link
                      href={panel.galleryHref}
                      className="inline-flex items-center gap-2 rounded border border-white/15 px-3 py-1.5 text-xs text-ink-2 hover:border-lmsy-blue/40 hover:text-lmsy-blue"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      补图
                    </Link>
                  )}
                  {selected?.kind === 'door' && door && (
                    <Link
                      href={door.href}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded border border-white/15 px-3 py-1.5 text-xs text-ink-2 hover:border-white/30"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      看前台
                    </Link>
                  )}
                </div>

                {!panel.canHoldCover && (
                  <p className="mt-4 font-mono text-[11px] leading-relaxed text-ink-2/70">
                    这一类没有可指定的封面，它按「未归类」还是「剧集」走，封面从底下的事件来。
                  </p>
                )}

                {selected?.kind === 'event' && talkCovers && talkCovers.assets.length > 0 && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2/70">
                      {talkCovers.isTalk ? '访谈资源封面 · 点图即设' : '视频框封面 · 点图即设'}
                    </p>
                    <div className="space-y-3">
                      {talkCovers.slots.map(([slot, slotLabel]) => (
                        <div key={slot}>
                          <p className="mb-1 font-mono text-[11px] text-ink-2">
                            {slotLabel}
                            {talkCovers.covers[slot]
                              ? ' · 已指定'
                              : talkCovers.isTalk
                                ? ' · 默认第一张'
                                : ' · 默认用事件封面'}
                          </p>
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {talkCovers.assets.map((asset) => {
                              const active = talkCovers.covers[slot] === asset.catalog_id;
                              return (
                                <button
                                  key={asset.id}
                                  type="button"
                                  onClick={() => void pickTalkCover(slot, asset.catalog_id!)}
                                  disabled={busy}
                                  title={asset.catalog_id ?? ''}
                                  className={`relative h-16 w-14 shrink-0 overflow-hidden rounded border transition-colors ${
                                    active
                                      ? 'border-lmsy-yellow ring-1 ring-lmsy-yellow/60'
                                      : 'border-white/10 hover:border-white/40'
                                  } ${busy ? 'opacity-50' : ''}`}
                                >
                                  <Image
                                    src={getCdnUrl(asset.image_url) ?? asset.image_url}
                                    alt={asset.catalog_id ?? slotLabel}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                    sizes="60px"
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <p className="font-mono text-[10px] leading-relaxed text-ink-2/60">
                        黄框为当前封面，再点一次可取消指定。
                        {talkCovers.isTalk
                          ? '不指定时用这个事件的第一张图。'
                          : '不指定时用这个事件自己的封面。'}
                      </p>
                    </div>
                  </div>
                )}

                {selected?.kind === 'event' && groupCovers && groupCovers.groups.length > 0 && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2/70">
                      分类封面 · 点图即设
                    </p>
                    {groupCovers.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-ink-2" />
                    ) : (
                      <div className="space-y-3">
                        {groupCovers.groups.map((group) => {
                          const isUnfiled = group.key === '';
                          const label = isUnfiled ? '未分类' : group.key;
                          const isDropTarget = dropTarget === group.key;
                          return (
                            <div
                              key={isUnfiled ? '__unfiled' : group.key}
                              onDragOver={(event) => {
                                if (!dragAssetId) return;
                                event.preventDefault();
                                event.dataTransfer.dropEffect = 'move';
                                if (dropTarget !== group.key) setDropTarget(group.key);
                              }}
                              onDragLeave={(event) => {
                                // Ignore the flicker from moving between the
                                // children of the same drop zone.
                                if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                  return;
                                }
                                setDropTarget((current) => (current === group.key ? null : current));
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                const id = event.dataTransfer.getData('text/plain') || dragAssetId;
                                setDropTarget(null);
                                if (id) void moveAssetToGroup(id, group.key);
                              }}
                              className={`rounded transition-colors ${
                                isDropTarget
                                  ? 'bg-lmsy-yellow/[0.07] ring-1 ring-lmsy-yellow/40'
                                  : ''
                              }`}
                            >
                              <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] text-ink-2">
                                {renamingKey === group.key ? (
                                  <input
                                    autoFocus
                                    value={renameDraft}
                                    onChange={(event) => setRenameDraft(event.target.value)}
                                    onBlur={() => void renameGroup(group.key, renameDraft)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        void renameGroup(group.key, renameDraft);
                                      } else if (event.key === 'Escape') {
                                        event.preventDefault();
                                        setRenamingKey(null);
                                      }
                                    }}
                                    className="w-36 rounded border border-lmsy-yellow/50 bg-black/60 px-1.5 py-0.5 font-mono text-[11px] text-ink outline-none"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onDoubleClick={() => {
                                      if (isUnfiled) return;
                                      setRenamingKey(group.key);
                                      setRenameDraft(group.key);
                                    }}
                                    disabled={groupBusy}
                                    title={
                                      isUnfiled
                                        ? '未分类：前台的「全部图片」盒子就是它'
                                        : '双击改名，只改这一场的分类名'
                                    }
                                    className={`max-w-[190px] truncate rounded px-1 -mx-1 text-left ${
                                      isUnfiled
                                        ? 'text-ink-2/60'
                                        : 'hover:bg-white/10 hover:text-ink'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                )}
                                <span className="shrink-0">· {group.assets.length} 图</span>
                              </div>
                              <div className="flex min-h-[68px] gap-1.5 overflow-x-auto rounded pb-1">
                                {group.assets.map((asset) => {
                                  const active =
                                    groupCovers.covers[group.key] === asset.catalog_id;
                                  return (
                                    <button
                                      key={asset.id}
                                      type="button"
                                      draggable
                                      onDragStart={(event) => {
                                        event.dataTransfer.setData('text/plain', asset.id);
                                        event.dataTransfer.effectAllowed = 'move';
                                        setDragAssetId(asset.id);
                                      }}
                                      onDragEnd={() => {
                                        setDragAssetId(null);
                                        setDropTarget(null);
                                      }}
                                      onClick={() => void pickGroupCover(group.key, asset.catalog_id!)}
                                      disabled={busy}
                                      title={`${asset.catalog_id ?? ''}\n拖动到别的分类即可改分类，编号不变`}
                                      className={`relative h-16 w-14 shrink-0 cursor-grab overflow-hidden rounded border transition-colors active:cursor-grabbing ${
                                        active
                                          ? 'border-lmsy-yellow ring-1 ring-lmsy-yellow/60'
                                          : 'border-white/10 hover:border-white/40'
                                      } ${busy ? 'opacity-50' : ''} ${
                                        dragAssetId === asset.id ? 'opacity-30' : ''
                                      }`}
                                    >
                                      <Image
                                        src={getCdnUrl(asset.image_url) ?? asset.image_url}
                                        alt={asset.catalog_id ?? label}
                                        fill
                                        unoptimized
                                        className="object-cover"
                                        sizes="60px"
                                      />
                                    </button>
                                  );
                                })}
                                {group.assets.length === 0 && (
                                  <span className="self-center font-mono text-[10px] text-ink-2/45">
                                    空的，把图拖进来
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <p className="font-mono text-[10px] leading-relaxed text-ink-2/60">
                          黄框为当前封面；不选则默认用每组第一张。拖动图片到别的分类即可改分类（
                          编号、日期都不动）；双击分类名可改名，只改这一场。
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selected?.kind === 'shelf' && shelf && shelf.events.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2/70">
                      子事件 · 新到旧
                    </p>
                    <div className="divide-y divide-white/5 rounded border border-white/10">
                      {shelf.events.map((entry) => (
                        <EventRow
                          key={entry.id}
                          entry={entry}
                          active={false}
                          flat
                          onSelect={() =>
                            setSelected({
                              kind: 'event',
                              doorKey: door!.key,
                              shelfKey: shelf.key,
                              eventId: entry.id,
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="font-mono text-sm text-ink-2">左边选一个门或事件</p>
          )}
        </section>
      </div>

      <VaultImagePicker
        key={`${selected?.kind}-${selected?.doorKey}-${pickerOpen ? 'open' : 'closed'}-${showAll}`}
        open={pickerOpen}
        title="SET_COVER"
        subtitle={showAll ? 'ALL_IMAGES' : 'THIS_NODE_ONLY'}
        // Rows come from the server, paged: the whole vault, or just this
        // node's projects. Both used to arrive as one preloaded array from
        // /api/admin/gallery, which PostgREST caps at 1000 rows.
        projectIds={showAll ? undefined : projectIdsForPicker}
        currentImageUrl={panel?.cover ?? null}
        busy={busy}
        onPick={(item) => saveCover(item)}
        onClose={() => setPickerOpen(false)}
        onClear={panel?.pinned ? () => saveCover(null) : undefined}
      />

      {pickerOpen && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/80 px-4 py-2 text-xs text-ink-2 backdrop-blur hover:text-ink"
          >
            <Images className="h-3.5 w-3.5" />
            {showAll ? '只看本节点' : '切换：全部图片'}
          </button>
        </div>
      )}
    </div>
  );
}

function EventRow({
  entry,
  active,
  flat = false,
  onSelect,
}: {
  entry: CurationEvent;
  active: boolean;
  flat?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] ${
        active ? 'bg-white/10 text-ink' : 'text-ink-2 hover:bg-white/5'
      } ${flat ? 'rounded-none' : ''}`}
    >
      <span className="truncate">{entry.title}</span>
      <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-2/60">
        {entry.imageCount === 0 ? '0 图' : entry.imageCount}
        {!entry.pinned && entry.imageCount > 0 ? ' · 自动' : ''}
      </span>
      <span className="w-[74px] shrink-0 text-right font-mono text-[10px] text-ink-2/60">
        {entry.date ?? '无日期'}
      </span>
    </button>
  );
}
