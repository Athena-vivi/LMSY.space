'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Play, Search } from 'lucide-react';
import { useAdminHeaders } from '@/app/(en)/admin/gallery/hooks/use-admin-headers';
import { useAdminLang } from '@/lib/admin-i18n';

/**
 * /admin/videos - where each event's footage lives.
 *
 * The archive stores pictures, never video files. Most events do have footage
 * on Bilibili or YouTube, so the two link columns on `projects` are the whole
 * feature: fill one and the entry page shows that platform's box. Empty means
 * no box - nothing is invented for an event that has not been checked yet.
 *
 * This screen exists because the settings tabs can only change one program at
 * a time from a dropdown. 346 entries need search, a "not filled yet" filter
 * and an input per row.
 */

type VideoProject = {
  id: string;
  title: string | null;
  title_i18n: Record<string, string> | null;
  catalog_id: string | null;
  slug: string | null;
  category: string | null;
  subtype: string | null;
  event_date: string | null;
  release_date: string | null;
  project_kind: string | null;
  video_url_bilibili: string | null;
  video_url_youtube: string | null;
};

type Filter = 'missing' | 'filled' | 'all';

function displayTitle(project: VideoProject): string {
  const localized = project.title_i18n?.en || project.title_i18n?.zh;
  return project.title || localized || '(untitled)';
}

function dateOf(project: VideoProject): string {
  return project.event_date || project.release_date || '';
}

function hasVideo(project: VideoProject): boolean {
  return Boolean(project.video_url_bilibili || project.video_url_youtube);
}

export default function VideoLinksPage() {
  const { t } = useAdminLang();
  const authHeaders = useAdminHeaders();

  const [projects, setProjects] = useState<VideoProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('missing');
  const [category, setCategory] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);
        const headers = await authHeaders();
        const response = await fetch('/api/admin/projects', {
          cache: 'no-store',
          credentials: 'include',
          headers,
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to load events');
        }
        if (cancelled) return;
        const rows = (result.projects || []) as VideoProject[];
        // A series row is the work other entries hang under, not an event.
        setProjects(rows.filter((row) => row.project_kind !== 'series'));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load events');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  const counts = useMemo(() => {
    const rows = projects ?? [];
    const filled = rows.filter(hasVideo).length;
    return { total: rows.length, filled, missing: rows.length - filled };
  }, [projects]);

  // Categories are read off the rows rather than the registry: what the list
  // offers to filter by should be what the archive actually holds.
  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const row of projects ?? []) {
      if (!row.category) continue;
      seen.set(row.category, (seen.get(row.category) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = (projects ?? []).filter((row) => {
      if (filter === 'missing' && hasVideo(row)) return false;
      if (filter === 'filled' && !hasVideo(row)) return false;
      if (category && row.category !== category) return false;
      if (!needle) return true;
      return (
        displayTitle(row).toLowerCase().includes(needle) ||
        (row.catalog_id ?? '').toLowerCase().includes(needle) ||
        (row.slug ?? '').toLowerCase().includes(needle) ||
        dateOf(row).includes(needle)
      );
    });

    // Newest first; entries with no date sink to the bottom.
    return rows.sort((a, b) => {
      const da = dateOf(a);
      const db = dateOf(b);
      if (da === db) return displayTitle(a).localeCompare(displayTitle(b));
      if (!da) return 1;
      if (!db) return -1;
      return db.localeCompare(da);
    });
  }, [projects, query, filter, category]);

  // A saved row keeps its new values, so switching filters does not resurrect
  // the old ones.
  const handleSaved = useCallback((id: string, next: { bilibili: string; youtube: string }) => {
    setProjects((prev) =>
      prev
        ? prev.map((row) =>
            row.id === id
              ? {
                  ...row,
                  video_url_bilibili: next.bilibili || null,
                  video_url_youtube: next.youtube || null,
                }
              : row
          )
        : prev
    );
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/20 bg-red-500/5 px-4 py-3 text-sm text-red-200/80">
        {error}
      </div>
    );
  }

  if (!projects) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-lmsy-blue/70" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl tracking-tight text-ink">{t('videos.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-2">{t('videos.hint')}</p>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">
          {counts.filled} / {counts.total} {t('videos.filledSuffix')}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('videos.search')}
            className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-2/60 focus:border-lmsy-blue/40 focus:outline-none"
          />
        </div>

        <div className="flex overflow-hidden rounded-lg border border-white/10">
          {(
            [
              ['missing', t('videos.filterMissing'), counts.missing],
              ['filled', t('videos.filterFilled'), counts.filled],
              ['all', t('videos.filterAll'), counts.total],
            ] as [Filter, string, number][]
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`px-3 py-2 text-xs transition-colors ${
                filter === value
                  ? 'bg-lmsy-blue/15 text-lmsy-blue'
                  : 'text-ink-2 hover:bg-white/5 hover:text-ink'
              }`}
            >
              {label} <span className="font-mono text-[10px] opacity-70">{count}</span>
            </button>
          ))}
        </div>

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-ink focus:border-lmsy-blue/40 focus:outline-none"
        >
          <option value="" className="bg-neutral-950">
            {t('videos.allCategories')}
          </option>
          {categories.map(([value, count]) => (
            <option key={value} value={value} className="bg-neutral-950">
              {value} ({count})
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/30 p-10 text-center text-sm text-ink-2">
          {t('videos.empty')}
        </div>
      ) : (
        <ul className="divide-y divide-white/5 rounded-xl border border-white/10 bg-black/30">
          {visible.map((project) => (
            <VideoRow key={project.id} project={project} onSaved={handleSaved} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One event and its two links. The row owns its input state so typing does not
 * re-render the other 345 rows; the parent only learns about it on save.
 */
const VideoRow = memo(function VideoRow({
  project,
  onSaved,
}: {
  project: VideoProject;
  onSaved: (id: string, next: { bilibili: string; youtube: string }) => void;
}) {
  const { t } = useAdminLang();
  const authHeaders = useAdminHeaders();

  const [bilibili, setBilibili] = useState(project.video_url_bilibili ?? '');
  const [youtube, setYoutube] = useState(project.video_url_youtube ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const dirty =
    bilibili.trim() !== (project.video_url_bilibili ?? '') ||
    youtube.trim() !== (project.video_url_youtube ?? '');

  const save = useCallback(async () => {
    if (!dirty || state === 'saving') return;
    try {
      setState('saving');
      setMessage(null);
      const headers = await authHeaders();
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          video_url_bilibili: bilibili.trim(),
          video_url_youtube: youtube.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Failed to save');
      }
      onSaved(project.id, { bilibili: bilibili.trim(), youtube: youtube.trim() });
      setState('saved');
      setMessage(null);
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Failed to save');
    }
  }, [authHeaders, bilibili, youtube, dirty, state, project.id, onSaved]);

  const date = dateOf(project);

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] tracking-wider text-ink-2">{date || '----'}</span>
        <span className="text-sm text-ink">{displayTitle(project)}</span>
        {project.catalog_id ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2/70">
            {project.catalog_id}
          </span>
        ) : null}
        {project.category ? (
          <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
            {project.category}
            {project.subtype ? ` / ${project.subtype}` : ''}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Play className="h-3.5 w-3.5 flex-shrink-0 text-lmsy-blue/60" />
        <input
          value={bilibili}
          onChange={(event) => {
            setBilibili(event.target.value);
            setState('idle');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') save();
          }}
          placeholder="Bilibili URL"
          className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-ink placeholder:text-ink-2/50 focus:border-lmsy-blue/40 focus:outline-none"
        />
        <input
          value={youtube}
          onChange={(event) => {
            setYoutube(event.target.value);
            setState('idle');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') save();
          }}
          placeholder="YouTube URL"
          className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-ink placeholder:text-ink-2/50 focus:border-lmsy-blue/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || state === 'saving'}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
            dirty
              ? 'bg-lmsy-blue/15 text-lmsy-blue hover:bg-lmsy-blue/25'
              : 'text-ink-2/50'
          }`}
        >
          {state === 'saving' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : state === 'saved' && !dirty ? (
            <Check className="h-3.5 w-3.5 text-emerald-400/80" />
          ) : null}
          {state === 'saving'
            ? t('videos.saving')
            : state === 'saved' && !dirty
              ? t('videos.saved')
              : t('videos.save')}
        </button>
      </div>

      {message ? <p className="mt-1 text-[11px] text-red-300/80">{message}</p> : null}
    </li>
  );
});
