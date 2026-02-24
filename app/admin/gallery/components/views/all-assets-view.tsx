/**
 * All Assets View Component
 *
 * Combined view of gallery images and editorial projects
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Check, Calendar, Link2 } from 'lucide-react';
import Image from 'next/image';
import { getCdnUrl } from '../../utils';
import type { GalleryItem } from '@/lib/supabase';
import type { Project } from '@/lib/supabase';
import { useState } from 'react';

interface AllAssetsViewProps {
  data: {
    gallery: GalleryItem[];
    projects: Project[];
  };
  loading: boolean;
}

export function AllAssetsView({ data, loading }: AllAssetsViewProps) {
  const { gallery, projects } = data;
  const editorialProjects = projects.filter(p => p.category === 'editorial' || p.category === 'series');

  // Combined items for display
  const displayGallery = gallery; // Can be filtered by props
  const displayProjects = editorialProjects; // Can be filtered by props

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedAll, setSelectedAll] = useState(false);

  // For batch operations
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [transferring, setTransferring] = useState(false);

  // Fetch projects for transfer modal
  useState(() => {
    const fetchProjectsForTransfer = async () => {
      try {
        const response = await fetch('/api/admin/projects', { cache: 'no-store' });
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
  });

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
    setSelectedAll(false);
  };

  const toggleSelectAll = () => {
    if (selectedAll) {
      setSelectedIds(new Set());
      setSelectedAll(false);
    } else {
      setSelectedIds(new Set(displayGallery.map(img => img.id)));
      setSelectedAll(true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/gallery?ids=${id}`, {
        method: 'DELETE',
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
      const response = await fetch(`/api/admin/gallery?ids=${ids}`, {
        method: 'DELETE',
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
      const response = await fetch('/api/admin/gallery/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
                  VAULT_EMPTY
                </p>
                <p className="text-[10px] font-mono text-white/10 tracking-wider">
                  WAITING_FOR_SYNC
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
                        alt={item.caption || item.tag || 'Gallery image'}
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
                      {item.caption && (
                        <p className="text-white/90 text-xs font-light line-clamp-2 leading-relaxed">
                          {item.caption}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => {/* TODO */}}
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
    </>
  );
}
