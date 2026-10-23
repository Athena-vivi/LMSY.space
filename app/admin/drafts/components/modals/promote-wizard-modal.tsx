'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Rocket, Search, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdminLang } from '@/lib/admin-i18n';
import { subjectFromProjectId, PERSON_CODES, CITY_CODES, pickedSubject, hasPickedSubject } from '@/lib/catalog-id';
import { SUBTYPES_BY_CATEGORY } from '@/lib/category-registry';
import type { TranslationKey } from '@/lib/languages';

/** Default picture class for a fresh import - the commonest one by far. */
const DEFAULT_CLASS = '演出图';

/** Pick the class a fresh import starts on; 演出图 wins whenever it exists. */
function defaultClassOf(groups: string[]): string {
  return groups.includes(DEFAULT_CLASS) ? DEFAULT_CLASS : groups[0] ?? '';
}

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
  project_kind: string | null;
  work_id: string | null;
  event_date: string | null;
  catalog_id: string | null;
  /** Structured city; the promote wizard reads it to build the subject code. */
  city: string | null;
  /**
   * Who the event belongs to: LMSY (duo) or LM / SY, which the event number
   * carries as a trailing code. Fixed once the event has a number.
   */
  person: 'LMSY' | 'LM' | 'SY' | null;
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
  commonGroups: string[];
}

interface PromoteWizardModalProps {
  isOpen: boolean;
  draftIds: string[];
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Derive the SUBJECT segment: catalog head first, else a normalised title. */
function deriveSubject(project: ProjectRow): string {
  // subjectFromProjectId strips the date that EVENT / APPEAR event numbers end
  // with, so the segment does not come out as FANMEET-BKK-20250115.
  const headSubject = subjectFromProjectId(project.catalog_id);
  if (headSubject) return headSubject;
  // Event titles are often written in decorative Unicode (𝐋𝐌𝐒𝐘 𝐱 ...). NFKC
  // folds those compatibility characters back to ASCII first, or the segment
  // would come out empty and the server would refuse the batch.
  const cut = project.title
    .normalize('NFKC')
    .replace(/\s+(?:in|at|@)\s+[\s\S]*$/i, '');
  return (
    cut
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || ''
  );
}

/**
 * Wizard top level: every door with the REAL project categories it covers.
 * The talks door spans three shelves (interview / variety / radio) and the
 * live door is the live_stream category - projects never carry the door
 * names themselves, so filtering and creation must map through this table.
 */
const WIZARD_DOORS: Array<{
  key: string;
  labelKey: TranslationKey;
  categories: string[];
}> = [
  { key: 'drama_work', labelKey: 'category.dramaWork', categories: ['drama_work'] },
  { key: 'editorial', labelKey: 'category.editorial', categories: ['editorial'] },
  { key: 'live_event', labelKey: 'category.liveEvent', categories: ['live_event'] },
  { key: 'public_appearance', labelKey: 'category.publicAppearance', categories: ['public_appearance'] },
  { key: 'commercial', labelKey: 'category.commercial', categories: ['commercial'] },
  {
    key: 'talks',
    labelKey: 'door.talks',
    categories: ['interview', 'variety', 'radio'],
  },
  { key: 'live', labelKey: 'door.live', categories: ['live_stream'] },
  { key: 'behind_the_scenes', labelKey: 'category.behindTheScenes', categories: ['behind_the_scenes'] },
  { key: 'early_archive', labelKey: 'category.earlyArchive', categories: ['early_archive'] },
];

/** Second level of the talks door: the shelf IS the project category. */
const TALK_SHELVES: Array<{ value: string; labelKey: TranslationKey }> = [
  { value: 'interview', labelKey: 'category.interview' },
  { value: 'variety', labelKey: 'category.variety' },
  { value: 'radio', labelKey: 'category.radio' },
];

const BATCH_SIZE = 3;

export function PromoteWizardModal({ isOpen, draftIds, onClose, onDone }: PromoteWizardModalProps) {
  const { t } = useAdminLang();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [search, setSearch] = useState('');

  const [projectId, setProjectId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  // Live-event subject is not typed any more: the subtype and the city decide
  // it (spec 4.3, FANMEET-BKK). City is picked, not written, so two curators
  // cannot produce two spellings of the same place.
  const [city, setCity] = useState('');
  const [personCode, setPersonCode] = useState<'LMSY' | 'LM' | 'SY'>('LMSY');
  const [assetGroup, setAssetGroup] = useState('');
  const [captionPrefix, setCaptionPrefix] = useState('');
  const [writeCover, setWriteCover] = useState(false);

  const [preview, setPreview] = useState<PreviewInfo | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOptions | null>(null);
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [customClass, setCustomClass] = useState(false);
  // Hall hierarchy: door first, then (talks) the shelf or (live) the registry
  // sub-type, then events.
  const [doorKey, setDoorKey] = useState('live_event');
  // Talks door only: which shelf (interview / variety / radio) the event and
  // its pictures belong to. Empty until picked explicitly.
  const [shelf, setShelf] = useState('');
  // Drama door only: which work (series row) the event belongs to. The drama
  // hall files events under works FIRST, then sub-types - same shape as the
  // front door, so a premiere lands on the right series without hunting.
  const [dramaSeries, setDramaSeries] = useState('');
  const [subtypeFilter, setSubtypeFilter] = useState('all');
  // Inline event creation state.
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [creatingEventNow, setCreatingEventNow] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    eventDate: '',
    subtype: '',
    portalVisible: true,
  });
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
    setCity('');
    setPersonCode('LMSY');
    setAssetGroup('');
    setCaptionPrefix('');
    setWriteCover(false);
    setPreview(null);
    setErrors([]);
    setPhase('select');
    setSearch('');
    setCustomClass(false);
    setNewEvent({ title: '', eventDate: '', subtype: '', portalVisible: true });

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
    setCity(project.city ?? '');
    // The person now belongs to the event (it is the id's tail code), so the
    // picker follows the row instead of starting at a default that would
    // contradict ids already filed under this event.
    setPersonCode(
      project.person === 'LM' || project.person === 'SY' ? project.person : 'LMSY'
    );
    const groups = project.asset_groups || [];
    setAssetGroup(defaultClassOf(groups));
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
        // Default the class to 演出图 whenever this category uses it. It is the
        // commonest class by a wide margin, and leaving the pick to "first
        // common group" meant a fresh import could silently be filed under a
        // class nobody read - the previous default was a retired one.
        setAssetGroup((prev) => {
          if (prev || customClass) return prev;
          return defaultClassOf(options.commonGroups);
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

  // A rejection belongs to the value that produced it. Editing the subject (or
  // the class / person) makes the notice below the button stale - it sat there
  // describing a segment that was no longer in the field, which read like the
  // current input was being refused.
  useEffect(() => {
    setErrors([]);
  }, [subject, assetGroup, personCode, projectId]);

  // The real DB category the wizard currently works on. For the talks door
  // this is the chosen shelf; empty until picked, which also empties the
  // event list and blocks inline creation.
  const activeCategory = doorKey === 'talks' ? shelf : doorKey;

  // Doors 3 and 4 name their assets by shelf type + city (spec 4.3 / 4.4).
  // Both halves come from a pick, so the field is read-only there and editable
  // everywhere else until those halls get the same treatment.
  const picksSubject = hasPickedSubject(activeCategory);
  const effectiveSubject = picksSubject
    ? pickedSubject(activeCategory, project?.subtype, city) ?? ''
    : subject;

  // Only cities the code table knows can be picked - an unknown name would
  // silently drop the second segment.
  const cityOptions = useMemo(() => {
    const seen = new Set(Object.keys(CITY_CODES));
    for (const p of projects) {
      if (hasPickedSubject(p.category) && p.city) seen.add(p.city.trim());
    }
    return Array.from(seen).filter((name) => CITY_CODES[name]).sort();
  }, [projects]);

  // The drama hall's second level: the series rows themselves. Events hang
  // off a work through work_id, so the pick gates the event list the same way
  // the talks shelf does.
  const dramaSeriesRows = useMemo(
    () =>
      projects
        .filter((p) => p.category === 'drama_work' && p.project_kind === 'series')
        .sort((a, b) => (b.event_date ?? '').localeCompare(a.event_date ?? '')),
    [projects]
  );
  const dramaSeriesRow = useMemo(
    () => dramaSeriesRows.find((row) => row.id === dramaSeries) ?? null,
    [dramaSeriesRows, dramaSeries]
  );

  const filteredProjects = useMemo(() => {
    if (!activeCategory) return [];
    const q = search.trim().toLowerCase();
    let list: ProjectRow[];
    if (doorKey === 'drama_work') {
      // Work first: no work picked, no list - and the series rows themselves
      // are works, not events, so they never appear as promotable targets.
      if (!dramaSeriesRow) return [];
      list = projects.filter(
        (p) =>
          p.category === 'drama_work' &&
          p.project_kind !== 'series' &&
          p.work_id === dramaSeriesRow.work_id
      );
    } else {
      list = projects.filter((p) => p.category === activeCategory);
    }
    const subtypes = SUBTYPES_BY_CATEGORY[activeCategory as keyof typeof SUBTYPES_BY_CATEGORY];
    // The drama hall filters by WORK only - picking a work already narrows the
    // list to that show, so it has no sub-type filter of its own.
    if (doorKey !== 'drama_work' && subtypeFilter !== 'all' && subtypes?.length) {
      list = list.filter((p) => p.subtype === subtypeFilter);
    }
    if (!q) return list;
    return list.filter((p) =>
      [p.title, p.event_date, p.id]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [projects, activeCategory, doorKey, dramaSeriesRow, subtypeFilter, search]);

  const subtypesForCategory = useMemo(
    () => SUBTYPES_BY_CATEGORY[activeCategory as keyof typeof SUBTYPES_BY_CATEGORY] ?? [],
    [activeCategory]
  );

  // Class dropdown: the project's own preset classes first, then classes the
  // same category actually uses - always pickable, never invented ad hoc.
  const mergedClassOptions = useMemo(() => {
    const own = project?.asset_groups || [];
    const common = (subjectOptions?.commonGroups || []).filter((g) => !own.includes(g));
    return [...own, ...common];
  }, [project, subjectOptions]);

  const createEvent = async () => {
    // The shelf pick doubles as the category for the talks door - without it
    // there is nowhere to file the new event.
    if (!activeCategory || !newEvent.title.trim() || !newEvent.eventDate) return;
    // A sub-type must be chosen explicitly - never fall back to the first
    // option of the list, which is how an event lands in the wrong shelf.
    if (subtypesForCategory.length > 0 && !newEvent.subtype) return;
    // A drama event must hang off the picked work, or the curation tree
    // (which files events under series via work_id) would never show it.
    if (doorKey === 'drama_work' && !dramaSeriesRow) return;
    setCreatingEventNow(true);
    setCreateError(null);
    try {
      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEvent.title.trim(),
          category: activeCategory,
          subtype: subtypesForCategory.length > 0 ? newEvent.subtype : undefined,
          event_date: newEvent.eventDate,
          portal_visible: newEvent.portalVisible,
          work_id: doorKey === 'drama_work' ? dramaSeriesRow?.work_id ?? null : undefined,
        }),
      });
      const result = await response.json();
      if (!result?.success || !result?.project) {
        throw new Error(result?.error || 'Failed to create event');
      }
      const created = result.project as ProjectRow;
      // Refresh the list and land on the new event.
      const listResponse = await fetch('/api/admin/projects', { cache: 'no-store' });
      const listResult = await listResponse.json();
      if (listResult?.projects) setProjects(listResult.projects as ProjectRow[]);
      setProjectId(created.id);
      setCreatingEvent(false);
      setNewEvent({ title: '', eventDate: '', subtype: '', portalVisible: true });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setCreatingEventNow(false);
    }
  };

  const refreshPreview = async () => {
    if (!project || !effectiveSubject.trim() || draftIds.length === 0) return;
    setPreviewing(true);
    setErrors([]);
    try {
      const response = await fetch('/api/admin/drafts/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftIds: [draftIds[0]],
          projectId: project.id,
          subject: effectiveSubject,
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
    if (!project || !effectiveSubject.trim() || draftIds.length === 0) return;
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
            subject: effectiveSubject,
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

  // The subject alone gates the run: when the city is unknown the code is
  // just the type (spec: an unknown city omits the segment), so a booking
  // with no city is still promotable.
  const canPreview = Boolean(
    project && effectiveSubject.trim() && draftIds.length > 0 && !previewing
  );
  const canRun = Boolean(
    project && effectiveSubject.trim() && preview && !running && draftIds.length > 0
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
              {/* Step 1: hall -> sub-type -> event */}
              <div className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
                  {t('d.promote.stepEvent')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={doorKey}
                    onChange={(e) => {
                      setDoorKey(e.target.value);
                      setShelf('');
                      setDramaSeries('');
                      setSubtypeFilter('all');
                      setProjectId(null);
                      setNewEvent((prev) => ({
                        ...prev,
                        // Force an explicit pick; never preselect the first.
                        subtype: '',
                      }));
                    }}
                    className="w-full border border-white/10 bg-black px-3 py-2 font-mono text-xs text-ink outline-none focus:border-lmsy-yellow/40"
                  >
                    {WIZARD_DOORS.map((door) => (
                      <option key={door.key} value={door.key}>
                        {t(door.labelKey)}
                      </option>
                    ))}
                  </select>
                  {doorKey === 'talks' ? (
                    // The talks door has no sub-types - its second level IS
                    // the project category, so the pick replaces both the
                    // shelf filter and the category itself.
                    <select
                      value={shelf}
                      onChange={(e) => {
                        setShelf(e.target.value);
                        setProjectId(null);
                      }}
                      className={`w-full border bg-black px-3 py-2 font-mono text-xs text-ink outline-none focus:border-lmsy-yellow/40 ${
                        shelf ? 'border-white/10' : 'border-lmsy-yellow/40'
                      }`}
                    >
                      <option value="">{t('d.promote.pickShelf')}</option>
                      {TALK_SHELVES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {t(s.labelKey)}
                        </option>
                      ))}
                    </select>
                  ) : doorKey === 'drama_work' ? (
                    // The drama door files events under WORKS first - the
                    // three series. Picking a work is enough to narrow the
                    // list; there is no sub-type filter on this door.
                    <select
                      value={dramaSeries}
                      onChange={(e) => {
                        setDramaSeries(e.target.value);
                        setSubtypeFilter('all');
                        setProjectId(null);
                      }}
                      className={`w-full border bg-black px-3 py-2 font-mono text-xs text-ink outline-none focus:border-lmsy-yellow/40 ${
                        dramaSeries ? 'border-white/10' : 'border-lmsy-yellow/40'
                      }`}
                    >
                      <option value="">{t('d.promote.pickWork')}</option>
                      {dramaSeriesRows.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.title}
                        </option>
                      ))}
                    </select>
                  ) : subtypesForCategory.length > 0 && (
                    <select
                      value={subtypeFilter}
                      onChange={(e) => setSubtypeFilter(e.target.value)}
                      className="w-full border border-white/10 bg-black px-3 py-2 font-mono text-xs text-ink outline-none focus:border-lmsy-yellow/40"
                    >
                      <option value="all">{t('d.promote.subtypeAll')}</option>
                      {subtypesForCategory.map((s) => (
                        <option key={s.value} value={s.value}>
                          {t(s.labelKey)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
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

                  {/* Inline event creation: the picture batch usually comes
                      from an event that has no project row yet. */}
                  {creatingEvent ? (
                    <div className="space-y-2.5 border border-lmsy-yellow/30 bg-lmsy-yellow/[0.04] p-3">
                      <input
                        type="text"
                        autoFocus
                        value={newEvent.title}
                        onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder={t('d.promote.newEventTitle')}
                        className="w-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs tracking-wide text-ink outline-none placeholder:text-ink-2 focus:border-lmsy-yellow/40"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={newEvent.eventDate}
                          onChange={(e) => setNewEvent((prev) => ({ ...prev, eventDate: e.target.value }))}
                          className="w-full border border-white/10 bg-black px-3 py-2 font-mono text-xs text-ink outline-none focus:border-lmsy-yellow/40"
                        />
                        {subtypesForCategory.length > 0 ? (
                          <select
                            value={newEvent.subtype}
                            onChange={(e) => setNewEvent((prev) => ({ ...prev, subtype: e.target.value }))}
                            className={`w-full border px-3 py-2 font-mono text-xs outline-none focus:border-lmsy-yellow/40 ${
                              newEvent.subtype ? 'border-white/10 bg-black text-ink' : 'border-lmsy-yellow/50 bg-black text-lmsy-yellow'
                            }`}
                          >
                            <option value="">{t('d.promote.chooseSubtype')}</option>
                            {subtypesForCategory.map((s) => (
                              <option key={s.value} value={s.value}>
                                {t(s.labelKey)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center px-3 font-mono text-[10px] text-ink-2">
                            {(() => {
                              const door = WIZARD_DOORS.find((d) => d.key === doorKey);
                              if (doorKey === 'talks' && shelf) {
                                const s = TALK_SHELVES.find((item) => item.value === shelf);
                                return s ? t(s.labelKey) : t(door?.labelKey ?? 'category.liveEvent');
                              }
                              return t(door?.labelKey ?? 'category.liveEvent');
                            })()}
                          </div>
                        )}
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] text-ink-2">
                        <input
                          type="checkbox"
                          checked={newEvent.portalVisible}
                          onChange={(e) =>
                            setNewEvent((prev) => ({ ...prev, portalVisible: e.target.checked }))
                          }
                          className="h-3 w-3 accent-lmsy-yellow"
                        />
                        {t('d.promote.newEventVisible')}
                      </label>
                      {createError && (
                        <p className="font-mono text-[10px] text-red-300/80">{createError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void createEvent()}
                          disabled={
                            !activeCategory ||
                            !newEvent.title.trim() ||
                            !newEvent.eventDate ||
                            (subtypesForCategory.length > 0 && !newEvent.subtype) ||
                            (doorKey === 'drama_work' && !dramaSeriesRow) ||
                            creatingEventNow
                          }
                          className="flex flex-1 items-center justify-center gap-2 bg-lmsy-yellow px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {creatingEventNow && <Loader2 className="h-3 w-3 animate-spin" />}
                          {t('d.promote.newEventCreate')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCreatingEvent(false);
                            setCreateError(null);
                          }}
                          className="border border-white/15 px-3 py-2 font-mono text-[11px] text-ink-2 hover:border-white/30 hover:text-ink"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingEvent(true);
                        setCreateError(null);
                      }}
                      className="w-full border border-dashed border-white/20 px-3 py-2 text-center font-mono text-[11px] text-ink-2 transition-colors hover:border-lmsy-yellow/40 hover:text-ink"
                    >
                      ＋ {t('d.promote.newEvent')}
                    </button>
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
                      {customClass ? (
                        <span className="flex items-center gap-1.5">
                          <input
                            type="text"
                            autoFocus
                            value={assetGroup}
                            onChange={(e) => setAssetGroup(e.target.value)}
                            onBlur={() => {
                              if (!assetGroup.trim()) setCustomClass(false);
                            }}
                            placeholder={t('d.promote.classPlaceholder')}
                            className="w-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs tracking-wide text-ink outline-none focus:border-lmsy-yellow/40"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomClass(false);
                              setAssetGroup(defaultClassOf(mergedClassOptions));
                            }}
                            title={t('common.back')}
                            className="shrink-0 border border-white/15 px-2 py-2 font-mono text-[10px] text-ink-2 hover:border-white/30 hover:text-ink"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : (
                        <select
                          value={assetGroup}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setCustomClass(true);
                              setAssetGroup('');
                            } else {
                              setAssetGroup(e.target.value);
                            }
                          }}
                          className="w-full border border-white/10 bg-black px-3 py-2 font-mono text-xs text-ink outline-none focus:border-lmsy-yellow/40"
                        >
                          {mergedClassOptions.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                          <option value="">{t('d.promote.noClass')}</option>
                          <option value="__custom__">{t('d.promote.newClass')}</option>
                        </select>
                      )}
                    </label>

                    <label className="block space-y-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
                        {t('d.promote.person')}
                      </span>
                      {/* Locked once the event has a number: the tail code is
                          part of that number, so changing it now would leave
                          the pictures already filed under it on the old code.
                          A fresh event has nothing filed yet and stays free. */}
                      <select
                        value={personCode}
                        disabled={Boolean(project.catalog_id)}
                        onChange={(e) => {
                          const next = e.target.value as 'LMSY' | 'LM' | 'SY';
                          setPersonCode(next);
                          setPreview(null);
                          // Remember it on the event, the same way the city is
                          // remembered, so the next batch needs no answer.
                          setProjects((prev) =>
                            prev.map((row) =>
                              row.id === project.id ? { ...row, person: next } : row
                            )
                          );
                          void fetch(`/api/admin/projects/${project.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ person: next }),
                          }).catch(() => {
                            // The id is already derived locally; a failed save
                            // only means the next batch asks again.
                          });
                        }}
                        className={`w-full border border-white/10 bg-black px-3 py-2 font-mono text-xs outline-none focus:border-lmsy-yellow/40 ${
                          project.catalog_id ? 'cursor-not-allowed text-ink-2' : 'text-ink'
                        }`}
                      >
                        {PERSON_CODES.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                      {project.catalog_id && (
                        <span className="block font-mono text-[9px] leading-relaxed text-ink-2/70">
                          {t('d.promote.personLocked')}
                        </span>
                      )}
                    </label>

                    {picksSubject && (
                      <label className="block space-y-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
                          {t('d.promote.city')}
                        </span>
                        <select
                          value={city}
                          onChange={(e) => {
                            const next = e.target.value;
                            setCity(next);
                            setPreview(null);
                            // Remember the pick on the event itself, so the
                            // next batch into the same room needs no answer.
                            if (project) {
                              setProjects((prev) =>
                                prev.map((row) =>
                                  row.id === project.id ? { ...row, city: next || null } : row
                                )
                              );
                              void fetch(`/api/admin/projects/${project.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ city: next || null }),
                              }).catch(() => {
                                // The code is already derived locally; a failed
                                // save only means the next batch asks again.
                              });
                            }
                          }}
                          className={`w-full border bg-black px-3 py-2 font-mono text-xs outline-none focus:border-lmsy-yellow/40 ${
                            city ? 'border-white/10 text-ink' : 'border-lmsy-yellow/50 text-lmsy-yellow'
                          }`}
                        >
                          <option value="">{t('d.promote.pickCity')}</option>
                          {cityOptions.map((name) => (
                            <option key={name} value={name}>
                              {name} · {CITY_CODES[name]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <label className="block space-y-1.5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
                        {t('d.promote.subject')}
                      </span>
                      {picksSubject ? (
                        <>
                          <div className="w-full border border-lmsy-yellow/30 bg-lmsy-yellow/[0.08] px-3 py-2 font-mono text-xs tracking-wide text-lmsy-yellow">
                            {effectiveSubject || '—'}
                          </div>
                          <span className="block font-mono text-[9px] leading-relaxed text-ink-2/70">
                            {t('d.promote.subjectLocked')} · {t('d.promote.subjectLockedHint')}
                          </span>
                        </>
                      ) : (
                        <>
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
                        </>
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
