'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Plus, Play, Calendar, ChevronRight, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { supabase, type Project } from '@/lib/supabase';
import EditProjectModal from './_components/edit-project-modal';

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    projectId: string;
    projectTitle: string;
  }>({
    show: false,
    projectId: '',
    projectTitle: '',
  });
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .schema('lmsy_archive')
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

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setEditModalOpen(true);
  };

  const handleUpdate = () => {
    // Refresh the projects list after successful update
    fetchProjects();
    showToast('PROJECT_RECORD_UPDATED');
  };

  const handleDeleteClick = (project: Project) => {
    setDeleteConfirm({
      show: true,
      projectId: project.id,
      projectTitle: project.title,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.projectId) return;

    setDeletingProjectId(deleteConfirm.projectId);
    setDeleteConfirm(prev => ({ ...prev, show: false }));

    try {
      // Get session for Bearer token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('[PROJECTS] No valid session:', sessionError);
        alert('Authentication required. Please log in again.');
        window.location.href = '/admin/login';
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      console.log('[PROJECTS] Deleting project:', deleteConfirm.projectId);

      const response = await fetch(`/api/admin/projects/${deleteConfirm.projectId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error('Delete operation returned unsuccessful');
      }

      console.log('[PROJECTS] ✅ Delete successful, reloading page...');

      // Show toast
      showToast('PROJECT_DELETED_FROM_ARCHIVE');

      // Force page reload to ensure real-time feedback
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Delete error:', error);
      showToast('DELETE_OPERATION_FAILED', 'error');
      setDeletingProjectId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, projectId: '', projectTitle: '' });
  };

  const categoryConfig: Record<string, {
    label: string;
    className: string;
  }> = {
    series: {
      label: 'TV_SERIES',
      className: 'text-lmsy-yellow border-lmsy-yellow/30 bg-lmsy-yellow/5 backdrop-blur-sm',
    },
    editorial: {
      label: 'EDITORIAL',
      className: 'text-lmsy-blue border-lmsy-blue/30 bg-lmsy-blue/5 backdrop-blur-sm',
    },
    appearance: {
      label: 'APPEARANCE',
      className: 'text-white border-white/20 bg-white/5 backdrop-blur-sm',
    },
    journal: {
      label: 'JOURNAL',
      className: 'text-white/40 border-white/10 bg-transparent backdrop-blur-sm',
    },
    commercial: {
      label: 'COMMERCIAL',
      className: 'text-amber-200/70 border-amber-500/20 bg-amber-500/5 backdrop-blur-sm',
    },
    // Legacy support
    music: {
      label: 'MUSIC_VIDEO',
      className: 'text-white border-white/20 bg-white/5 backdrop-blur-sm',
    },
    magazine: {
      label: 'MAGAZINE',
      className: 'text-lmsy-blue border-lmsy-blue/30 bg-lmsy-blue/5 backdrop-blur-sm',
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
                    <motion.span
                      className={`inline-block px-2 py-1 text-[10px] font-mono tracking-[0.1em] uppercase border ${config.className}`}
                      whileHover={{
                        scale: 1.02,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {config.label}
                    </motion.span>
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
                    <button
                      onClick={() => handleEdit(project)}
                      className="p-1.5 text-white/20 hover:text-lmsy-yellow/60 hover:bg-lmsy-yellow/5 transition-all"
                    >
                      <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(project)}
                      disabled={deletingProjectId === project.id}
                      className="p-1.5 text-white/20 hover:text-red-400/80 hover:bg-red-500/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {deletingProjectId === project.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        project={selectedProject}
        onUpdate={handleUpdate}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm.show && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelDelete}
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
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  boxShadow: '0 0 40px rgba(0, 0, 0, 0.8), 0 0 80px rgba(239, 68, 68, 0.15)',
                  backdropFilter: 'blur(40px)',
                  backgroundColor: 'rgba(10, 10, 10, 0.95)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <div>
                    <h2 className="text-lg font-serif text-white/90">确认销毁档案</h2>
                    <p className="text-[10px] font-mono text-red-400/60 tracking-wider uppercase mt-0.5">
                      ARCHIVE_DESTRUCTION_PROTOCOL
                    </p>
                  </div>
                  <motion.button
                    onClick={cancelDelete}
                    className="text-white/30 hover:text-white/60 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <p className="text-sm text-white/60 leading-relaxed">
                    即将永久删除以下项目档案：
                  </p>

                  <div className="px-4 py-3 bg-red-500/5 border border-red-500/20 rounded">
                    <p className="text-sm text-white/90 font-serif truncate">
                      {deleteConfirm.projectTitle}
                    </p>
                    <p className="text-[10px] font-mono text-white/30 mt-1">
                      ID: {deleteConfirm.projectId}
                    </p>
                  </div>

                  <p className="text-xs text-red-400/70 font-mono tracking-wide">
                    ⚠️ 此操作不可撤销。档案将从数据库中永久移除。
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-6 pb-6">
                  <motion.button
                    onClick={cancelDelete}
                    disabled={deletingProjectId !== null}
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
                    onClick={confirmDelete}
                    disabled={deletingProjectId !== null}
                    className="flex-1 py-2.5 rounded border font-mono text-xs tracking-wider transition-all relative overflow-hidden flex items-center justify-center gap-2"
                    style={{
                      borderColor: deletingProjectId ? 'rgba(255, 255, 255, 0.1)' : 'rgba(239, 68, 68, 0.5)',
                      color: deletingProjectId ? 'rgba(255, 255, 255, 0.3)' : 'rgba(239, 68, 68, 0.9)',
                      backgroundColor: 'rgba(0, 0, 0, 0)',
                      cursor: deletingProjectId ? 'not-allowed' : 'pointer',
                    }}
                    whileHover={deletingProjectId === null ? {
                      borderColor: 'rgba(239, 68, 68, 0.7)',
                      textShadow: '0 0 15px rgba(239, 68, 68, 0.8)',
                    } : {}}
                    whileTap={deletingProjectId === null ? { scale: 0.98 } : {}}
                  >
                    {deletingProjectId ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        DELETING...
                      </>
                    ) : (
                      'CONFIRM_DELETE'
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
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
