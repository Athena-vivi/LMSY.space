'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Field, TextArea } from './settings-inputs';

/**
 * Reused by settings tabs 3 and 4:
 *   - mode "videos"     -> projects.video_url_bilibili / video_url_youtube
 *   - mode "transcript" -> projects.interview_md
 *
 * Picks one specific talk program (interview / variety / radio), loads its
 * current values, and saves straight back to that single project row - the
 * same "pick a subject, then edit it" flow as the drafts promote wizard.
 */

type TalkProject = {
  id: string;
  title: string | Record<string, string> | null;
  catalog_id: string | null;
  slug: string | null;
  category: string | null;
  subtype: string | null;
  event_date: string | null;
  release_date: string | null;
  video_url_bilibili: string | null;
  video_url_youtube: string | null;
  interview_md: string | null;
};

function displayTitle(title: TalkProject['title']): string {
  if (!title) return '';
  if (typeof title === 'string') return title;
  return title.en || title.zh || title.th || '';
}

function projectLabel(project: TalkProject): string {
  const date = project.event_date || project.release_date || '----';
  const title = displayTitle(project.title) || '(untitled)';
  const code = project.catalog_id ? ` · ${project.catalog_id}` : '';
  return `${date} · ${title}${code}`;
}

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

export function TalkSettingsPanel({ mode }: { mode: 'videos' | 'transcript' }) {
  const [projects, setProjects] = useState<TalkProject[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [bilibiliUrl, setBilibiliUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loadingProject, setLoadingProject] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Sorted newest first so the curator finds the latest program on top.
  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) => {
        const da = a.event_date || a.release_date || '';
        const db = b.event_date || b.release_date || '';
        return db.localeCompare(da);
      }),
    [projects]
  );

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) || null,
    [projects, selectedId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        setLoadingList(true);
        setError(null);
        const headers = await getAuthHeaders();
        const response = await fetch('/api/admin/projects', {
          cache: 'no-store',
          credentials: 'include',
          headers,
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to load talk programs');
        }

        const talkCategories = ['interview', 'variety', 'radio'];
        const talkProjects: TalkProject[] = (result.projects || []).filter(
          (p: TalkProject) => talkCategories.includes(p.category || '')
        );
        if (!cancelled) {
          setProjects(talkProjects);
          if (talkProjects.length > 0) {
            setSelectedId((current) => current || talkProjects[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load talk programs');
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reload the editable fields whenever the selection changes. Projects are
  // fetched with select('*') so the current values are already in memory.
  useEffect(() => {
    setSavedAt(null);
    setError(null);
    if (!selected) return;

    setLoadingProject(true);
    const timer = setTimeout(() => {
      setBilibiliUrl(selected.video_url_bilibili || '');
      setYoutubeUrl(selected.video_url_youtube || '');
      setTranscript(selected.interview_md || '');
      setLoadingProject(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [selected]);

  const handleSave = useCallback(async () => {
    if (!selected) return;
    try {
      setSaving(true);
      setError(null);

      const headers = await getAuthHeaders();
      const body =
        mode === 'videos'
          ? { video_url_bilibili: bilibiliUrl.trim(), video_url_youtube: youtubeUrl.trim() }
          : { interview_md: transcript };

      const response = await fetch(`/api/admin/projects/${selected.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Failed to save');
      }

      setProjects((prev) =>
        prev.map((p) =>
          p.id === selected.id
            ? {
                ...p,
                ...(mode === 'videos'
                  ? {
                      video_url_bilibili: bilibiliUrl.trim() || null,
                      video_url_youtube: youtubeUrl.trim() || null,
                    }
                  : { interview_md: transcript }),
              }
            : p
        )
      );
      setSavedAt(new Date().toLocaleString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [selected, mode, bilibiliUrl, youtubeUrl, transcript]);

  if (loadingList) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-lmsy-blue/70" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 p-8 text-center text-sm text-ink-2">
        No talk programs yet. Ingest interview / variety / radio events first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Program selector - one specific talk at a time */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-6">
        <label className="block text-xs font-mono uppercase tracking-wider text-ink-2">
          Talk Program
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-ink focus:border-lmsy-blue/40 focus:outline-none"
        >
          {sortedProjects.map((project) => (
            <option key={project.id} value={project.id} className="bg-neutral-950">
              {projectLabel(project)}
            </option>
          ))}
        </select>
        {selected?.slug && (
          <p className="mt-2 truncate text-[10px] font-mono uppercase tracking-[0.18em] text-ink-2">
            slug: {selected.slug} · category: {selected.category}
            {selected.subtype ? ` · ${selected.subtype}` : ''}
          </p>
        )}
      </div>

      {savedAt && !error && (
        <div className="rounded-lg border border-lmsy-yellow/20 bg-lmsy-yellow/5 px-4 py-3 text-sm text-lmsy-yellow/80">
          Saved successfully at {savedAt}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-400/20 bg-red-500/5 px-4 py-3 text-sm text-red-200/80">
          {error}
        </div>
      )}

      {loadingProject ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-lmsy-blue/70" />
        </div>
      ) : mode === 'videos' ? (
        <div className="rounded-xl border border-white/10 bg-black/30 p-6">
          <div className="space-y-5">
            <Field
              label="Bilibili Video URL"
              value={bilibiliUrl}
              onChange={(value) => {
                setBilibiliUrl(value);
                setSavedAt(null);
              }}
            />
            <Field
              label="YouTube Video URL"
              value={youtubeUrl}
              onChange={(value) => {
                setYoutubeUrl(value);
                setSavedAt(null);
              }}
            />
            <p className="text-xs text-ink-2">
              Paste the full video page URL. Empty clears the link - the matching box on the talks
              timeline disappears.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-black/30 p-6">
          <TextArea
            label="Transcript (Markdown)"
            value={transcript}
            rows={18}
            monospace
            onChange={(value) => {
              setTranscript(value);
              setSavedAt(null);
            }}
          />
          <p className="mt-4 text-xs text-ink-2">
            Markdown body rendered on the program detail page below the pictures (anchor
            #transcript). Empty clears it.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !selected}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-lmsy-yellow to-lmsy-blue px-8 py-3 text-black transition-opacity disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save This Program
            </>
          )}
        </button>
      </div>
    </div>
  );
}
