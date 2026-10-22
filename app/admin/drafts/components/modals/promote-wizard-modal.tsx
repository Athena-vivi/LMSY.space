'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Rocket, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdminLang } from '@/lib/admin-i18n';
import { parseCatalogHead, PERSON_CODES } from '@/lib/catalog-id';

/**
 * Self-serve promotion wizard (phase 1: live-event door).
 *
 * Pick an event -> pick the picture class -> confirm the naming path ->
 * one click runs small batches (transcode -> R2 -> gallery_assets) with an
 * automatic progress bar, then deletes the consumed drafts. The catalog id
 * continues from the event's current max sequence, so later batches keep
 * counting where earlier ones stopped.
 */

interface ProjectRow {
  id: string;
  title: string;
  category: string;
  subtype: string | null;
  event_date: string | null;
  catalog_id: string | null;
  asset_groups: string[] | null;
  cover_url: string | null;
}

interface PreviewInfo {
  firstCatalogId: string;
  r2Key: string | null;
  doorCode: string;
  eventDate: string;
  subject: string;
  projectCatalogId: string | null;
}

interface SubjectOptions {
  fromProject: string | null;
  fromTitle: string;
  existing: string[];
  peers: string[];
}

interface PromoteWizardModalProps {
  isOpen: boolean;
  draftIds: string[];
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Derive the SUBJECT segment: catalog head first, else a normalised title. */
function deriveSubject(project: ProjectRow): string {
  const headSubject = parseCatalogHead(project.catalog_id);
  if (headSubject) return headSubject;
  const cut = project.title.replace(/\s+(?:in|at|@)\s+[\s\S]*$/i, '');
  return (
    cut
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || ''
  );
}

const BATCH_SIZE = 3;

export function PromoteWizardModal({ isOpen, draftIds, onClose, onDone }: PromoteWizardModalProps) {
  const { t } = useAdminLang();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [search, setSearch] = useState('');

  const [projectId, setProjectId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [personCode, setPersonCode] = useState<'LMSY' | 'LM' | 'SY'>('LMSY');
  const [assetGroup, setAssetGroup] = useState('');
  const [captionPrefix, setCaptionPrefix] = useState('');
  const [writeCover, setWriteCover] = useState(false);

  const [preview, setPreview] = useState<PreviewInfo | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOptions | null>(null);
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errors, setErrors] = useState<string[]>([]);
  const [phase, setPhase] = useState<'select' | 'running' | 'done'>('select');

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId]
  );

  useEffect(() => {
    if (!isOpen) return;
    // Reset everything on open.
    setProjectId(null);
    setSubject('');
    setPersonCode('LMSY');
    setAssetGroup('');
    setCaptionPrefix('');
    setWriteCover(false);
    setPreview(null);
    setErrors([]);
    setPhase('select');
    setSearch('');

    let cancelled = false;
    setLoadingProjects(true);
    (async () => {
      try {
        const response = await fetch('/api/admin/projects', { cache: 'no-store' });
        const result = await response.json();
        if (!cancelled && result?.projects) setProjects(result.projects as ProjectRow[]);
      } catch {
        // The dropdown simply stays empty; the error surfaces on retry.
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Re-derive subject / class / cover defaults when the project changes, and
  // load subject candidates so the segment is picked from references instead
  // of invented.
  useEffect(() => {
    if (!project) return;
    setSubjectTouched(false);
    setSubject(deriveSubject(project));
    const groups = project.asset_groups || [];
    setAssetGroup(groups[0] || '');
    setWriteCover(!project.cover_url);
    setPreview(null);
  }, [project]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setSubjectOptions(null);
    (async () => {
      try {
        const response = await fetch(
          `/api/admin/drafts/promote/subject-options?projectId=${projectId}`,
          { cache: 'no-store' }
        );
        const result = await response.json();
        if (cancelled || !result?.success || !result?.options) return;
        const options = result.options as SubjectOptions;
        setSubjectOptions(options);
        // The catalog head is authoritative; refine the local title guess
        // with it (and with the title candidate) unless already edited.
        setSubject((prev) => {
          if (subjectTouched && prev) return prev;
          return options.fromProject || options.fromTitle || prev;
        });
      } catch {
        // Candidates are a convenience; the editable input still works.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Phase 1: the wizard only wires up live-event projects; other doors have
    // different id rules (magazine issues, date-less features) and come later.
    const eligible = projects.filter((p) => p.category === 'live_event');
    if (!q) return eligible;
    return eligible.filter((p) =>
      [p.title, p.event_date, p.id]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [projects, search]);

  const refreshPreview = async () => {
    if (!project || !subject.trim() || draftIds.length === 0) return;
    setPreviewing(true);
    setErrors([]);
    try {
      const response = await fetch('/api/admin/drafts/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftIds: [draftIds[0]],
          projectId: project.id,
          subject,
          personCode,
          assetGroup: assetGroup || null,
          dryRun: true,
        }),
      });
      const result = await response.json();
      if (result?.success && result?.preview) {
        setPreview(result.preview as PreviewInfo);
      } else {
        setPreview(null);
        setErrors([result?.error || 'Preview failed']);
      }
    } catch (err) {
      setPreview(null);
      setErrors([err instanceof Error ? err.message : 'Preview failed']);
    } finally {
      setPreviewing(false);
    }
  };

  const run = async () => {
    if (!project || !subject.trim() || draftIds.length === 0) return;
    setRunning(true);
    setPhase('running');
    setProgress({ done: 0, total: draftIds.length });
    setErrors([]);

    const allIds = [...draftIds];
    const promotedIds: string[] = [];
    const failures: string[] = [];

    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE);
      try {
        const response = await fetch('/api/admin/drafts/promote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftIds: batch,
            projectId: project.id,
            subject,
            personCode,
            assetGroup: assetGroup || null,
            captionPrefix: captionPrefix || null,
            writeCover: writeCover && i === 0,
          }),
        });
        const result = await response.json();
        if (!result?.success) {
          failures.push(result?.error || `Batch at ${i + 1} failed`);
          break;
        }
        for (const item of result.results as Array<{
          draftId: string;
          status: string;
          error?: string;
        }>) {
          if (item.status === 'promoted') promotedIds.push(item.draftId);
          else failures.push(item.error || `Draft ${item.draftId} failed`);
        }
      } catch (err) {
        failures.push(err instanceof Error ? err.message : 'Batch request failed');
        break;
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, allIds.length), total: allIds.length });
    }

    // Only when everything promoted: delete the consumed drafts + sources.
    if (failures.length === 0 && promotedIds.length === allIds.length) {
      try {
        const response = await fetch('/api/admin/drafts/promote/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftIds: allIds }),
        });
        const result = await response.json();
        if (!result?.success && Array.isArray(result?.failed)) {
          for (const f of result.failed) {
            failures.push(`Cleanup: ${f.error || f.draftId}`);
          }
        }
      } catch (err) {
        failures.push(
          `Cleanup failed (promoted assets are safe): ${err instanceof Error ? err.message : 'unknown'}`
        );
      }
    } else if (promotedIds.length > 0) {
      failures.push(
        t('d.promote.partialKeep').replace('{count}', String(promotedIds.length))
      );
    }

    setErrors(failures);
    setRunning(false);
    setPhase(failures.length === 0 ? 'done' : 'select');
    if (failures.length === 0) {
      onDone(
        (t('d.promote.done') as string).replace('{count}', String(promotedIds.length))
      );
      onClose();
    }
  };

  const canPreview = Boolean(project && subject.trim() && draftIds.length > 0 && !previewing);
  const canRun = Boolean(
    project && subject.trim() && preview && !running && draftIds.length > 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl border-white/10 bg-black p-0 text-white shadow-2xl"
      >
        <DialogHeader className="border-b border-white/10 px-6 py-5 text-left">
          <DialogTitle className="font-serif text-xl font-light tracking-wide text-ink">
            {t('d.promote.title')}
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] tracking-wider text-ink-2">
            {t('d.promote.subtitle').replace('{count}', String(draftIds.length))}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {phase === 'running' ? (
            <div className="space-y-3 py-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-lmsy-yellow" />
              <p className="font-mono text-xs tracking-wider text-ink-2">
                {t('d.promote.progress').replace('{done}', String(progress.done)).replace('{total}', String(progress.total))}
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: event */}
              <div className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
                  {t('d.promote.stepEvent')}
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('d.promote.searchEvent')}
                    className="w-full border border-white/10 bg-white/5 py-2 pl-9 pr-3 font-mono text-xs tracking-wide text-ink outline-none transition-colors placeholder:text-ink-2 focus:border-lmsy-yellow/40"
                  />
                </div>
                <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                  {loadingProjects && (
                    <div className="px-3 py-4 font-mono text-[11px] text-ink-2">
                      {t('common.loading')}
                    </div>
                  )}
                  {filteredProjects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProjectId(p.id)}
                      className={`flex w-full items-center justify-between gap-3 border px-3 py-2 text-left transition-colors ${
                        projectId === p.id
                          ? 'border-lmsy-yellow/50 bg-lmsy-yellow/10'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/25'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate font-serif text-sm text-ink">
                        {p.title}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] tracking-wider text-ink-2">
                        {p.event_date || 'NO_DATE'}
                      </span>
                    </button>
                  ))}
                  {!loadingProjects && filteredProjects.length === 0 && (
                    <div className="px-3 py-4 text-center font-mono text-[11px] text-ink-2">
                      {t('d.promote.noEvents')}
                    </div>
                  )}
                </div>
              </div>

              {project && (
                <>
                  {/* Step 2: class + person + captions */}
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block space-y-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
                        {t('d.promote.stepClass')}
                      </span>
                      {(project.asset_groups?.length ?? 0) > 0 ? (
                        <select
                          value={assetGroup}
                          onChange={(e) => setAssetGroup(e.target.value)}
                          className="w-full border border-white/10 bg-black px-3 py-2 font-mono text-xs text-ink outline-none focus:border-lmsy-yellow/40"
                        >
                          {project.asset_groups!.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                          <option value="">{t('d.promote.noClass')}</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={assetGroup}
                          onChange={(e) => setAssetGroup(e.target.value)}
                          placeholder={t('d.promote.classPlaceholder')}
                          className="w-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs tracking-wide text-ink outline-none focus:border-lmsy-yellow/40"
                        />
                      )}
                    </label>

                    <label className="block space-y-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
                        {t('d.promote.person')}
                      </span>
                      <select
                        value={personCode}
                        onChange={(e) => setPersonCode(e.target.value as 'LMSY' | 'LM' | 'SY')}
                        className="w-full border border-white/10 bg-black px-3 py-2 font-mono text-xs text-ink outline-none focus:border-lmsy-yellow/40"
                      >
                        {PERSON_CODES.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
                        {t('d.promote.subject')}
                      </span>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => {
                          setSubjectTouched(true);
                          setSubject(e.target.value);
                          setPreview(null);
                        }}
                        className="w-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs tracking-wide text-ink outline-none focus:border-lmsy-yellow/40"
                      />
                      <span className="block font-mono text-[9px] leading-relaxed text-ink-2/70">
                        {t('d.promote.subjectHint')}
                      </span>
                      {subjectOptions && (
                        <span className="flex flex-wrap gap-1 pt-0.5">
                          {subjectOptions.fromProject && (
                            <button
                              type="button"
                              onClick={() => {
                                setSubjectTouched(true);
                                setSubject(subjectOptions.fromProject!);
                                setPreview(null);
                              }}
                              className="border border-lmsy-yellow/40 bg-lmsy-yellow/10 px-2 py-0.5 font-mono text-[10px] text-lmsy-yellow/90 hover:bg-lmsy-yellow/20"
                            >
                              {subjectOptions.fromProject} · {t('d.promote.optProject')}
                            </button>
                          )}
                          {subjectOptions.existing.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setSubjectTouched(true);
                                setSubject(s);
                                setPreview(null);
                              }}
                              className="border border-white/15 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-ink-2 hover:border-white/30 hover:text-ink"
                            >
                              {s} · {t('d.promote.optExisting')}
                            </button>
                          ))}
                          {subjectOptions.fromTitle &&
                            subjectOptions.fromTitle !== subjectOptions.fromProject && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSubjectTouched(true);
                                  setSubject(subjectOptions.fromTitle);
                                  setPreview(null);
                                }}
                                className="border border-white/15 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-ink-2 hover:border-white/30 hover:text-ink"
                              >
                                {subjectOptions.fromTitle} · {t('d.promote.optTitle')}
                              </button>
                            )}
                          {subjectOptions.peers.slice(0, 8).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setSubjectTouched(true);
                                setSubject(s);
                                setPreview(null);
                              }}
                              className="border border-white/10 bg-transparent px-2 py-0.5 font-mono text-[10px] text-ink-2/70 hover:border-white/25 hover:text-ink-2"
                            >
                              {s} · {t('d.promote.optPeers')}
                            </button>
                          ))}
                        </span>
                      )}
                    </label>

                    <label className="block space-y-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
                        {t('d.promote.captionPrefix')}
                      </span>
                      <input
                        type="text"
                        value={captionPrefix}
                        onChange={(e) => setCaptionPrefix(e.target.value)}
                        placeholder={assetGroup || subject}
                        className="w-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs tracking-wide text-ink outline-none placeholder:text-ink-2 focus:border-lmsy-yellow/40"
                      />
                    </label>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] text-ink-2">
                    <input
                      type="checkbox"
                      checked={writeCover}
                      onChange={(e) => setWriteCover(e.target.checked)}
                      className="h-3.5 w-3.5 accent-lmsy-yellow"
                    />
                    {t('d.promote.writeCover')}
                  </label>

                  {/* Step 3: preview + run */}
                  <div className="space-y-2 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => void refreshPreview()}
                      disabled={!canPreview}
                      className="flex items-center gap-2 border border-white/15 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-2 transition-colors hover:border-lmsy-yellow/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {previewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      {t('d.promote.preview')}
                    </button>

                    {preview && (
                      <div className="space-y-1 border border-lmsy-yellow/25 bg-lmsy-yellow/[0.06] px-4 py-3 font-mono text-[11px] leading-relaxed text-lmsy-yellow/90">
                        <p>{t('d.promote.willStart').replace('{id}', preview.firstCatalogId)}</p>
                        <p className="text-ink-2">{preview.r2Key}</p>
                      </div>
                    )}

                    {errors.length > 0 && (
                      <div className="space-y-1 rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200/80">
                        {errors.map((e, i) => (
                          <p key={i} className="flex items-start gap-1.5">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            {e}
                          </p>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => void run()}
                      disabled={!canRun}
                      className="flex w-full items-center justify-center gap-2 bg-lmsy-yellow px-4 py-3 font-mono text-xs uppercase tracking-wider text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                      {running ? t('d.promote.running') : t('d.promote.run').replace('{count}', String(draftIds.length))}
                    </button>

                    <p className="text-center font-mono text-[10px] leading-relaxed text-ink-2/70">
                      {t('d.promote.cleanupHint')}
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {phase === 'done' && (
          <div className="flex items-center gap-2 border-t border-white/10 px-6 py-3 text-xs text-green-400/90">
            <CheckCircle2 className="h-4 w-4" />
            {t('d.promote.done').replace('{count}', String(progress.done))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
