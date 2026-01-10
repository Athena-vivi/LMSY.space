'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Plus, Play, Calendar, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { supabase, type Project } from '@/lib/supabase';

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('release_date', { ascending: false });

    if (!error && data) setProjects(data);
    setLoading(false);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== id));
      showToast('PROJECT_DELETED_FROM_ARCHIVE');
    } else {
      showToast('DELETE_OPERATION_FAILED', 'error');
    }
  };

  const categoryConfig: Record<string, {
    label: string;
    color: string;
    bg: string;
    border: string;
  }> = {
    series: {
      label: 'TV_SERIES',
      color: 'rgba(251, 191, 36, 0.9)',
      bg: 'rgba(251, 191, 36, 0.1)',
      border: 'rgba(251, 191, 36, 0.3)',
    },
    editorial: {
      label: 'EDITORIAL',
      color: 'rgba(168, 85, 247, 0.9)',
      bg: 'rgba(168, 85, 247, 0.1)',
      border: 'rgba(168, 85, 247, 0.3)',
    },
    appearance: {
      label: 'APPEARANCE',
      color: 'rgba(56, 189, 248, 0.9)',
      bg: 'rgba(56, 189, 248, 0.1)',
      border: 'rgba(56, 189, 248, 0.3)',
    },
    journal: {
      label: 'JOURNAL',
      color: 'rgba(236, 72, 153, 0.9)',
      bg: 'rgba(236, 72, 153, 0.1)',
      border: 'rgba(236, 72, 153, 0.3)',
    },
    commercial: {
      label: 'COMMERCIAL',
      color: 'rgba(34, 197, 94, 0.9)',
      bg: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(34, 197, 94, 0.3)',
    },
    // Legacy support
    music: {
      label: 'MUSIC_VIDEO',
      color: 'rgba(56, 189, 248, 0.9)',
      bg: 'rgba(56, 189, 248, 0.1)',
      border: 'rgba(56, 189, 248, 0.3)',
    },
    magazine: {
      label: 'MAGAZINE',
      color: 'rgba(168, 85, 247, 0.9)',
      bg: 'rgba(168, 85, 247, 0.1)',
      border: 'rgba(168, 85, 247, 0.3)',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-light text-white/90 tracking-tight">
            PROJECTS_ARCHIVE
          </h1>
          <p className="text-xs font-mono text-white/30 tracking-wider">
            CAREER_HISTORY_MANAGEMENT_SYSTEM
          </p>
        </div>

        {/* Add Project Button - Outline Style */}
        <motion.button
          className="flex items-center gap-3 px-4 py-2 border border-white/10 text-white/40 text-xs font-mono hover:text-white/60 hover:border-white/20 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="h-4 w-4 flex items-center justify-center">
            <Plus className="h-3 w-3" strokeWidth={2.5} style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.9), rgba(56, 189, 248, 0.9))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }} />
          </div>
          <span>ADD_NEW_ENTRY</span>
        </motion.button>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-32"
          >
            <div className="text-xs font-mono text-white/20 tracking-wider">
              <span className="animate-pulse">LOADING_PROJECT_DATA_</span>
            </div>
          </motion.div>
        ) : projects.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative py-20"
          >
            {/* Vertical Timeline Dashed Line */}
            <div className="absolute left-8 top-0 bottom-0 w-px">
              <div className="h-full w-full" style={{
                backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 50%, transparent 50%)',
                backgroundSize: '1px 8px',
              }} />
            </div>

            {/* Timeline Nodes */}
            <div className="absolute left-8 top-8 space-y-32">
              <div className="relative">
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/10" />
              </div>
              <div className="relative">
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/10" />
              </div>
              <div className="relative">
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/10" />
              </div>
            </div>

            {/* Empty State Message */}
            <div className="pl-20">
              <div className="space-y-2">
                <p className="text-xs font-mono text-white/20 tracking-widest">
                  HISTORY_RECORD_START
                </p>
                <p className="text-[10px] font-mono text-white/10 tracking-wider">
                  NO_PROJECT_ENTRIES_FOUND
                </p>
                <motion.button
                  className="mt-4 flex items-center gap-2 px-4 py-2 border border-white/10 text-white/30 text-xs font-mono hover:text-white/50 hover:border-white/20 transition-all"
                  whileHover={{ x: 4 }}
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  <span>INITIALIZE_FIRST_RECORD</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-1"
          >
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b text-xs font-mono font-medium tracking-wider"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div className="col-span-4 text-white/40">PROJECT_TITLE</div>
              <div className="col-span-2 text-white/40">CATEGORY</div>
              <div className="col-span-2 text-white/40">RELEASE_DATE</div>
              <div className="col-span-3 text-white/40">STATUS</div>
              <div className="col-span-1 text-white/40 text-right">ACTIONS</div>
            </div>

            {/* Table Rows */}
            {projects.map((project, index) => {
              const config = categoryConfig[project.category] || categoryConfig.series;
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="grid grid-cols-12 gap-4 px-4 py-3 border items-center font-light hover:bg-white/[0.02] transition-colors group"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  {/* Title */}
                  <div className="col-span-4">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="relative w-16 h-10 flex-shrink-0 bg-white/5 overflow-hidden">
                        {project.cover_url ? (
                          <Image
                            src={project.cover_url}
                            alt={project.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-4 w-4 text-white/10" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm text-white/80 font-serif truncate">
                          {project.title}
                        </h3>
                        {project.description && (
                          <p className="text-[10px] text-white/30 font-mono truncate mt-0.5">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category Badge */}
                  <div className="col-span-2">
                    <span
                      className="inline-block px-2 py-1 text-[10px] font-mono tracking-wider border"
                      style={{
                        color: config.color,
                        backgroundColor: config.bg,
                        borderColor: config.border,
                      }}
                    >
                      {config.label}
                    </span>
                  </div>

                  {/* Release Date */}
                  <div className="col-span-2">
                    {project.release_date ? (
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Calendar className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                        <span className="font-mono tracking-wide">
                          {new Date(project.release_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-white/20 font-mono">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="col-span-3">
                    {project.watch_url ? (
                      <a
                        href={project.watch_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs text-lmsy-blue/60 hover:text-lmsy-blue/80 transition-colors group/link"
                      >
                        <span className="font-mono tracking-wider">AVAILABLE</span>
                        <ChevronRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" strokeWidth={2} />
                      </a>
                    ) : (
                      <span className="text-xs text-white/20 font-mono">ARCHIVED</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end gap-2">
                    <button className="p-1.5 text-white/20 hover:text-white/40 hover:bg-white/5 transition-all">
                      <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-1.5 text-white/20 hover:text-red-400/80 hover:bg-red-500/5 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 border font-mono text-xs tracking-wider"
            style={{
              backgroundColor: toast.type === 'success' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(220, 38, 38, 0.9)',
              borderColor: toast.type === 'success' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(220, 38, 38, 0.5)',
              boxShadow: toast.type === 'success'
                ? '0 0 20px rgba(251, 191, 36, 0.2), 0 0 40px rgba(251, 191, 36, 0.1)'
                : '0 0 20px rgba(220, 38, 38, 0.2)',
              color: toast.type === 'success' ? 'rgba(251, 191, 36, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
