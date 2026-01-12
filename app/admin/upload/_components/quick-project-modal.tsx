'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { Project, ProjectCategory } from '@/lib/supabase/types';
import CategoryDropdown from './category-dropdown';

interface QuickProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

const CATEGORY_OPTIONS: { value: ProjectCategory; label: string; prefix: string }[] = [
  { value: 'series', label: 'Series (TV/Drama)', prefix: 'STILL' },
  { value: 'editorial', label: 'Editorial (Magazine)', prefix: 'MAG' },
  { value: 'appearance', label: 'Appearance (Event/Stage)', prefix: 'STAGE' },
  { value: 'daily', label: 'Daily (日常)', prefix: 'DAILY' },
  { value: 'travel', label: 'Travel (旅途)', prefix: 'TRV' },
  { value: 'commercial', label: 'Commercial (Ad/Brand)', prefix: 'AD' },
];

export default function QuickProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}: QuickProjectModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProjectCategory>('series');
  const [releaseDate, setReleaseDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Title is required');
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

      // 🔍 DEBUG: Log the exact query being executed
      console.log('[QUICK_PROJECT] ========== Database Insert ==========');
      console.log('[QUICK_PROJECT] Schema: lmsy_archive');
      console.log('[QUICK_PROJECT] Table: projects');

      // 🛡️ 防御性编程：只提交数据库中存在的字段
      const insertData = {
        title: title.trim(),
        category,
        release_date: releaseDate || null,
        description: null,
        cover_url: null,
        watch_url: null,
      };

      console.log('[QUICK_PROJECT] Insert data:', insertData);

      // 显式解构 Supabase 返回值（显式指定 schema）
      const { data, error } = await supabase
        .schema('lmsy_archive')
        .from('projects')
        .insert(insertData)
        .select()
        .single();

      // 打印原始 JSON 错误详情
      if (error) {
        console.log('[QUICK_PROJECT] ========== DATABASE ERROR DETAILS ==========');
        console.log('[DB_ERROR_DETAIL]', JSON.stringify(error, null, 2));
        console.log('[QUICK_PROJECT] Error message:', error.message);
        console.log('[QUICK_PROJECT] Error hint:', (error as any).hint);
        console.log('[QUICK_PROJECT] Error details:', (error as any).details);
        console.log('[QUICK_PROJECT] Error code:', (error as any).code);

        // 检查是否是 schema 错误
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.error('[QUICK_PROJECT] 🔴 SCHEMA ERROR: Code is still pointing to wrong schema!');
          console.error('[QUICK_PROJECT] Expected: lmsy_archive.projects');
          console.error('[QUICK_PROJECT] Error message suggests:', error.message);
          alert(`Schema Error: ${error.message}\n\nThe code is not pointing to lmsy_archive schema.`);
          return;
        }

        // 显示错误给用户
        alert(error.message);
        return;
      }

      console.log('[QUICK_PROJECT] ✅ Insert successful! Project ID:', data?.id);

      // Reset form
      setTitle('');
      setCategory('series');
      setReleaseDate('');

      // Notify parent component
      onProjectCreated(data as Project);

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
                  <h2 className="text-lg font-serif text-white/90">New Orbit Project</h2>
                  <p className="text-[10px] font-mono text-white/30 tracking-wider uppercase mt-0.5">
                    Quick Establishment
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
                    Title *
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
                    autoFocus
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
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
                    className="text-[8px] font-mono text-lmsy-yellow/60 tracking-wider"
                  >
                    Catalog Prefix: {CATEGORY_OPTIONS.find(opt => opt.value === category)?.prefix}
                  </motion.div>
                </div>

                {/* Release Date */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
                    Release Date
                  </label>
                  <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full px-0 py-2 bg-transparent text-white/70 font-mono text-sm focus:outline-none border-b focus:border-lmsy-yellow/40 transition-colors [color-scheme:dark]"
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
