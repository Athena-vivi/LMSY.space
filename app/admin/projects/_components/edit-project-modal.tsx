'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { supabase, type Project } from '@/lib/supabase';
import { type ProjectCategory } from '@/lib/supabase/types';
import CategoryDropdown from '@/app/admin/upload/_components/category-dropdown';

const CATEGORY_OPTIONS: { value: ProjectCategory; label: string; prefix: string }[] = [
  { value: 'series', label: 'TV_SERIES', prefix: 'TV' },
  { value: 'editorial', label: 'EDITORIAL', prefix: 'ED' },
  { value: 'appearance', label: 'APPEARANCE', prefix: 'AP' },
  { value: 'journal', label: 'JOURNAL', prefix: 'JR' },
  { value: 'commercial', label: 'COMMERCIAL', prefix: 'CM' },
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
  const [category, setCategory] = useState<ProjectCategory>('series');
  const [releaseDate, setReleaseDate] = useState('');
  const [description, setDescription] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load project data when modal opens
  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setCategory(project.category);
      setReleaseDate(project.release_date || '');
      setDescription(project.description || '');
      setReferenceUrl(project.watch_url || '');
      setTags(project.tags || []);
    }
  }, [project]);

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

      // Prepare update data
      const updateData = {
        title: title.trim(),
        category,
        release_date: releaseDate || null,
        description: description || null,
        watch_url: referenceUrl || null,
        tags: tags.length > 0 ? tags : null,
      };

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
              className="relative w-full max-w-lg bg-black border rounded-lg overflow-hidden"
              style={{
                borderColor: 'rgba(251, 191, 36, 0.2)',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.8), 0 0 80px rgba(251, 191, 36, 0.1)',
                backdropFilter: 'blur(40px)',
                backgroundColor: 'rgba(10, 10, 10, 0.95)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                <div>
                  <h2 className="text-lg font-serif text-white/90">EDIT_PROJECT_RECORD</h2>
                  <p className="text-[10px] font-mono text-white/30 tracking-wider uppercase mt-0.5">
                    ARCHIVE_MODIFICATION_PROTOCOL
                  </p>
                </div>
                <motion.button
                  onClick={onClose}
                  className="text-white/30 hover:text-white/60 transition-colors"
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
                  <label className="block text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
                    TITLE *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter project title..."
                    className="w-full px-0 py-2 bg-transparent text-white/90 focus:outline-none border-b focus:border-lmsy-yellow/40 transition-colors placeholder:text-white/20"
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
                  <label className="block text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
                    CATEGORY
                  </label>
                  <CategoryDropdown
                    options={CATEGORY_OPTIONS}
                    value={category}
                    onChange={setCategory}
                  />
                </div>

                {/* Release Date */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
                    RELEASE_DATE
                  </label>
                  <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full px-0 py-2 bg-transparent text-white/70 font-mono text-sm focus:outline-none border-b focus:border-lmsy-yellow/40 transition-colors [color-scheme:dark]"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
                    DESCRIPTION
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Project description..."
                    rows={3}
                    className="w-full px-3 py-2 bg-transparent text-white/70 text-sm focus:outline-none border focus:border-lmsy-yellow/40 transition-colors placeholder:text-white/20 resize-none"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
                      TAGS
                    </label>
                    <span className="text-[8px] font-mono" style={{ color: tags.length >= MAX_TAGS ? 'rgba(239, 68, 68, 0.7)' : 'rgba(255, 255, 255, 0.2)' }}>
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
                    className="w-full px-0 py-1.5 bg-transparent text-white/40 font-mono text-xs focus:outline-none border-b focus:border-lmsy-yellow/40 transition-colors placeholder:text-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  />

                  {/* Quick Add Tags */}
                  <div className="pt-2">
                    <div className="text-[8px] font-mono text-white/15 tracking-wider uppercase mb-2">
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
                            className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-all ${
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

                {/* Reference Link */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
                    REFERENCE_LINK
                  </label>
                  <input
                    type="url"
                    value={referenceUrl}
                    onChange={(e) => setReferenceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-0 py-2 bg-transparent text-white/70 font-mono text-sm focus:outline-none border-b focus:border-lmsy-blue/40 transition-colors placeholder:text-white/20"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
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
