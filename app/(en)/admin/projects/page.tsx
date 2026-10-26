'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Plus, Play, Calendar, Loader2, X, Images, ExternalLink, ArrowRightLeft, SplitSquareVertical, RotateCcw, RotateCw, ImagePlus } from 'lucide-react';
import Image from 'next/image';
import { supabase, type Project } from '@/lib/supabase';
import { SUBTYPES_BY_CATEGORY } from '@/lib/category-registry';
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
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Selection drives the right-hand management panel: the list stays a quiet
  // inventory of events, actions only appear for the picked event.
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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

  // Pictures of the event currently picked in the list. Loaded per event on
  // selection - the old page prefetched the whole gallery into one map, which
  // silently breaks past the 1000-row API cap.
  const [panelAssets, setPanelAssets] = useState<ProjectPreviewAsset[]>([]);
  const [panelAssetsLoading, setPanelAssetsLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const { data: projectData, error: projectError } = await supabase
      .schema('lmsy_archive')
      .from('projects')
      .select('*')
      .order('release_date', { ascending: false });

    if (!projectError && projectData) setProjects(projectData);
    setLoading(false);
  };

  // Load the picked event's own pictures whenever the selection changes.
  useEffect(() => {
    if (!selectedProjectId) {
      setPanelAssets([]);
      return;
    }
    let cancelled = false;
    setPanelAssetsLoading(true);
    (async () => {
      const { data, error } = await supabase
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('id, image_url, project_id, catalog_id, rotation')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: true });
      if (!cancelled) {
        setPanelAssets(error ? [] : (data as ProjectPreviewAsset[]) || []);
        setPanelAssetsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

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

      setPanelAssets((prev) =>
        prev.map((item) =>
          item.id === asset.id ? { ...item, rotation: nextRotation } : item
        )
      );
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

      showToast('PROJECT_DELETED_FROM_ARCHIVE');

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

  // Badge colours per real door (drama_work / live_event / ...). The old map
  // keyed on retired category values and every row fell into the series
  // fallback, showing "剧集" for all doors - data was always correct.
  const categoryConfig: Record<string, { label: string; className: string }> = {
    drama_work: {
      label: 'category.dramaWork',
      className: 'text-lmsy-yellow border-lmsy-yellow/30 bg-lmsy-yellow/5 backdrop-blur-sm',
    },
    editorial: {
      label: 'category.editorial',
      className: 'text-lmsy-blue border-lmsy-blue/30 bg-lmsy-blue/5 backdrop-blur-sm',
    },
    live_event: {
      label: 'category.liveEvent',
      className: 'text-emerald-300/80 border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm',
    },
    public_appearance: {
      label: 'category.publicAppearance',
      className: 'text-white border-white/20 bg-white/5 backdrop-blur-sm',
    },
    commercial: {
      label: 'category.commercial',
      className: 'text-amber-200/70 border-amber-500/20 bg-amber-500/5 backdrop-blur-sm',
    },
    behind_the_scenes: {
      label: 'category.behindTheScenes',
      className: 'text-cyan-300/70 border-cyan-500/20 bg-cyan-500/5 backdrop-blur-sm',
    },
    personal_travel: {
      label: 'category.personalTravel',
      className: 'text-rose-300/70 border-rose-500/20 bg-rose-500/5 backdrop-blur-sm',
    },
    early_archive: {
      label: 'category.earlyArchive',
      className: 'text-ink-2 border-white/10 bg-transparent backdrop-blur-sm',
    },
    // Talk + live door categories. Without entries here badgeLabelKey fell
    // through to category.earlyArchive and every talk / live row wore an
    // "早期档案" badge.
    interview: {
      label: 'category.interview',
      className: 'text-sky-300/70 border-sky-500/20 bg-sky-500/5 backdrop-blur-sm',
    },
    variety: {
      label: 'category.variety',
      className: 'text-violet-300/70 border-violet-500/20 bg-violet-500/5 backdrop-blur-sm',
    },
    radio: {
      label: 'category.radio',
      className: 'text-teal-300/70 border-teal-500/20 bg-teal-500/5 backdrop-blur-sm',
    },
    press: {
      label: 'category.press',
      className: 'text-orange-300/70 border-orange-500/20 bg-orange-500/5 backdrop-blur-sm',
    },
    live_stream: {
      label: 'category.liveStream',
      className: 'text-fuchsia-300/70 border-fuchsia-500/20 bg-fuchsia-500/5 backdrop-blur-sm',
    },
  };

  /** Badge label: the registry sub-type when the door has one, else the door. */
  const badgeLabelKey = (project: Project): string => {
    const subtypes = SUBTYPES_BY_CATEGORY[project.category as keyof typeof SUBTYPES_BY_CATEGORY];
    const hit = subtypes?.find((s) => s.value === project.subtype);
    return hit?.labelKey ?? categoryConfig[project.category]?.label ?? 'category.earlyArchive';
  };

  const categoryOptions = useMemo(
    () => ['all', ...Array.from(new Set(projects.map((project) => project.category).filter(Boolean)))],
    [projects]
  );

  /** Real door names for the filter dropdown (same labels as the badges). */
  /**
   * Every category the projects table can hold, not just the eight doors.
   * The talk door (interview / variety / radio / press) and the live door
   * (live_stream) are real project categories too; leaving them out made the
   * dropdown fall back to category.earlyArchive, so "早期档案" was printed
   * six times - once for early_archive and once per talk/live category.
   */
  const CATEGORY_LABEL_KEY: Record<string, string> = {
    drama_work: 'category.dramaWork',
    editorial: 'category.editorial',
    live_event: 'category.liveEvent',
    public_appearance: 'category.publicAppearance',
    commercial: 'category.commercial',
    behind_the_scenes: 'category.behindTheScenes',
    personal_travel: 'category.personalTravel',
    early_archive: 'category.earlyArchive',
    interview: 'category.interview',
    variety: 'category.variety',
    radio: 'category.radio',
    press: 'category.press',
    live_stream: 'category.liveStream',
  };

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
      const normalizedStatus = project.curation_status ?? 'draft';
      const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;

      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [projects, searchQuery, categoryFilter, statusFilter]);

  // Keep the selection valid when the list changes (delete/filter).
  useEffect(() => {
    if (!selectedProjectId) return;
    if (!projects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(null);
    }
  }, [projects, selectedProjectId]);

  const activeProject = projects.find((p) => p.id === selectedProjectId) ?? null;

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
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start"
          >
            {/* ------------------------------------------------ ----------
                Left: the event inventory. One quiet row per event -
                picture, name, meta. No actions here; selection drives
                the right-hand panel.
            ---------------------------------------------------------- */}
            <div className="min-w-0 space-y-1">
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
                        {option === 'all' ? t('cat.ALL') : t(CATEGORY_LABEL_KEY[option] ?? 'category.earlyArchive')}
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

              {filteredProjects.map((project) => {
                const selected = project.id === selectedProjectId;
                const config = categoryConfig[project.category] || categoryConfig.early_archive;
                const coverUrl = getImageUrl(project.cover_url);
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(selected ? null : project.id)}
                    className={`flex w-full items-center gap-4 border px-4 py-3 text-left transition-colors ${
                      selected
                        ? 'border-lmsy-yellow/40 bg-lmsy-yellow/[0.06]'
                        : 'border-white/5 hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className="relative block h-14 w-20 shrink-0 overflow-hidden bg-white/5">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt={project.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <Play className="h-4 w-4 text-ink-2" strokeWidth={1.5} />
                        </span>
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-base text-ink">
                        {project.title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`inline-block px-1.5 py-0.5 text-[9px] font-mono tracking-[0.1em] uppercase border ${config.className}`}>
                          {t(badgeLabelKey(project))}
                        </span>
                        {project.event_date || project.release_date ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wide text-ink-2">
                            <Calendar className="h-2.5 w-2.5" strokeWidth={1.5} />
                            {(project.event_date || project.release_date)!.slice(0, 10)}
                          </span>
                        ) : null}
                        <span className="font-mono text-[10px] text-ink-2">
                          {project.curation_status === 'published'
                            ? t('status.published')
                            : project.curation_status === 'archived'
                              ? t('status.archived')
                              : t('status.candidate')}
                        </span>
                        {project.project_kind === 'theme' && (
                          <span className="border border-lmsy-blue/40 px-1 py-0.5 text-[9px] font-mono tracking-[0.1em] text-lmsy-blue/80">
                            {t('status.theme')}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
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
            </div>

            {/* ------------------------------------------------ ----------
                Right: management panel for the picked event. Preview
                first, actions underneath - the reverse of the old table.
            ---------------------------------------------------------- */}
            <aside className="border bg-white/[0.02] lg:sticky lg:top-6" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
              {!activeProject ? (
                <div className="px-6 py-16 text-center">
                  <ImagePlus className="mx-auto h-6 w-6 text-ink-2/50" strokeWidth={1.5} />
                  <p className="mt-4 font-mono text-[11px] leading-relaxed tracking-wider text-ink-2">
                    {t('p.panelHint')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 p-5">
                  {/* Cover preview */}
                  <div className="relative aspect-[3/2] w-full overflow-hidden border bg-black/40" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                    {(() => {
                      const coverUrl = getImageUrl(activeProject.cover_url) || getImageUrl(panelAssets[0]?.image_url);
                      return coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt={activeProject.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Play className="h-5 w-5 text-ink-2" strokeWidth={1.5} />
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-serif text-lg leading-snug text-ink">{activeProject.title}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-block px-1.5 py-0.5 text-[9px] font-mono tracking-[0.1em] uppercase border ${(categoryConfig[activeProject.category] || categoryConfig.early_archive).className}`}>
                        {t(badgeLabelKey(activeProject))}
                      </span>
                      {(activeProject.event_date || activeProject.release_date) && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-2">
                          <Calendar className="h-2.5 w-2.5" strokeWidth={1.5} />
                          {(activeProject.event_date || activeProject.release_date)!.slice(0, 10)}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-ink-2">
                        {activeProject.curation_status === 'published'
                          ? t('status.published')
                          : activeProject.curation_status === 'archived'
                            ? t('status.archived')
                            : t('status.candidate')}
                      </span>
                    </div>
                  </div>

                  {/* Picture strip with rotation controls: the event's own
                      pictures, loaded on selection. */}
                  {panelAssetsLoading ? (
                    <div className="flex h-24 items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-ink-2" />
                    </div>
                  ) : panelAssets.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {panelAssets.map((asset) => {
                        const imageUrl = getImageUrl(asset.image_url);
                        return (
                          <div
                            key={asset.id}
                            className="relative h-24 w-20 shrink-0 overflow-hidden border bg-black/30"
                            style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                          >
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={asset.catalog_id || activeProject.title}
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
                  ) : (
                    <p className="font-mono text-[10px] tracking-wider text-ink-2/70">
                      {t('p.noPictures')}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 border-t pt-4" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                    <a
                      href={`/admin/preview/${activeProject.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 border border-white/10 px-3 py-2 font-mono text-[11px] text-ink-2 transition-colors hover:border-white/25 hover:text-ink"
                    >
                      <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                      {t('p.viewLive')}
                    </a>
                    <a
                      href={`/admin/gallery?tab=all&projectId=${activeProject.id}`}
                      className="flex items-center gap-2 border border-white/10 px-3 py-2 font-mono text-[11px] text-ink-2 transition-colors hover:border-white/25 hover:text-ink"
                    >
                      <Images className="h-3 w-3" strokeWidth={1.5} />
                      {t('p.viewAssets')}
                    </a>
                    <a
                      href={`/admin/projects/${activeProject.id}/curate`}
                      className="flex items-center gap-2 border border-white/10 px-3 py-2 font-mono text-[11px] text-ink-2 transition-colors hover:border-white/25 hover:text-ink"
                    >
                      <ImagePlus className="h-3 w-3" strokeWidth={1.5} />
                      {t('p.curateAssets')}
                    </a>
                    <button
                      onClick={() => handleEdit(activeProject)}
                      className="flex items-center gap-2 border border-lmsy-yellow/30 bg-lmsy-yellow/[0.06] px-3 py-2 font-mono text-[11px] text-lmsy-yellow/90 transition-colors hover:bg-lmsy-yellow/[0.12]"
                    >
                      <Edit2 className="h-3 w-3" strokeWidth={1.5} />
                      {t('p.editProject')}
                    </button>
                    <button
                      onClick={() => handleMerge(activeProject)}
                      className="flex items-center gap-2 border border-white/10 px-3 py-2 font-mono text-[11px] text-ink-2 transition-colors hover:border-white/25 hover:text-ink"
                    >
                      <ArrowRightLeft className="h-3 w-3" strokeWidth={1.5} />
                      {t('p.merge')}
                    </button>
                    <button
                      onClick={() => handleSplit(activeProject)}
                      className="flex items-center gap-2 border border-white/10 px-3 py-2 font-mono text-[11px] text-ink-2 transition-colors hover:border-white/25 hover:text-ink"
                    >
                      <SplitSquareVertical className="h-3 w-3" strokeWidth={1.5} />
                      {t('p.split')}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(activeProject)}
                      disabled={deletingProjectId === activeProject.id}
                      className="col-span-2 flex items-center justify-center gap-2 border border-red-500/25 px-3 py-2 font-mono text-[11px] text-red-400/80 transition-colors hover:border-red-500/50 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {deletingProjectId === activeProject.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                      ) : (
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      )}
                      {t('p.deleteProject')}
                    </button>
                  </div>
                </div>
              )}
            </aside>
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
