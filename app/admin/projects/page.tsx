'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Plus, Play, Calendar, Loader2, X, Images, ExternalLink, ArrowRightLeft, SplitSquareVertical, RotateCcw, RotateCw } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase, type Project } from '@/lib/supabase';
import EditProjectModal from './_components/edit-project-modal';
import { useAdminLang } from '@/lib/admin-i18n';
import { getImageUrl } from '@/lib/image-url';

interface ProjectPreviewAsset {
  id: string;
  image_url: string;
  project_id: string | null;
  catalog_id: string | null;
  rotation: number | null;
}

export default function AdminProjectsPage() {
  const { t, lang } = useAdminLang();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Project['category']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [projectAssets, setProjectAssets] = useState<Record<string, ProjectPreviewAsset[]>>({});
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
    const [
      { data: projectData, error: projectError },
      { data: assetData, error: assetError },
    ] = await Promise.all([
      supabase
        .schema('lmsy_archive')
        .from('projects')
        .select('*')
        .order('release_date', { ascending: false }),
      supabase
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('id, image_url, project_id, catalog_id, rotation')
        .order('created_at', { ascending: true }),
    ]);

    if (!projectError && projectData) setProjects(projectData);
    if (!assetError && assetData) {
      const grouped = assetData.reduce<Record<string, ProjectPreviewAsset[]>>((acc, asset) => {
        if (!asset.project_id) return acc;
        if (!acc[asset.project_id]) acc[asset.project_id] = [];
        acc[asset.project_id].push(asset);
        return acc;
      }, {});
      setProjectAssets(grouped);
    }
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

  const getAuthHeaders = async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      alert('Authentication required. Please log in again.');
      window.location.href = '/admin/login';
      throw new Error('Authentication required');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };
  };

  const handleMerge = async (project: Project) => {
    const input = prompt(t('p.mergePrompt'));
    if (!input) return;

    const target = projects.find((item) =>
      item.id === input.trim() || item.title.trim().toLowerCase() === input.trim().toLowerCase()
    );

    if (!target) {
      showToast('TARGET_PROJECT_NOT_FOUND', 'error');
      return;
    }

    if (target.id === project.id) {
      showToast('CANNOT_MERGE_INTO_SELF', 'error');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/projects/${project.id}/merge`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ targetProjectId: target.id }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Merge failed');
      }

      showToast('PROJECTS_MERGED');
      fetchProjects();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'MERGE_FAILED', 'error');
    }
  };

  const handleSplit = async (project: Project) => {
    const title = prompt(t('p.splitPrompt'));
    if (!title?.trim()) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/projects/${project.id}/split`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ title: title.trim() }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Split failed');
      }

      showToast('PROJECT_SPLIT_CREATED');
      fetchProjects();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'SPLIT_FAILED', 'error');
    }
  };

  const handleRotateAsset = async (asset: ProjectPreviewAsset, direction: 'left' | 'right') => {
    try {
      const headers = await getAuthHeaders();
      const currentRotation = asset.rotation ?? 0;
      const nextRotation = direction === 'left'
        ? (currentRotation + 270) % 360
        : (currentRotation + 90) % 360;

      const response = await fetch('/api/admin/gallery', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ id: asset.id, rotation: nextRotation }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'ROTATE_FAILED');
      }

      setProjectAssets((prev) => {
        const next = { ...prev };
        const items = next[asset.project_id || ''] || [];
        next[asset.project_id || ''] = items.map((item) =>
          item.id === asset.id ? { ...item, rotation: nextRotation } : item
        );
        return next;
      });
      showToast('ASSET_ROTATION_UPDATED');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'ROTATE_FAILED', 'error');
    }
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
      label: 'cat.TV_SERIES',
      className: 'text-lmsy-yellow border-lmsy-yellow/30 bg-lmsy-yellow/5 backdrop-blur-sm',
    },
    editorial: {
      label: 'cat.EDITORIAL',
      className: 'text-lmsy-blue border-lmsy-blue/30 bg-lmsy-blue/5 backdrop-blur-sm',
    },
    appearance: {
      label: 'cat.APPEARANCE',
      className: 'text-white border-white/20 bg-white/5 backdrop-blur-sm',
    },
    journal: {
      label: 'cat.JOURNAL',
      className: 'text-ink-2 border-white/10 bg-transparent backdrop-blur-sm',
    },
    commercial: {
      label: 'cat.COMMERCIAL',
      className: 'text-amber-200/70 border-amber-500/20 bg-amber-500/5 backdrop-blur-sm',
    },
    // Legacy support
    music: {
      label: 'cat.MUSIC_VIDEO',
      className: 'text-white border-white/20 bg-white/5 backdrop-blur-sm',
    },
    magazine: {
      label: 'cat.MAGAZINE',
      className: 'text-lmsy-blue border-lmsy-blue/30 bg-lmsy-blue/5 backdrop-blur-sm',
    },
  };

  const categoryOptions = useMemo(
    () => ['all', ...Array.from(new Set(projects.map((project) => project.category).filter(Boolean)))],
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesQuery = normalizedQuery.length === 0 || [
        project.title,
        project.description,
        project.id,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));

      const matchesCategory = categoryFilter === 'all' || project.category === categoryFilter;

      // ADR-001 D4: status comes only from the formal curation_status field.
      // The previous fallback inferred 'published'/'archived' from the mere
      // presence of watch_url, which is a reference link, not a lifecycle
      // state. Rows without a value are displayed under their default
      // ('draft') — no new status semantics are introduced here.
      const normalizedStatus = project.curation_status ?? 'draft';
      const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;

      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [projects, searchQuery, categoryFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-light text-ink tracking-tight">
            PROJECTS_ARCHIVE
          </h1>
          <p className="text-xs font-mono text-ink-2 tracking-wider">
            CAREER_HISTORY_MANAGEMENT_SYSTEM
          </p>
        </div>

        {/* Add Project Button - Outline Style */}
        <motion.button
          className="flex items-center gap-3 px-4 py-2 border border-white/10 text-ink-2 text-xs font-mono hover:text-ink-2 hover:border-white/20 transition-all"
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
          <span>{t('p.addNew')}</span>
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
            <div className="text-xs font-mono text-ink-2 tracking-wider">
              <span className="animate-pulse">{t('common.loading')}</span>
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
                <p className="text-xs font-mono text-ink-2 tracking-widest">
                  HISTORY_RECORD_START
                </p>
                <p className="text-[10px] font-mono text-ink-2 tracking-wider">
                  NO_PROJECT_ENTRIES_FOUND
                </p>
                <motion.button
                  className="mt-4 flex items-center gap-2 px-4 py-2 border border-white/10 text-ink-2 text-xs font-mono hover:text-ink-2 hover:border-white/20 transition-all"
                  whileHover={{ x: 4 }}
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  <span>{t('p.initializeFirst')}</span>
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
            <div className="flex flex-col gap-3 border px-4 py-4 md:flex-row md:items-center md:justify-between"
              style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <div className="flex flex-1 flex-col gap-3 md:flex-row">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('wb.searchPlaceholder')}
                  className="w-full border bg-transparent px-3 py-2 font-mono text-xs tracking-wider text-ink-2 outline-none transition-colors placeholder:text-ink-2 md:max-w-sm"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                />
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value as 'all' | Project['category'])}
                  className="border bg-black px-3 py-2 font-mono text-xs tracking-wider text-ink-2 outline-none transition-colors"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'all' ? t('cat.ALL') : t('cat.'+option)}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | 'published' | 'draft' | 'archived')}
                  className="border bg-black px-3 py-2 font-mono text-xs tracking-wider text-ink-2 outline-none transition-colors"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <option value="all">{t('wb.filterAll')}</option>
                  <option value="published">{t('status.published')}</option>
                  <option value="draft">{t('status.candidate')}</option>
                  <option value="archived">{t('status.archived')}</option>
                </select>
              </div>
              <div className="text-xs font-mono tracking-wider text-ink-2">
                {filteredProjects.length} / {projects.length}
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b text-xs font-mono font-medium tracking-wider"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div className="col-span-4 text-ink-2">{t('p.projectTitle')}</div>
              <div className="col-span-2 text-ink-2">{t('common.category')}</div>
              <div className="col-span-2 text-ink-2">{t('common.date')}</div>
              <div className="col-span-3 text-ink-2">{t('common.status')}</div>
              <div className="col-span-1 text-ink-2 text-right">{t('common.actions')}</div>
            </div>

            {/* Table Rows */}
            {filteredProjects.map((project, index) => {
              const config = categoryConfig[project.category] || categoryConfig.series;
              const previewAssets = projectAssets[project.id] || [];
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
                      <Link
                        href={`/admin/projects/${project.id}/curate`}
                        className="relative block w-16 h-10 flex-shrink-0 bg-white/5 overflow-hidden transition-opacity hover:opacity-80"
                        title={t('p.viewAssets')}
                      >
                        {(() => {
                          const coverUrl = getImageUrl(project.cover_url);
                          return coverUrl ? (
                            <Image
                              src={coverUrl}
                              alt={project.title}
                              fill
                              className="object-cover"
                              unoptimized
                              />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="h-4 w-4 text-ink-2" strokeWidth={1.5} />
                            </div>
                          );
                        })()}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm text-ink-2 font-serif truncate">
                          {project.title}
                        </h3>
                        {project.description && (
                          <p className="text-[10px] text-ink-2 font-mono truncate mt-0.5">
                            {project.description}
                          </p>
                        )}
                        {previewAssets.length > 0 && (
                          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {previewAssets.map((asset) => {
                              const imageUrl = getImageUrl(asset.image_url);
                              return (
                                <div
                                  key={asset.id}
                                  className="relative h-24 w-20 flex-shrink-0 overflow-hidden border bg-black/30"
                                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                                >
                                  {imageUrl ? (
                                    <Image
                                      src={imageUrl}
                                      alt={asset.catalog_id || project.title}
                                      fill
                                      className="object-contain p-1"
                                      style={{ transform: `rotate(${asset.rotation ?? 0}deg)` }}
                                      unoptimized
                                    />
                                  ) : null}
                                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 px-1 py-1">
                                    <button
                                      onClick={() => handleRotateAsset(asset, 'left')}
                                      className="text-ink-2 transition-colors hover:text-white"
                                      title={t('c.rotateLeft')}
                                    >
                                      <RotateCcw className="h-3 w-3" strokeWidth={1.8} />
                                    </button>
                                    <button
                                      onClick={() => handleRotateAsset(asset, 'right')}
                                      className="text-ink-2 transition-colors hover:text-white"
                                      title={t('c.rotateRight')}
                                    >
                                      <RotateCw className="h-3 w-3" strokeWidth={1.8} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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
                      {t(config.label)}
                    </motion.span>
                  </div>

                  {/* Release Date */}
                  <div className="col-span-2">
                    {project.release_date ? (
                      <div className="flex items-center gap-2 text-xs text-ink-2">
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
                      <span className="text-xs text-ink-2 font-mono">—</span>
                    )}
                  </div>

                  {/* Status — from the formal curation_status field only
                      (ADR-001 D4). watch_url is a reference link, not a
                      lifecycle state, and no longer drives this column. */}
                  <div className="col-span-3">
                    <span className="text-xs font-mono text-ink-2">
                      {project.curation_status === 'published'
                        ? t('status.published')
                        : project.curation_status === 'archived'
                          ? t('status.archived')
                          : t('status.candidate')}
                    </span>
                    {project.project_kind === 'theme' && (
                      <span className="ml-2 border border-lmsy-blue/40 px-1 py-0.5 text-[9px] font-mono tracking-[0.1em] text-lmsy-blue/80">
                        {t('status.theme')}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-ink-2 hover:text-lmsy-blue/80 hover:bg-lmsy-blue/5 transition-all"
                      title={t('p.viewLive')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>
                    <Link
                      href={`/admin/gallery?tab=all&projectId=${project.id}`}
                      className="p-1.5 text-ink-2 hover:text-lmsy-blue/60 hover:bg-lmsy-blue/5 transition-all"
                      title={t('p.viewAssets')}
                    >
                      <Images className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>
                    <button
                      onClick={() => handleMerge(project)}
                      className="p-1.5 text-ink-2 hover:text-ink-2 hover:bg-white/5 transition-all"
                      title={t('p.merge')}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleSplit(project)}
                      className="p-1.5 text-ink-2 hover:text-ink-2 hover:bg-white/5 transition-all"
                      title={t('p.split')}
                    >
                      <SplitSquareVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleEdit(project)}
                      className="p-1.5 text-ink-2 hover:text-lmsy-yellow/60 hover:bg-lmsy-yellow/5 transition-all"
                    >
                      <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(project)}
                      disabled={deletingProjectId === project.id}
                      className="p-1.5 text-ink-2 hover:text-red-400/80 hover:bg-red-500/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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

            {filteredProjects.length === 0 && (
              <div
                className="border px-4 py-10 text-center text-xs font-mono tracking-wider text-ink-2"
                style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                NO_MATCHING_PROJECTS
              </div>
            )}
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
                    <h2 className="text-lg font-serif text-ink">确认销毁档案</h2>
                    <p className="text-[10px] font-mono text-red-400/60 tracking-wider uppercase mt-0.5">
                      ARCHIVE_DESTRUCTION_PROTOCOL
                    </p>
                  </div>
                  <motion.button
                    onClick={cancelDelete}
                    className="text-ink-2 hover:text-ink-2 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <p className="text-sm text-ink-2 leading-relaxed">
                    即将永久删除以下项目档案：
                  </p>

                  <div className="px-4 py-3 bg-red-500/5 border border-red-500/20 rounded">
                    <p className="text-sm text-ink font-serif truncate">
                      {deleteConfirm.projectTitle}
                    </p>
                    <p className="text-[10px] font-mono text-ink-2 mt-1">
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
            {t('t.' + toast.message).startsWith('t.') ? toast.message : t('t.' + toast.message)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
