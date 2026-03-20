/**
 * All Assets View Component
 *
 * Combined view of gallery images and editorial projects
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Check, Link2, X, Save, Loader2, Languages } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCdnUrl } from '../../utils';
import type { GalleryItem } from '@/lib/supabase';
import type { Project } from '@/lib/supabase';
import { getLocalizedText, normalizeLocalizedText } from '@/lib/localized-content';
import { translateFieldMap, type AdminTranslateTarget } from '@/lib/admin-translate';

interface AllAssetsViewProps {
  data: {
    gallery: GalleryItem[];
    projects: Project[];
  };
  loading: boolean;
  projectFiltered?: boolean;
}

export function AllAssetsView({ data, loading, projectFiltered = false }: AllAssetsViewProps) {
  const { gallery } = data;

  // Combined items for display
  const displayGallery = gallery; // Can be filtered by props

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // For batch operations
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [transferring, setTransferring] = useState(false);
  const [editingAsset, setEditingAsset] = useState<GalleryItem | null>(null);
  const [savingAsset, setSavingAsset] = useState(false);
  const [translatingAssetLang, setTranslatingAssetLang] = useState<AdminTranslateTarget | null>(null);
  const [assetForm, setAssetForm] = useState({
    title_en: '',
    title_zh: '',
    title_th: '',
    caption_en: '',
    caption_zh: '',
    caption_th: '',
    excerpt_en: '',
    excerpt_zh: '',
    excerpt_th: '',
  });
  const editingAssetImageUrl = editingAsset ? getCdnUrl(editingAsset.image_url) : null;

  // Fetch projects for transfer modal
  useEffect(() => {
    const fetchProjectsForTransfer = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const response = await fetch('/api/admin/projects', { cache: 'no-store', headers });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.projects) {
            setProjectsList(result.projects);
          }
        }
      } catch (err) {
        console.error('[TRANSFER] Failed to fetch projects:', err);
      }
    };
    fetchProjectsForTransfer();
  }, []);

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/gallery?ids=${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      window.location.reload();
    } catch (err) {
      console.error('[ADMIN_DELETE] Error:', err);
      alert('Failed to delete image');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Delete ${selectedIds.size} images?`)) return;

    try {
      const ids = Array.from(selectedIds).join(',');
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/gallery?ids=${ids}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Batch delete failed');
      }

      window.location.reload();
    } catch (err) {
      console.error('[ADMIN_BATCH_DELETE] Error:', err);
      alert('Failed to delete images');
    }
  };

  const handleBatchTransfer = async () => {
    if (selectedIds.size === 0 || !selectedProject) return;

    setTransferring(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/gallery/transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          projectId: selectedProject,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transfer failed');
      }

      window.location.reload();
    } catch (err) {
      console.error('[BATCH_TRANSFER] Error:', err);
      alert('Failed to transfer items');
    } finally {
      setTransferring(false);
    }
  };

  const getAuthHeaders = async (includeJson = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const handleOpenEdit = (asset: GalleryItem) => {
    const titleI18n = normalizeLocalizedText(asset.title_i18n, asset.title || '');
    const captionI18n = normalizeLocalizedText(asset.caption_i18n, asset.caption || '');
    const excerptI18n = normalizeLocalizedText(asset.excerpt_i18n, asset.excerpt || '');

    setEditingAsset(asset);
    setAssetForm({
      title_en: titleI18n.en || '',
      title_zh: titleI18n.zh || '',
      title_th: titleI18n.th || '',
      caption_en: captionI18n.en || '',
      caption_zh: captionI18n.zh || '',
      caption_th: captionI18n.th || '',
      excerpt_en: excerptI18n.en || '',
      excerpt_zh: excerptI18n.zh || '',
      excerpt_th: excerptI18n.th || '',
    });
  };

  const handleSaveAsset = async () => {
    if (!editingAsset) return;

    setSavingAsset(true);
    try {
      const headers = await getAuthHeaders(true);
      const response = await fetch('/api/admin/gallery', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          id: editingAsset.id,
          title: assetForm.title_en,
          title_i18n: {
            en: assetForm.title_en,
            zh: assetForm.title_zh,
            th: assetForm.title_th,
          },
          caption: assetForm.caption_en,
          caption_i18n: {
            en: assetForm.caption_en,
            zh: assetForm.caption_zh,
            th: assetForm.caption_th,
          },
          excerpt: assetForm.excerpt_en,
          excerpt_i18n: {
            en: assetForm.excerpt_en,
            zh: assetForm.excerpt_zh,
            th: assetForm.excerpt_th,
          },
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update asset');
      }

      window.location.reload();
    } catch (err) {
      console.error('[ASSET_EDIT] Error:', err);
      alert('Failed to save asset translations');
    } finally {
      setSavingAsset(false);
    }
  };

  const handleTranslateAsset = async (targetLang: AdminTranslateTarget) => {
    if (!assetForm.title_en.trim() && !assetForm.caption_en.trim() && !assetForm.excerpt_en.trim()) {
      alert('Please enter English content first.');
      return;
    }

    setTranslatingAssetLang(targetLang);
    try {
      const translated = await translateFieldMap(
        {
          title: assetForm.title_en,
          caption: assetForm.caption_en,
          excerpt: assetForm.excerpt_en,
        },
        targetLang,
        {
          title: 'title',
          caption: 'description',
          excerpt: 'description',
        }
      );

      setAssetForm(prev => ({
        ...prev,
        ...(targetLang === 'zh'
          ? {
              title_zh: translated.title,
              caption_zh: translated.caption,
              excerpt_zh: translated.excerpt,
            }
          : {
              title_th: translated.title,
              caption_th: translated.caption,
              excerpt_th: translated.excerpt,
            }),
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setTranslatingAssetLang(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 bg-lmsy-yellow/60 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 bg-lmsy-yellow/60 animate-pulse" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 bg-lmsy-yellow/60 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Grid View - Gallery Images */}
      <AnimatePresence mode="wait">
        {!loading && displayGallery.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative"
          >
            <div
              className="grid grid-cols-4 gap-0 border border-dashed p-8"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] border-r border-b"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-xs font-mono text-white/20 tracking-widest">
                  {projectFiltered ? 'NO_ASSETS_FOR_THIS_PROJECT' : 'VAULT_EMPTY'}
                </p>
                <p className="text-[10px] font-mono text-white/10 tracking-wider">
                  {projectFiltered ? 'CLEAR_FILTER_TO_VIEW_ALL_ASSETS' : 'WAITING_FOR_SYNC'}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-white/5"
          >
            {displayGallery.map((item, index) => {
              const imageUrl = getCdnUrl(item.image_url);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="relative bg-black group overflow-hidden rounded-lg"
                  style={{
                    border: selectedIds.has(item.id)
                      ? '2px solid rgba(251, 191, 36, 0.8)'
                      : '2px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: selectedIds.has(item.id)
                      ? '0 0 20px rgba(251, 191, 36, 0.3), inset 0 0 20px rgba(251, 191, 36, 0.1)'
                      : 'none',
                    minHeight: '200px',
                  }}
                >
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className="absolute top-2 left-2 z-20 p-1.5 bg-black/80 backdrop-blur-sm border border-white/10 hover:border-lmsy-yellow/40 transition-all rounded"
                  >
                    {selectedIds.has(item.id) ? (
                      <Check className="h-3 w-3 text-lmsy-yellow" strokeWidth={2.5} />
                    ) : (
                      <div className="h-3 w-3 border border-white/20" />
                    )}
                  </button>

                  {imageUrl ? (
                    <div className="relative w-full">
                      <Image
                        src={imageUrl}
                        alt={getLocalizedText(item.caption_i18n, 'en', item.caption) || item.tag || 'Gallery image'}
                        width={0}
                        height={0}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center bg-white/5">
                      <span className="text-white/20 text-xs">No URL</span>
                    </div>
                  )}

                  {/* Project Badge */}
                  {item.project_id && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400/90 text-[10px] font-mono tracking-wider">
                        LINKED
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.tag && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-1 bg-lmsy-yellow/20 border border-lmsy-yellow/30 text-lmsy-yellow/90 text-[10px] font-mono tracking-wider">
                          #{item.tag}
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                      {getLocalizedText(item.caption_i18n, 'en', item.caption) && (
                        <p className="text-white/90 text-xs font-light line-clamp-2 leading-relaxed">
                          {getLocalizedText(item.caption_i18n, 'en', item.caption)}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white/10 border border-white/20 text-white/60 text-[10px] font-mono hover:bg-white/15 hover:text-white/80 transition-all"
                        >
                          <Edit2 className="h-3 w-3" strokeWidth={2} />
                          <span>EDIT</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400/80 text-[10px] font-mono hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={2} />
                          <span>DELETE</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {item.catalog_id && (
                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] font-mono text-white/30 tracking-wider">
                        {item.catalog_id}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-6 py-3 bg-black/90 border backdrop-blur-sm rounded-lg"
          style={{ borderColor: 'rgba(251, 191, 36, 0.3)' }}
        >
          <span className="text-xs font-mono text-lmsy-yellow/80">
            {selectedIds.size} selected
          </span>

          {/* Link button */}
          <motion.button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400/80 text-xs font-mono hover:bg-blue-500/20 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link2 className="h-3 w-3" strokeWidth={2} />
            <span>LINK</span>
          </motion.button>

          {/* Delete button */}
          <motion.button
            onClick={handleBatchDelete}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400/80 text-xs font-mono hover:bg-red-500/20 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 className="h-3 w-3" strokeWidth={2} />
            <span>DELETE</span>
          </motion.button>

          {/* Cancel button */}
          <button
            onClick={() => {
              setSelectedIds(new Set());
              setSelectedAll(false);
            }}
            className="p-1.5 text-white/40 hover:text-white/60 transition-all"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setShowTransferModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-black border border-white/20 rounded-lg p-6 max-w-md w-full">
                <h2 className="font-serif text-xl text-white/90 mb-2">
                  LINK_TO_PROJECT
                </h2>
                <p className="text-xs font-mono text-white/40 mb-4">
                  SELECT_TARGET_PROJECT_FOR_{selectedIds.size}_ITEMS
                </p>

                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-white/20 text-white/80 text-sm font-mono focus:outline-none focus:border-lmsy-yellow/40 mb-4"
                >
                  <option value="">SELECT_PROJECT...</option>
                  {projectsList.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.title} ({project.category})
                    </option>
                  ))}
                </select>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTransferModal(false)}
                    disabled={transferring}
                    className="flex-1 px-4 py-2 border border-white/20 text-white/60 text-xs font-mono hover:bg-white/5 transition-all disabled:opacity-50"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleBatchTransfer}
                    disabled={!selectedProject || transferring}
                    className="flex-1 px-4 py-2 bg-lmsy-yellow/20 border border-lmsy-yellow/40 text-lmsy-yellow/80 text-xs font-mono hover:bg-lmsy-yellow/30 transition-all disabled:opacity-50"
                  >
                    {transferring ? 'LINKING...' : 'LINK_ITEMS'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingAsset && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
              onClick={() => setEditingAsset(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <div>
                    <h2 className="text-lg font-serif text-white/90">Edit Asset Copy</h2>
                    <p className="text-[10px] font-mono tracking-wider text-white/35">
                      TITLE / CAPTION / EXCERPT · EN / ZH / TH
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingAsset(null)}
                    className="rounded-full border border-white/10 p-2 text-white/45 transition hover:border-white/20 hover:text-white/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid max-h-[calc(88vh-74px)] grid-cols-1 overflow-y-auto lg:grid-cols-[320px_1fr]">
                  <div className="border-b border-white/10 bg-white/[0.02] p-6 lg:border-b-0 lg:border-r">
                    <div className="space-y-4">
                      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        {editingAssetImageUrl ? (
                          <Image
                            src={editingAssetImageUrl}
                            alt={getLocalizedText(editingAsset.caption_i18n, 'en', editingAsset.caption) || 'Asset'}
                            width={640}
                            height={860}
                            className="h-auto w-full"
                            unoptimized
                          />
                        ) : (
                          <div className="flex min-h-[18rem] items-center justify-center text-xs font-mono tracking-wider text-white/25">
                            NO_IMAGE_URL
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 text-[11px] font-mono tracking-wider text-white/35">
                        <div>CATALOG {editingAsset.catalog_id || 'UNSET'}</div>
                        <div>TAG {editingAsset.tag || 'UNSET'}</div>
                        <div>PROJECT {editingAsset.project_id || 'UNLINKED'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 p-6">
                    <div className="flex gap-2">
                      {(['zh', 'th'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleTranslateAsset(lang)}
                          disabled={translatingAssetLang !== null}
                          className="inline-flex items-center gap-2 rounded border border-lmsy-blue/30 bg-lmsy-blue/10 px-3 py-1.5 text-[10px] font-mono tracking-wider text-lmsy-blue transition-all hover:bg-lmsy-blue/20 disabled:opacity-50"
                        >
                          {translatingAssetLang === lang ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Languages className="h-3.5 w-3.5" />
                          )}
                          AUTO_{lang.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    {(['title', 'caption', 'excerpt'] as const).map((field) => (
                      <div key={field} className="space-y-3">
                        <div className="text-xs font-mono uppercase tracking-[0.24em] text-white/30">
                          {field}
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          {(['en', 'zh', 'th'] as const).map((lang) => {
                            const key = `${field}_${lang}` as keyof typeof assetForm;
                            return (
                              <div key={key} className="space-y-2">
                                <label className="text-[10px] font-mono uppercase tracking-[0.24em] text-white/25">
                                  {lang}
                                </label>
                                {field === 'excerpt' ? (
                                  <textarea
                                    value={assetForm[key]}
                                    onChange={(e) => setAssetForm(prev => ({ ...prev, [key]: e.target.value }))}
                                    rows={4}
                                    className="custom-scrollbar min-h-[104px] w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/88 outline-none transition focus:border-lmsy-yellow/35"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={assetForm[key]}
                                    onChange={(e) => setAssetForm(prev => ({ ...prev, [key]: e.target.value }))}
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/88 outline-none transition focus:border-lmsy-yellow/35"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                      <button
                        onClick={() => setEditingAsset(null)}
                        disabled={savingAsset}
                        className="rounded-xl border border-white/10 px-4 py-2 text-xs font-mono tracking-wider text-white/55 transition hover:border-white/20 hover:text-white/75"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={handleSaveAsset}
                        disabled={savingAsset}
                        className="inline-flex items-center gap-2 rounded-xl border border-lmsy-yellow/30 bg-lmsy-yellow/12 px-4 py-2 text-xs font-mono tracking-wider text-lmsy-yellow/85 transition hover:bg-lmsy-yellow/18 disabled:opacity-60"
                      >
                        {savingAsset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        SAVE_ASSET_COPY
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
