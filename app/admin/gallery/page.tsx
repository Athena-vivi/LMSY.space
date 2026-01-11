'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Search, Check, X } from 'lucide-react';
import Image from 'next/image';
import { type GalleryItem } from '@/lib/supabase';

// Force dynamic rendering to prevent Vercel static caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [selectedAll, setSelectedAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    try {
      // Import admin client for full data visibility
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
      const supabaseAdmin = getSupabaseAdmin();

      const { data, error } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('[ADMIN_FETCH] Gallery images:', {
        count: data?.length || 0,
        error,
        sample: data?.slice(0, 2)
      });

      if (!error && data) setImages(data);
      if (error) console.error('[ADMIN_FETCH] Error:', error);
    } catch (err) {
      console.error('[ADMIN_FETCH] Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleDelete = async (id: string) => {
    try {
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
      const supabaseAdmin = getSupabaseAdmin();

      const { error } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .delete()
        .eq('id', id);

      if (!error) {
        setImages(prev => prev.filter(img => img.id !== id));
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        showToast('IMAGE_DELETED_FROM_VAULT');
      } else {
        showToast('DELETE_OPERATION_FAILED', 'error');
      }
    } catch (err) {
      console.error('[ADMIN_DELETE] Error:', err);
      showToast('DELETE_OPERATION_FAILED', 'error');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
      const supabaseAdmin = getSupabaseAdmin();

      const { error } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .delete()
        .in('id', Array.from(selectedIds));

      if (!error) {
        setImages(prev => prev.filter(img => !selectedIds.has(img.id)));
        setSelectedIds(new Set());
        setSelectedAll(false);
        showToast(`${selectedIds.size}_IMAGES_PURGED`);
      } else {
        showToast('BATCH_DELETE_FAILED', 'error');
      }
    } catch (err) {
      console.error('[ADMIN_BATCH_DELETE] Error:', err);
      showToast('BATCH_DELETE_FAILED', 'error');
    }
  };

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

  const toggleSelectAll = () => {
    if (selectedAll) {
      setSelectedIds(new Set());
      setSelectedAll(false);
    } else {
      setSelectedIds(new Set(filteredImages.map(img => img.id)));
      setSelectedAll(true);
    }
  };

  const filteredImages = images.filter(img =>
    (img.caption?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    (img.tag?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  ).filter(img => !filterTag || img.tag === filterTag);

  const uniqueTags = [...new Set(images.map(img => img.tag).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="font-serif text-3xl font-light text-white/90 tracking-tight">
          GALLERY_VAULT
        </h1>
        <p className="text-xs font-mono text-white/30 tracking-wider">
          IMAGE_ARCHIVE_MANAGEMENT_SYSTEM
        </p>
      </motion.div>

      {/* Minimal Topbar - Single Line */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-4 py-2 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH_VAULT..."
            className="w-full pl-9 pr-4 py-1.5 bg-transparent text-white/60 text-sm font-mono focus:outline-none placeholder:text-white/20 tracking-wide"
          />
        </div>

        {/* Tag Filter */}
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="px-3 py-1.5 bg-transparent text-white/40 text-xs font-mono focus:outline-none border border-white/10 focus:border-lmsy-yellow/40 tracking-wider"
        >
          <option value="">ALL_TAGS</option>
          {uniqueTags.map(tag => (
            <option key={tag || ''} value={tag || ''}>{tag}</option>
          ))}
        </select>

        {/* Select All */}
        {filteredImages.length > 0 && (
          <motion.button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-3 py-1.5 border border-white/10 text-white/30 text-xs font-mono hover:text-white/60 hover:border-white/20 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {selectedAll ? (
              <>
                <Check className="h-3 w-3" strokeWidth={2} />
                <span>SELECTED_ALL</span>
              </>
            ) : (
              <>
                <div className="h-3 w-3 border border-white/30" />
                <span>SELECT_ALL</span>
              </>
            )}
          </motion.button>
        )}

        {/* Batch Delete */}
        {selectedIds.size > 0 && (
          <motion.button
            onClick={handleBatchDelete}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400/80 text-xs font-mono hover:bg-red-500/20 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 className="h-3 w-3" strokeWidth={2} />
            <span>PURGE_{selectedIds.size}</span>
          </motion.button>
        )}

        {/* Count */}
        <div className="text-xs font-mono text-white/20 tracking-wider">
          {filteredImages.length}_ITEMS
        </div>
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
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-lmsy-yellow/60 animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 bg-lmsy-yellow/60 animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 bg-lmsy-yellow/60 animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        ) : filteredImages.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative"
          >
            {/* Dashed Grid Empty State */}
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
            {/* Center Message */}
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
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-white/5"
          >
            {filteredImages.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="relative aspect-[3/4 bg-black group overflow-hidden"
                style={{
                  border: selectedIds.has(item.id)
                    ? '1px solid rgba(251, 191, 36, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: selectedIds.has(item.id)
                    ? '0 0 20px rgba(251, 191, 36, 0.1), inset 0 0 20px rgba(251, 191, 36, 0.05)'
                    : 'none',
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(item.id)}
                  className="absolute top-2 left-2 z-20 p-1.5 bg-black/80 backdrop-blur-sm border border-white/10 hover:border-lmsy-yellow/40 transition-all"
                >
                  {selectedIds.has(item.id) ? (
                    <Check className="h-3 w-3 text-lmsy-yellow" strokeWidth={2.5} />
                  ) : (
                    <div className="h-3 w-3 border border-white/20" />
                  )}
                </button>

                {/* Image */}
                {item.image_url && (
                  <Image
                    src={item.image_url}
                    alt={item.caption || item.tag || 'Gallery image'}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Tag Badge */}
                  {item.tag && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-lmsy-yellow/20 border border-lmsy-yellow/30 text-lmsy-yellow/90 text-[10px] font-mono tracking-wider">
                        #{item.tag}
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                    {item.caption && (
                      <p className="text-white/90 text-xs font-light line-clamp-2 leading-relaxed">
                        {item.caption}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {/* TODO: Edit modal */}}
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

                {/* Catalog ID Badge */}
                {item.catalog_id && (
                  <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-mono text-white/30 tracking-wider">
                      {item.catalog_id}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
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

      {/* Global Keyframe Animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
