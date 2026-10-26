'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { Project, ProjectCategory, ProjectSubtype } from '@/lib/supabase/types';
import { SUBTYPES_BY_CATEGORY } from '@/lib/category-registry';
import CategoryDropdown from './category-dropdown';

interface QuickProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

// The categories that own a front door (lib/category-registry.ts). The three
// legacy ones (behind_the_scenes, personal_travel, early_archive) are not
// offered: a row created here goes live immediately, and they have no page.
// The prefix is the door code from lib/catalog-id.ts, not the retired
// STILL / STAGE / TRV / AD / G scheme.
const CATEGORY_OPTIONS: { value: ProjectCategory; label: string; prefix: string }[] = [
  { value: 'drama_work', label: 'Drama & Works', prefix: 'DRAMA' },
  { value: 'editorial', label: 'Editorial (Magazine)', prefix: 'MAG' },
  { value: 'live_event', label: 'Live Events', prefix: 'EVENT' },
  { value: 'public_appearance', label: 'Public Appearances', prefix: 'APPEAR' },
  { value: 'commercial', label: 'Commercial (Brand)', prefix: 'BRAND' },
  { value: 'interview', label: 'Talks · Interview', prefix: 'TALK' },
  { value: 'variety', label: 'Talks · Variety', prefix: 'TALK' },
  { value: 'radio', label: 'Talks · Radio', prefix: 'TALK' },
  { value: 'live_stream', label: 'Live Stream', prefix: 'LIVE' },
];

export default function QuickProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}: QuickProjectModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProjectCategory>('drama_work');
  /** Which class inside the hall the new row lands in. */
  const [subtype, setSubtype] = useState<ProjectSubtype | null>(null);
  /** Door 1 only: the series this entry belongs to. */
  const [workId, setWorkId] = useState('');
  const [seriesOptions, setSeriesOptions] = useState<{ id: string; work_id: string | null; title: string }[]>([]);
  const [releaseDate, setReleaseDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtypeOptions = SUBTYPES_BY_CATEGORY[category] ?? [];

  // A new row created here is an entry of the hall it was filed in: it appears
  // under that door's class as soon as it exists, so the owner can go straight
  // from "create project" to "add pictures" without hunting for a publish step.
  useEffect(() => {
    if (!isOpen) return;
    setSubtype(null);
  }, [category, isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    // The catalog id carries a date segment, and the API refuses a row without
    // one - say so here instead of after a round trip.
    if (!releaseDate) {
      alert('Release date is required (the catalog id needs a date)');
      return;
    }

    setIsSubmitting(true);

    try {
      // 🔒 CRITICAL: Verify session exists before API call
      console.log('[QUICK_PROJECT] ========== Session Verification ==========');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('[QUICK_PROJECT] No valid session:', sessionError);
        alert('Authentication required. Please log in again.');
        // Force redirect to login page
        window.location.href = '/admin/login';
        return;
      }

      console.log('[QUICK_PROJECT] ✅ Session verified for user:', session.user.email);

      // The row is created through the API, not the browser client: that route
      // is where the field whitelist, the slug and the ISR invalidation live.
      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          subtype: subtype ?? undefined,
          event_date: releaseDate,
          work_id: workId || undefined,
          portal_visible: true,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success || !result?.project) {
        alert(result?.error || 'Failed to create the project');
        return;
      }

      // Reset form
      setTitle('');
      setCategory('drama_work');
      setReleaseDate('');

      // Notify parent component
      onProjectCreated(result.project as Project);

      // Close modal
      onClose();
    } catch (error) {
      console.log('[QUICK_PROJECT] ========== CATCH BLOCK ERROR ==========');
      console.log('[QUICK_PROJECT] Exception caught:', error);
      console.log('[DB_ERROR_DETAIL]', JSON.stringify(error, null, 2));
      alert(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
              className="relative w-full max-w-md bg-black border rounded-lg overflow-hidden"
              style={{
                borderColor: 'rgba(251, 191, 36, 0.2)',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.8), 0 0 80px rgba(251, 191, 36, 0.1)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                <div>
                  <h2 className="text-lg font-serif text-ink">New Orbit Project</h2>
                  <p className="text-[10px] font-mono text-ink-2 tracking-wider uppercase mt-0.5">
                    Quick Establishment
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
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Title */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                    Title *
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
                    autoFocus
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                    Category
                  </label>
                  <CategoryDropdown
                    options={CATEGORY_OPTIONS}
                    value={category}
                    onChange={setCategory}
                  />
                  {/* Selected prefix display */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] font-mono text-lmsy-yellow/60 tracking-wider"
                  >
                    Catalog Prefix: {CATEGORY_OPTIONS.find(opt => opt.value === category)?.prefix}
                  </motion.div>
                </div>

                {/* The class inside the hall - where the row will be listed. */}
                {subtypeOptions.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                      Subtype
                    </label>
                    <select
                      value={subtype ?? ''}
                      onChange={(e) =>
                        setSubtype((e.target.value || null) as ProjectSubtype | null)
                      }
                      className="w-full px-3 py-2 bg-black/40 text-ink-2 font-mono text-sm focus:outline-none border"
                      style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      <option value="">— none —</option>
                      {subtypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Door 1 only: which series this entry belongs to. */}
                {category === 'drama_work' && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                      Series
                    </label>
                    <select
                      value={workId}
                      onChange={(e) => setWorkId(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 text-ink-2 font-mono text-sm focus:outline-none border"
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

                {/* Release Date */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-ink-2 tracking-[0.2em] uppercase">
                    Release Date
                  </label>
                  <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full px-0 py-2 bg-transparent text-ink-2 font-mono text-sm focus:outline-none border-b focus:border-lmsy-yellow/40 transition-colors [color-scheme:dark]"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <motion.button
                    type="button"
                    onClick={onClose}
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
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span
                          className="w-3 h-3 border border-current border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        ESTABLISHING...
                      </span>
                    ) : (
                      'ESTABLISH ORBIT'
                    )}
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
