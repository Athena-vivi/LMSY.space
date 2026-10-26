'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { supabase, type Project } from '@/lib/supabase';
import { type ProjectCategory, type ProjectSubtype } from '@/lib/supabase/types';
import { SUBTYPES_BY_CATEGORY } from '@/lib/category-registry';
import CategoryDropdown from '@/app/(en)/admin/upload/_components/category-dropdown';

// The eight stable values from lib/category-registry.ts. The label is the
// admin-facing shorthand, the prefix feeds catalog_id allocation.
const CATEGORY_OPTIONS: { value: ProjectCategory; label: string; prefix: string }[] = [
  { value: 'drama_work', label: 'DRAMA_WORK', prefix: 'STILL' },
  { value: 'editorial', label: 'EDITORIAL', prefix: 'MAG' },
  { value: 'live_event', label: 'LIVE_EVENT', prefix: 'STAGE' },
  { value: 'public_appearance', label: 'PUBLIC_APPEARANCE', prefix: 'TRV' },
  { value: 'commercial', label: 'COMMERCIAL', prefix: 'AD' },
  { value: 'behind_the_scenes', label: 'BEHIND_THE_SCENES', prefix: 'BTS' },
  { value: 'personal_travel', label: 'PERSONAL_TRAVEL', prefix: 'DAILY' },
  { value: 'early_archive', label: 'EARLY_ARCHIVE', prefix: 'G' },
];

const CURATOR_FAVORITE_TAGS = [
  'Editorial',
  '2024Autumn',
  'MINT',
  'Fashion',
  'Portrait',
  'BehindScenes',
];

const MAX_TAGS = 8;

/** The four values allowed by projects_project_kind_check. */
const PROJECT_KINDS = ['event', 'theme', 'series', 'video'] as const;
type ProjectKind = (typeof PROJECT_KINDS)[number];

/**
 * Which column a date edit lands in.
 *
 * The public surfaces read `event_date` first and fall back to `release_date`
 * (lib/door-data.ts, lib/timeline.ts, lib/project-span.ts), so `event_date` is
 * the one a visitor actually sees. Magazines are the exception: the editorial
 * page prints `release_date` itself, and the naming spec requires the issue
 * date, the image filename date and both project columns to agree - so an
 * editorial row gets both columns written.
 */
interface DateTarget {
  column: 'event_date' | 'release_date';
  mirrorsReleaseDate: boolean;
  hint: string;
}

function dateTargetFor(category: ProjectCategory): DateTarget {
  if (category === 'editorial') {
    return {
      column: 'release_date',
      mirrorsReleaseDate: true,
      hint: 'Writes release_date (issue day) + event_date · image filenames are not renamed',
    };
  }
  return {
    column: 'event_date',
    mirrorsReleaseDate: false,
    hint: 'Writes event_date - the date the public pages print',
  };
}

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onUpdate: () => void;
}

export default function EditProjectModal({
  isOpen,
  onClose,
  project,
  onUpdate,
}: EditProjectModalProps) {
  const [title, setTitle] = useState('');
  /**
   * Per-language title strings as they already are in the database. This panel
   * only edits the base title, so zh/th are kept verbatim and written back -
   * dropping them here would silently delete existing translations.
   */
  const [titleI18n, setTitleI18n] = useState<Record<string, unknown>>({});
  const [category, setCategory] = useState<ProjectCategory>('drama_work');
  /** Which class inside the hall this row belongs to. NULL means the hall is enough. */
  const [subtype, setSubtype] = useState<ProjectSubtype | null>(null);
  /** Door 1 only: which series this entry hangs under. Empty for the series row itself. */
  const [workId, setWorkId] = useState<string>('');
  const [seriesOptions, setSeriesOptions] = useState<{ id: string; work_id: string | null; title: string }[]>([]);
  const [eventDate, setEventDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [curationStatus, setCurationStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  /**
   * What kind of row this is. series = a work other entries hang under (door 1
   * only); video = an entry whose payload is a link instead of a picture wall;
   * theme = a subject across dates; event = one dated happening.
   */
  const [projectKind, setProjectKind] = useState<ProjectKind>('event');
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Value the date input opened with, so an untouched field is never rewritten. */
  const initialDate = useRef('');

  // Load project data when modal opens
  useEffect(() => {
    if (project) {
      const shownDate = project.event_date || project.release_date || '';

      setTitle(project.title);
      setTitleI18n((project.title_i18n as Record<string, unknown> | null | undefined) ?? {});
      setCategory(project.category);
      setSubtype((project.subtype as ProjectSubtype | null) ?? null);
      setWorkId(project.work_id ?? '');
      setEventDate(shownDate);
      initialDate.current = shownDate;
      setTags(project.tags || []);
      setCurationStatus(project.curation_status || 'draft');
      setProjectKind(
        PROJECT_KINDS.includes(project.project_kind as ProjectKind)
          ? (project.project_kind as ProjectKind)
          : 'event'
      );
    }
  }, [project]);

  // Door 1 needs one extra choice no other hall has: which series the entry
  // hangs under. The list is the live set of series rows, never a constant.
  useEffect(() => {
    if (!isOpen || category !== 'drama_work') return;
    let cancelled = false;
    supabase
      .schema('lmsy_archive')
      .from('projects')
      .select('id, work_id, title')
      .eq('category', 'drama_work')
      .eq('project_kind', 'series')
      .order('title')
      .then(({ data }) => {
        if (!cancelled) {
          setSeriesOptions(
            (data ?? []) as { id: string; work_id: string | null; title: string }[]
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, category]);

  const subtypeOptions = SUBTYPES_BY_CATEGORY[category] ?? [];
  const dateTarget = dateTargetFor(category);

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) {
      setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.trim());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!project || !title.trim()) {
      alert('Title is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // 🔒 CRITICAL: Verify session exists before API call
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('[EDIT_PROJECT] No valid session:', sessionError);
        alert('Authentication required. Please log in again.');
        window.location.href = '/admin/login';
        return;
      }

      // Only the fields this panel actually shows are sent. Everything else
      // (description, theme statement, portal flags, interview body, links)
      // is left untouched by simply not appearing in the payload.
      const updateData: Record<string, unknown> = {
        title: title.trim(),
        // Keep en in step with the base title, otherwise getLocalizedText()
        // keeps serving the old English string and the rename looks ignored.
        title_i18n: { ...titleI18n, en: title.trim() },
        category,
        subtype,
        work_id: workId || null,
        project_kind: projectKind,
        tags: tags.length > 0 ? tags : null,
        curation_status: curationStatus,
      };

      // Never rewrite an untouched date: rows whose event_date is empty but
      // whose release_date holds a source date would otherwise inherit it.
      if (eventDate !== initialDate.current) {
        updateData.event_date = eventDate || null;
        if (dateTarget.mirrorsReleaseDate) {
          updateData.release_date = eventDate || null;
        }
      }

      // Update via API
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updateData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Update failed');
      }

      // Success - trigger refresh
      initialDate.current = eventDate;
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Update failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && project && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg max-h-[90vh] bg-black border rounded-lg overflow-hidden flex flex-col"
              style={{
                borderColor: 'rgba(251, 191, 36, 0.2)',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.8), 0 0 80px rgba(251, 191, 36, 0.1)',
                backdropFilter: 'blur(40px)',
                backgroundColor: 'rgba(10, 10, 10, 0.95)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                <div>
                  <h2 className="text-lg font-serif text-ink">EDIT_PROJECT_RECORD</h2>
                  <p className="text-[10px] font-mono text-ink-2 tracking-wider uppercase mt-0.5">
                    ARCHIVE_MODIFICATION_PROTOCOL
                  </p>
                </div>
                <motion.button
                  onClick={onClose}
                  className="text-ink-2 hover:text-ink-2 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                {/* Title - the base title every language falls back to */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                    TITLE *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter project title..."
                    className="w-full px-0 py-2 bg-transparent text-ink focus:outline-none border-b focus:border-lmsy-yellow/40 transition-colors placeholder:text-ink-2"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      fontFamily: 'var(--font-playfair), Georgia, serif',
                      fontSize: '16px',
                    }}
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                    CATEGORY
                  </label>
                  <CategoryDropdown
                    options={CATEGORY_OPTIONS}
                    value={category}
                    onChange={setCategory}
                  />
                </div>

                {/* Sub-class inside the hall - the class the visitor clicks
                    into before reaching this row. Empty means the hall has no
                    classes, which is the normal case for most doors. */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                    SUBTYPE
                  </label>
                  {subtypeOptions.length > 0 ? (
                    <select
                      value={subtype ?? ''}
                      onChange={(e) =>
                        setSubtype((e.target.value || null) as ProjectSubtype | null)
                      }
                      className="w-full px-3 py-2 bg-black text-ink-2 font-mono text-sm focus:outline-none border"
                      style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <option value="">— none (the hall is enough) —</option>
                      {subtypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[11px] text-ink-2/60">
                      This hall has no classes yet. The row sits directly under the door.
                    </p>
                  )}
                </div>

                {/* Door 1 only: an entry belongs to a series, the series row
                    itself does not. */}
                {category === 'drama_work' && projectKind !== 'series' && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                      SERIES
                    </label>
                    <select
                      value={workId}
                      onChange={(e) => setWorkId(e.target.value)}
                      className="w-full px-3 py-2 bg-black text-ink-2 font-mono text-sm focus:outline-none border"
                      style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <option value="">— not filed under a series —</option>
                      {seriesOptions
                        .filter((option) => option.work_id)
                        .map((option) => (
                          <option key={option.id} value={option.work_id as string}>
                            {option.title}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Project kind - an event on one date, or a subject that
                    recurs across dates. It decides whether the timeline gets a
                    project point and whether the surfaces show one date or the
                    span of the images. */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                    PROJECT_KIND
                  </label>
                  <select
                    value={projectKind}
                    onChange={(e) => setProjectKind(e.target.value as ProjectKind)}
                    className="w-full px-3 py-2 bg-black text-ink-2 font-mono text-sm focus:outline-none border"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    <option value="event">event — one dated happening</option>
                    <option value="theme">theme — a subject across dates</option>
                    <option value="series">series — a work that entries hang under</option>
                    <option value="video">video — an entry that links out</option>
                  </select>
                  {projectKind === 'theme' && (
                    <p className="text-[11px] text-ink-2/70">
                      No project point on the timeline. The date below is not displayed; the
                      span is derived from the images&apos; own dates.
                    </p>
                  )}
                </div>

                {/* Date. This is the only date a visitor can see, so it edits
                    the column the public pages read - not release_date. */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                    DATE
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-0 py-2 bg-transparent text-ink-2 font-mono text-sm focus:outline-none border-b focus:border-lmsy-yellow/40 transition-colors [color-scheme:dark]"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                  />
                  <p className="text-[10px] font-mono text-ink-2/50">
                    {dateTarget.hint.toUpperCase()}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                    CURATION_STATUS
                  </label>
                  <select
                    value={curationStatus}
                    onChange={(e) => setCurationStatus(e.target.value as 'draft' | 'published' | 'archived')}
                    className="w-full px-3 py-2 bg-black text-ink-2 font-mono text-sm focus:outline-none border"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    <option value="draft">draft</option>
                    <option value="published">published</option>
                    <option value="archived">archived</option>
                  </select>
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                      TAGS
                    </label>
                    <span className="text-[10px] font-mono" style={{ color: tags.length >= MAX_TAGS ? 'rgba(239, 68, 68, 0.7)' : 'rgba(255, 255, 255, 0.2)' }}>
                      {tags.length} / {MAX_TAGS}
                    </span>
                  </div>

                  {/* Selected Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, index) => (
                      <motion.span
                        key={tag}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border cursor-pointer transition-all"
                        style={{
                          borderColor: index % 2 === 0 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: index % 2 === 0 ? 'rgba(251, 191, 36, 0.7)' : 'rgba(56, 189, 248, 0.7)',
                        }}
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: index % 2 === 0 ? 'rgba(251, 191, 36, 0.08)' : 'rgba(56, 189, 248, 0.08)',
                        }}
                      >
                        <span className="font-mono">#{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 hover:bg-white/10 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" strokeWidth={2.5} />
                        </button>
                      </motion.span>
                    ))}
                  </div>

                  {/* Tag Input */}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder={tags.length >= MAX_TAGS ? "Maximum tags reached" : "+ Add tag"}
                    disabled={tags.length >= MAX_TAGS}
                    className="w-full px-0 py-1.5 bg-transparent text-ink-2 font-mono text-xs focus:outline-none border-b focus:border-lmsy-yellow/40 transition-colors placeholder:text-ink-2 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  />

                  {/* Quick Add Tags */}
                  <div className="pt-2">
                    <div className="text-[10px] font-mono text-ink-2 tracking-wider uppercase mb-2">
                      Quick Add
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {CURATOR_FAVORITE_TAGS.map((tag) => {
                        const isSelected = tags.includes(tag);
                        const isDisabled = isSelected || tags.length >= MAX_TAGS;
                        return (
                          <motion.button
                            key={tag}
                            type="button"
                            onClick={() => !isDisabled && addTag(tag)}
                            disabled={isDisabled}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                              isSelected
                                ? 'bg-white/10 cursor-default'
                                : isDisabled
                                ? 'opacity-20 cursor-not-allowed'
                                : 'hover:border-lmsy-yellow/30'
                            }`}
                            style={{
                              borderColor: isSelected
                                ? 'rgba(251, 191, 36, 0.3)'
                                : 'rgba(255, 255, 255, 0.08)',
                              color: isSelected
                                ? 'rgba(251, 191, 36, 0.9)'
                                : 'rgba(255, 255, 255, 0.35)',
                            }}
                            whileHover={!isDisabled ? { scale: 1.02 } : {}}
                            whileTap={!isDisabled ? { scale: 0.98 } : {}}
                          >
                            #{tag}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 sticky bottom-0 bg-black/95 pb-1">
                  <motion.button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded border font-mono text-xs tracking-wider transition-all"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}
                    whileHover={{
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.8)',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    CANCEL
                  </motion.button>

                  <motion.button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="flex-1 py-2.5 rounded border font-mono text-xs tracking-wider transition-all relative overflow-hidden"
                    style={{
                      borderColor: title.trim() && !isSubmitting ? 'rgba(251, 191, 36, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                      color: title.trim() && !isSubmitting ? 'rgba(251, 191, 36, 0.9)' : 'rgba(255, 255, 255, 0.3)',
                      backgroundColor: 'rgba(0, 0, 0, 0)',
                      cursor: title.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                    }}
                    whileHover={title.trim() && !isSubmitting ? {
                      borderColor: 'rgba(251, 191, 36, 0.7)',
                      textShadow: '0 0 15px rgba(251, 191, 36, 0.8)',
                    } : {}}
                    whileTap={title.trim() && !isSubmitting ? { scale: 0.98 } : {}}
                    whileFocus={title.trim() && !isSubmitting ? {
                      boxShadow: '0 0 20px rgba(251, 191, 36, 0.3), 0 0 40px rgba(56, 189, 248, 0.2)',
                    } : {}}
                  >
                    {/* Streaming border effect */}
                    {title.trim() && !isSubmitting && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.4), rgba(56, 189, 248, 0.4), transparent)',
                          backgroundSize: '200% 100%',
                        }}
                        animate={{
                          backgroundPosition: ['200% 0', '-200% 0'],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                    )}
                    <span className="relative z-10">
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          UPDATING...
                        </span>
                      ) : (
                        '[ UPDATE_RECORD ]'
                      )}
                    </span>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
