'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit2, Trash2, Search, Play, X, Languages, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import type { DraftItem } from '@/lib/supabase/types';

// =====================================================
// DRAFT INBOX - Curated Content Review Interface
// =====================================================

// Platform icons mapping
const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  instagram: '📸',
  weibo: '🌐',
  xiaohongshu: '📕',
  youtube: '▶️',
  tiktok: '🎵',
  manual: '📝',
};

// Platform colors
const platformColors: Record<string, string> = {
  twitter: 'text-white/60',
  instagram: 'text-pink-400/80',
  weibo: 'text-red-400/80',
  xiaohongshu: 'text-red-500/80',
  youtube: 'text-red-500/80',
  tiktok: 'text-white/80',
  manual: 'text-white/40',
};

// Status badges
const statusBadges: Record<string, { label: string; className: string }> = {
  draft: { label: 'DRAFT', className: 'bg-white/10 border-white/20 text-white/60' },
  pending_review: { label: 'REVIEW', className: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400/90' },
  ready: { label: 'READY', className: 'bg-green-500/20 border-green-500/30 text-green-400/90' },
  published: { label: 'PUBLISHED', className: 'bg-blue-500/20 border-blue-500/30 text-blue-400/90' },
  rejected: { label: 'REJECTED', className: 'bg-red-500/20 border-red-500/30 text-red-400/90' },
};

// Ingestion stage badges
const stageBadges: Record<string, { label: string; className: string }> = {
  pending: { label: 'PENDING', className: 'bg-white/5 border-white/10 text-white/30' },
  downloading: { label: 'DOWNLOADING', className: 'bg-blue-500/10 border-blue-500/20 text-blue-400/70' },
  uploading: { label: 'UPLOADING', className: 'bg-blue-500/10 border-blue-500/20 text-blue-400/70' },
  translating: { label: 'TRANSLATING', className: 'bg-purple-500/10 border-purple-500/20 text-purple-400/70' },
  ready: { label: 'READY', className: 'bg-green-500/20 border-green-500/30 text-green-400/90' },
  failed: { label: 'FAILED', className: 'bg-red-500/20 border-red-500/30 text-red-400/90' },
};

type FilterStatus = 'all' | 'draft' | 'ready' | 'failed';
type MediaType = 'all' | 'image' | 'video';

export default function DraftsPage() {
  // State
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [filteredDrafts, setFilteredDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterMediaType, setFilterMediaType] = useState<MediaType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

  // Edit modal state
  const [editingItem, setEditingItem] = useState<DraftItem | null>(null);
  const [editForm, setEditForm] = useState<{
    title: { en: string; zh: string; th: string };
    description: { en: string; zh: string; th: string };
    tags: string[];
    is_featured: boolean;
    event_date: string; // 事件发生时间（图片拍摄时间）
  }>({
    title: { en: '', zh: '', th: '' },
    description: { en: '', zh: '', th: '' },
    tags: [] as string[],
    is_featured: false,
    event_date: '',
  });

  // Batch edit state
  const [batchEditing, setBatchEditing] = useState(false);
  const [batchEditForm, setBatchEditForm] = useState<{
    title: { en: string; zh: string; th: string };
    description: { en: string; zh: string; th: string };
    tags: string[];
    is_featured: boolean;
    event_date: string; // 事件发生时间（图片拍摄时间）
  }>({
    title: { en: '', zh: '', th: '' },
    description: { en: '', zh: '', th: '' },
    tags: [],
    is_featured: false,
    event_date: '',
  });
  const [batchOrder, setBatchOrder] = useState<string[]>([]);
  const [translating, setTranslating] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'single' | 'batch';
    id?: string;
    r2Key?: string | null;
    count?: number;
  }>({ show: false, type: 'single' });

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Fetch drafts
  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterMediaType !== 'all') params.append('media_type', filterMediaType);

      const response = await fetch(`/api/admin/drafts?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch drafts');
      }

      const result = await response.json();
      if (result.success) {
        setDrafts(result.data || []);
      }
    } catch (error) {
      console.error('[DRAFT_INBOX] Fetch error:', error);
      showToast('FETCH_FAILED', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterMediaType]);

  // Initial fetch & refresh
  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // Filter drafts
  useEffect(() => {
    let filtered = [...drafts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(draft => {
        const titleEn = draft.title.en?.toLowerCase() || '';
        const titleZh = draft.title.zh?.toLowerCase() || '';
        const titleTh = draft.title.th?.toLowerCase() || '';
        const descEn = draft.description.en?.toLowerCase() || '';
        const tags = (draft.tags || []).join(' ').toLowerCase();
        const sourceUrl = draft.source_url?.toLowerCase() || '';

        return (
          titleEn.includes(query) ||
          titleZh.includes(query) ||
          titleTh.includes(query) ||
          descEn.includes(query) ||
          tags.includes(query) ||
          sourceUrl.includes(query)
        );
      });
    }

    setFilteredDrafts(filtered);
  }, [drafts, searchQuery]);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // Optimistic: Publish single item
  const handlePublish = async (id: string) => {
    // Optimistic update
    setDrafts(prev => prev.map(d =>
      d.id === id ? { ...d, status: 'published' as const, published_at: new Date().toISOString() } : d
    ));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });

    try {
      const response = await fetch(`/api/admin/drafts/${id}/publish`, { method: 'POST' });
      if (!response.ok) throw new Error('Publish failed');

      showToast('ITEM_PUBLISHED');
    } catch (error) {
      // Revert on error
      await fetchDrafts();
      showToast('PUBLISH_FAILED', 'error');
    }
  };

  // Optimistic: Unpublish single item
  const handleUnpublish = async (id: string) => {
    // Optimistic update
    setDrafts(prev => prev.map(d =>
      d.id === id ? { ...d, status: 'draft' as const, published_at: null } : d
    ));

    try {
      const response = await fetch(`/api/admin/drafts/${id}/unpublish`, { method: 'POST' });
      if (!response.ok) throw new Error('Unpublish failed');

      showToast('ITEM_UNPUBLISHED');
    } catch (error) {
      // Revert on error
      await fetchDrafts();
      showToast('UNPUBLISH_FAILED', 'error');
    }
  };

  // Optimistic: Batch publish
  const handleBatchPublish = async () => {
    const ids = Array.from(selectedIds);

    // Optimistic update
    setDrafts(prev => prev.map(d =>
      selectedIds.has(d.id) ? { ...d, status: 'published' as const, published_at: new Date().toISOString() } : d
    ));
    setSelectedIds(new Set());

    try {
      const response = await fetch('/api/admin/drafts/batch-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) throw new Error('Batch publish failed');

      const result = await response.json();
      showToast(`${result.published || 0}_ITEMS_PUBLISHED`);
    } catch (error) {
      await fetchDrafts();
      showToast('BATCH_PUBLISH_FAILED', 'error');
    }
  };

  // Optimistic: Delete single item (with R2 cleanup)
  const handleDelete = (id: string, r2Key: string | null) => {
    setDeleteConfirm({ show: true, type: 'single', id, r2Key });
  };

  // Execute single delete
  const executeDelete = async () => {
    if (deleteConfirm.type !== 'single' || !deleteConfirm.id) return;

    const id = deleteConfirm.id;

    // Optimistic update
    setDrafts(prev => prev.filter(d => d.id !== id));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });

    try {
      const response = await fetch(`/api/admin/drafts/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');

      showToast('ITEM_DELETED');
    } catch (error) {
      await fetchDrafts();
      showToast('DELETE_FAILED', 'error');
    } finally {
      setDeleteConfirm({ show: false, type: 'single' });
    }
  };

  // Optimistic: Batch delete
  const handleBatchDelete = () => {
    setDeleteConfirm({ show: true, type: 'batch', count: selectedIds.size });
  };

  // Execute batch delete
  const executeBatchDelete = async () => {
    if (deleteConfirm.type !== 'batch') return;

    const ids = Array.from(selectedIds);

    // Optimistic update
    setDrafts(prev => prev.filter(d => !selectedIds.has(d.id)));
    setSelectedIds(new Set());

    try {
      const response = await fetch('/api/admin/drafts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) throw new Error('Batch delete failed');

      showToast(`${ids.length}_ITEMS_DELETED`);
    } catch (error) {
      await fetchDrafts();
      showToast('BATCH_DELETE_FAILED', 'error');
    } finally {
      setDeleteConfirm({ show: false, type: 'batch' });
    }
  };

  // Open edit modal
  const handleOpenEdit = (draft: DraftItem) => {
    setEditingItem(draft);
    setEditForm({
      title: {
        en: draft.title.en || '',
        zh: draft.title.zh || '',
        th: draft.title.th || '',
      },
      description: {
        en: draft.description.en || '',
        zh: draft.description.zh || '',
        th: draft.description.th || '',
      },
      tags: draft.tags || [],
      is_featured: draft.is_featured || false,
      event_date: draft.event_date || '',
    });
  };

  // Close edit modal
  const handleCloseEdit = () => {
    setEditingItem(null);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      const response = await fetch(`/api/admin/drafts/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error('Update failed');

      // Optimistic update
      setDrafts(prev => prev.map(d =>
        d.id === editingItem.id
          ? { ...d, ...editForm, updated_at: new Date().toISOString() } as DraftItem
          : d
      ));

      handleCloseEdit();
      showToast('ITEM_UPDATED');
    } catch (error) {
      showToast('UPDATE_FAILED', 'error');
    }
  };

  // Translation function
  const handleTranslate = async (targetLang: 'zh' | 'th') => {
    if (!editForm.title.en && !editForm.description.en) {
      showToast('NO_ENG_CONTENT', 'error');
      return;
    }

    setTranslating(true);
    try {
      const response = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title.en,
          description: editForm.description.en,
          targetLang,
        }),
      });

      if (!response.ok) throw new Error('Translation failed');

      const result = await response.json();
      if (result.success) {
        setEditForm(prev => ({
          ...prev,
          title: { ...prev.title, [targetLang]: result.data.title || '' },
          description: { ...prev.description, [targetLang]: result.data.description || '' },
        }));
        showToast('TRANSLATION_SUCCESS');
      }
    } catch (error) {
      showToast('TRANSLATION_FAILED', 'error');
    } finally {
      setTranslating(false);
    }
  };

  // Batch translation for batch edit
  const handleBatchTranslate = async (targetLang: 'zh' | 'th') => {
    if (!batchEditForm.title.en && !batchEditForm.description.en) {
      showToast('NO_ENG_CONTENT', 'error');
      return;
    }

    setTranslating(true);
    try {
      const response = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: batchEditForm.title.en,
          description: batchEditForm.description.en,
          targetLang,
        }),
      });

      if (!response.ok) throw new Error('Translation failed');

      const result = await response.json();
      if (result.success) {
        setBatchEditForm(prev => ({
          ...prev,
          title: { ...prev.title, [targetLang]: result.data.title || '' },
          description: { ...prev.description, [targetLang]: result.data.description || '' },
        }));
        showToast('TRANSLATION_SUCCESS');
      }
    } catch (error) {
      showToast('TRANSLATION_FAILED', 'error');
    } finally {
      setTranslating(false);
    }
  };

  // Open batch edit modal
  const handleOpenBatchEdit = () => {
    const selectedItems = drafts.filter(d => selectedIds.has(d.id));
    if (selectedItems.length === 0) return;

    // Initialize with first item's data
    const firstItem = selectedItems[0];
    setBatchEditForm({
      title: {
        en: firstItem.title.en || '',
        zh: firstItem.title.zh || '',
        th: firstItem.title.th || '',
      },
      description: {
        en: firstItem.description.en || '',
        zh: firstItem.description.zh || '',
        th: firstItem.description.th || '',
      },
      tags: firstItem.tags || [],
      is_featured: firstItem.is_featured || false,
      event_date: firstItem.event_date || '',
    });
    setBatchOrder(Array.from(selectedIds));
    setBatchEditing(true);
  };

  // Close batch edit modal
  const handleCloseBatchEdit = () => {
    setBatchEditing(false);
  };

  // Move item in batch order
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...batchOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setBatchOrder(newOrder);
  };

  // Save batch edit
  const handleSaveBatchEdit = async () => {
    const selectedItems = drafts.filter(d => selectedIds.has(d.id));

    try {
      // Update each item with its order
      const updatePromises = selectedItems.map(async (item, index) => {
        const response = await fetch(`/api/admin/drafts/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...batchEditForm,
            sequence_order: index,
          }),
        });
        return response.json();
      });

      await Promise.all(updatePromises);

      // Refresh drafts
      await fetchDrafts();
      setSelectedIds(new Set());
      handleCloseBatchEdit();
      showToast('BATCH_UPDATE_SUCCESS');
    } catch (error) {
      showToast('BATCH_UPDATE_FAILED', 'error');
    }
  };

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

  // Toggle select all (visible items)
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDrafts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDrafts.map(d => d.id)));
    }
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get title for display (fallback to first non-empty language)
  const getDisplayTitle = (draft: DraftItem) => {
    return draft.title.en || draft.title.zh || draft.title.th || 'Untitled';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="font-serif text-3xl font-light text-white/90 tracking-tight">
          DRAFT_INBOX
        </h1>
        <p className="text-xs font-mono text-white/30 tracking-wider">
          CONTENT_INGESTION_CURATION_INTERFACE
        </p>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3 py-2 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH_DRAFTS..."
            className="w-full pl-9 pr-4 py-1.5 bg-transparent text-white/60 text-sm font-mono focus:outline-none placeholder:text-white/20 tracking-wide"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="px-3 py-1.5 bg-transparent text-white/40 text-xs font-mono focus:outline-none border border-white/10 focus:border-lmsy-yellow/40 tracking-wider"
        >
          <option value="all">ALL_STATUS</option>
          <option value="draft">DRAFT</option>
          <option value="ready">READY</option>
          <option value="failed">FAILED</option>
        </select>

        {/* Media Type Filter */}
        <select
          value={filterMediaType}
          onChange={(e) => setFilterMediaType(e.target.value as MediaType)}
          className="px-3 py-1.5 bg-transparent text-white/40 text-xs font-mono focus:outline-none border border-white/10 focus:border-lmsy-yellow/40 tracking-wider"
        >
          <option value="all">ALL_MEDIA</option>
          <option value="image">IMAGES</option>
          <option value="video">VIDEOS</option>
        </select>

        {/* Select All */}
        {filteredDrafts.length > 0 && (
          <motion.button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-3 py-1.5 border border-white/10 text-white/30 text-xs font-mono hover:text-white/60 hover:border-white/20 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {selectedIds.size === filteredDrafts.length ? (
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

        {/* Refresh Button */}
        <motion.button
          onClick={fetchDrafts}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-white/40 text-xs font-mono hover:text-lmsy-yellow hover:border-lmsy-yellow/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          title="刷新草稿箱"
        >
          <motion.span
            animate={{ rotate: loading ? 360 : 0 }}
            transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
          >
            ↻
          </motion.span>
          <span>REFRESH</span>
        </motion.button>

        {/* Count */}
        <div className="text-xs font-mono text-white/20 tracking-wider">
          {filteredDrafts.length}_ITEMS
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
        ) : !loading && filteredDrafts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative py-32 text-center"
          >
            <p className="text-xs font-mono text-white/20 tracking-widest">
              INBOX_EMPTY
            </p>
            <p className="text-[10px] font-mono text-white/10 tracking-wider mt-2">
              {drafts.length === 0 ? 'WAITING_FOR_INGESTION' : 'NO_MATCHING_RESULTS'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredDrafts.map((draft, index) => {
              const isSelected = selectedIds.has(draft.id);
              const isVideo = draft.media_type === 'video';

              return (
                <motion.div
                  key={draft.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="relative bg-black group overflow-hidden rounded-lg"
                  style={{
                    border: isSelected
                      ? '2px solid rgba(251, 191, 36, 0.8)'
                      : '2px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: isSelected
                      ? '0 0 20px rgba(251, 191, 36, 0.3), inset 0 0 20px rgba(251, 191, 36, 0.1)'
                      : 'none',
                    minHeight: '280px',
                  }}
                  onHoverStart={() => isVideo && setHoveredVideoId(draft.id)}
                  onHoverEnd={() => setHoveredVideoId(null)}
                >
                  {/* Select Checkbox */}
                  <button
                    onClick={() => toggleSelect(draft.id)}
                    className="absolute top-2 left-2 z-20 p-1.5 bg-black/80 backdrop-blur-sm border border-white/10 hover:border-lmsy-yellow/40 transition-all rounded"
                  >
                    {isSelected ? (
                      <Check className="h-3 w-3 text-lmsy-yellow" strokeWidth={2.5} />
                    ) : (
                      <div className="h-3 w-3 border border-white/20" />
                    )}
                  </button>

                  {/* Status Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {statusBadges[draft.status] && (
                      <span className={`px-2 py-0.5 border text-[9px] font-mono tracking-wider ${statusBadges[draft.status].className}`}>
                        {statusBadges[draft.status].label}
                      </span>
                    )}
                    {stageBadges[draft.ingestion_stage] && draft.ingestion_stage !== 'ready' && (
                      <span className={`px-2 py-0.5 border text-[9px] font-mono tracking-wider ${stageBadges[draft.ingestion_stage].className}`}>
                        {stageBadges[draft.ingestion_stage].label}
                      </span>
                    )}
                  </div>

                  {/* Media Preview */}
                  <div className="relative w-full aspect-square bg-white/5">
                    {draft.r2_media_url ? (
                      isVideo ? (
                        // Video: Thumbnail with Play icon, auto-play on hover
                        <div className="relative w-full h-full">
                          {hoveredVideoId === draft.id ? (
                            <video
                              src={draft.r2_media_url}
                              muted
                              loop
                              playsInline
                              autoPlay
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <Image
                              src={draft.r2_media_url}
                              alt={getDisplayTitle(draft)}
                              width={0}
                              height={0}
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              unoptimized
                            />
                          )}
                          {/* Play Icon Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-colors">
                            <div className="p-3 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
                              <Play className="h-4 w-4 text-white/90" fill="currentColor" strokeWidth={1} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Image
                        <Image
                          src={draft.r2_media_url}
                          alt={getDisplayTitle(draft)}
                          width={0}
                          height={0}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          unoptimized
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <span className="text-white/20 text-xs">NO_MEDIA</span>
                      </div>
                    )}
                  </div>

                  {/* Card Info Overlay (gradient) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Source Platform */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2">
                      <span className={`px-2 py-0.5 bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] ${platformColors[draft.source_platform || ''] || 'text-white/60'}`}>
                        {platformIcons[draft.source_platform || ''] || '📌'} {(draft.source_platform || '').toUpperCase()}
                      </span>
                    </div>

                    {/* Content Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                      {/* Title (Multilingual, collapsible) */}
                      <div className="space-y-1">
                        <p className="text-white/90 text-xs font-medium line-clamp-2 leading-relaxed">
                          {getDisplayTitle(draft)}
                        </p>
                        {/* Show translations on hover */}
                        <div className="space-y-0.5">
                          {draft.title.zh && (
                            <p className="text-white/50 text-[10px] line-clamp-1">
                              {draft.title.zh}
                            </p>
                          )}
                          {draft.title.th && (
                            <p className="text-white/40 text-[10px] line-clamp-1">
                              {draft.title.th}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-2 text-[9px] font-mono text-white/30">
                        <span>{formatRelativeTime(draft.created_at)}</span>
                        {draft.is_featured && (
                          <span className="text-lmsy-yellow/60">⭐ FEATURED</span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2 border-t border-white/10">
                        {draft.status === 'published' ? (
                          // Unpublished state - show UNPUBLISH button
                          <button
                            onClick={() => handleUnpublish(draft.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-lmsy-blue/10 border border-lmsy-blue/30 text-lmsy-blue/80 text-[10px] font-mono hover:bg-lmsy-blue/20 transition-all"
                          >
                            <RotateCcw className="h-3 w-3" strokeWidth={2} />
                            <span>UNPUBLISH</span>
                          </button>
                        ) : (
                          // Draft state - show PUBLISH button
                          <button
                            onClick={() => handlePublish(draft.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400/80 text-[10px] font-mono hover:bg-green-500/20 transition-all"
                          >
                            <Check className="h-3 w-3" strokeWidth={2} />
                            <span>PUBLISH</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(draft)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white/10 border border-white/20 text-white/60 text-[10px] font-mono hover:bg-white/15 hover:text-white/80 transition-all"
                        >
                          <Edit2 className="h-3 w-3" strokeWidth={2} />
                          <span>EDIT</span>
                        </button>
                        <button
                          onClick={() => handleDelete(draft.id, draft.r2_key)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400/80 text-[10px] font-mono hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={2} />
                          <span>DELETE</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Batch Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div
              className="flex items-center gap-4 px-6 py-3 bg-black/95 backdrop-blur-xl border border-lmsy-yellow/30 rounded-full shadow-2xl"
              style={{
                boxShadow: '0 0 40px rgba(251, 191, 36, 0.2), inset 0 0 20px rgba(251, 191, 36, 0.05)',
              }}
            >
              <span className="text-white/60 text-sm font-mono">
                {selectedIds.size} SELECTED
              </span>
              <div className="w-px h-4 bg-white/10" />
              <motion.button
                onClick={handleBatchPublish}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-400/90 text-xs font-mono hover:bg-green-500/30 transition-all rounded-full"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
                <span>PUBLISH_ALL</span>
              </motion.button>
              <motion.button
                onClick={handleBatchDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400/90 text-xs font-mono hover:bg-red-500/30 transition-all rounded-full"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                <span>DELETE_ALL</span>
              </motion.button>
              <motion.button
                onClick={handleOpenBatchEdit}
                className="flex items-center gap-2 px-4 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue/90 text-xs font-mono hover:bg-lmsy-blue/30 transition-all rounded-full"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Edit2 className="h-3.5 w-3.5" strokeWidth={2} />
                <span>EDIT_ALL</span>
              </motion.button>
              <motion.button
                onClick={() => setSelectedIds(new Set())}
                className="p-2 text-white/30 hover:text-white/60 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={handleCloseEdit}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto custom-scrollbar bg-black border border-white/10 rounded-lg p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-serif text-white/90">EDIT_DRAFT</h2>
                <button
                  onClick={handleCloseEdit}
                  className="p-2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Media Preview */}
              {editingItem.r2_media_url && (
                <div className="mb-6 rounded-lg overflow-hidden border border-white/10">
                  {editingItem.media_type === 'video' ? (
                    <video
                      src={editingItem.r2_media_url}
                      controls
                      className="w-full max-h-48 object-cover"
                    />
                  ) : (
                    <Image
                      src={editingItem.r2_media_url}
                      alt={editForm.title.en || 'Preview'}
                      width={400}
                      height={300}
                      className="w-full object-cover"
                      unoptimized
                    />
                  )}
                </div>
              )}

              {/* Form */}
              <div className="space-y-4">
                {/* Title EN */}
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">TITLE_EN</label>
                  <input
                    type="text"
                    value={editForm.title.en}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: { ...prev.title, en: e.target.value } }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                  />
                </div>

                {/* Title ZH */}
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">TITLE_ZH</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editForm.title.zh}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: { ...prev.title, zh: e.target.value } }))}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                    />
                    <button
                      onClick={() => handleTranslate('zh')}
                      disabled={translating}
                      className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50"
                      title="翻译为中文"
                    >
                      <Languages className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Title TH */}
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">TITLE_TH</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editForm.title.th}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: { ...prev.title, th: e.target.value } }))}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                    />
                    <button
                      onClick={() => handleTranslate('th')}
                      disabled={translating}
                      className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50"
                      title="翻译为泰文"
                    >
                      <Languages className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Description EN */}
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_EN</label>
                  <textarea
                    value={editForm.description.en}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: { ...prev.description, en: e.target.value } }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                  />
                </div>

                {/* Description ZH */}
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_ZH</label>
                  <div className="flex gap-2">
                    <textarea
                      value={editForm.description.zh}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: { ...prev.description, zh: e.target.value } }))}
                      rows={2}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                    />
                    <button
                      onClick={() => handleTranslate('zh')}
                      disabled={translating}
                      className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50 self-start"
                      title="翻译为中文"
                    >
                      <Languages className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Description TH */}
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_TH</label>
                  <div className="flex gap-2">
                    <textarea
                      value={editForm.description.th}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: { ...prev.description, th: e.target.value } }))}
                      rows={2}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                    />
                    <button
                      onClick={() => handleTranslate('th')}
                      disabled={translating}
                      className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50 self-start"
                      title="翻译为泰文"
                    >
                      <Languages className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Event Date - 图片拍摄时间 */}
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">EVENT_DATE (图片发生时间)</label>
                  <input
                    type="date"
                    value={editForm.event_date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, event_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                  />
                  <p className="text-[10px] text-white/30 mt-1">留空则使用抓取时间</p>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">TAGS (comma-separated)</label>
                  <input
                    type="text"
                    value={editForm.tags.join(', ')}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                {/* Is Featured */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={editForm.is_featured}
                    onChange={(e) => setEditForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 focus:ring-lmsy-yellow/40"
                  />
                  <label htmlFor="is_featured" className="text-xs font-mono text-white/60">
                    FEATURED_ITEM
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                <motion.button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-lmsy-yellow/20 border border-lmsy-yellow/40 text-lmsy-yellow text-sm font-mono hover:bg-lmsy-yellow/30 transition-all rounded"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  SAVE_CHANGES
                </motion.button>
                <motion.button
                  onClick={handleCloseEdit}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-white/60 text-sm font-mono hover:bg-white/15 hover:text-white/80 transition-all rounded"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  CANCEL
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Edit Modal */}
      <AnimatePresence>
        {batchEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={handleCloseBatchEdit}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex bg-black border border-white/10 rounded-lg"
            >
              {/* Left Panel - Form */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-serif text-white/90">BATCH_EDIT ({selectedIds.size} ITEMS)</h2>
                  <button
                    onClick={handleCloseBatchEdit}
                    className="p-2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  {/* Title EN */}
                  <div>
                    <label className="block text-xs font-mono text-white/40 mb-1">TITLE_EN</label>
                    <input
                      type="text"
                      value={batchEditForm.title.en}
                      onChange={(e) => setBatchEditForm(prev => ({ ...prev, title: { ...prev.title, en: e.target.value } }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                    />
                  </div>

                  {/* Title ZH */}
                  <div>
                    <label className="block text-xs font-mono text-white/40 mb-1">TITLE_ZH</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={batchEditForm.title.zh}
                        onChange={(e) => setBatchEditForm(prev => ({ ...prev, title: { ...prev.title, zh: e.target.value } }))}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                      />
                      <button
                        onClick={() => handleBatchTranslate('zh')}
                        disabled={translating}
                        className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50"
                        title="翻译为中文"
                      >
                        <Languages className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Title TH */}
                  <div>
                    <label className="block text-xs font-mono text-white/40 mb-1">TITLE_TH</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={batchEditForm.title.th}
                        onChange={(e) => setBatchEditForm(prev => ({ ...prev, title: { ...prev.title, th: e.target.value } }))}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                      />
                      <button
                        onClick={() => handleBatchTranslate('th')}
                        disabled={translating}
                        className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50"
                        title="翻译为泰文"
                      >
                        <Languages className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Description EN */}
                  <div>
                    <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_EN</label>
                    <textarea
                      value={batchEditForm.description.en}
                      onChange={(e) => setBatchEditForm(prev => ({ ...prev, description: { ...prev.description, en: e.target.value } }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                    />
                  </div>

                  {/* Description ZH */}
                  <div>
                    <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_ZH</label>
                    <div className="flex gap-2">
                      <textarea
                        value={batchEditForm.description.zh}
                        onChange={(e) => setBatchEditForm(prev => ({ ...prev, description: { ...prev.description, zh: e.target.value } }))}
                        rows={3}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                      />
                      <button
                        onClick={() => handleBatchTranslate('zh')}
                        disabled={translating}
                        className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50 self-start"
                        title="翻译为中文"
                      >
                        <Languages className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Description TH */}
                  <div>
                    <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_TH</label>
                    <div className="flex gap-2">
                      <textarea
                        value={batchEditForm.description.th}
                        onChange={(e) => setBatchEditForm(prev => ({ ...prev, description: { ...prev.description, th: e.target.value } }))}
                        rows={3}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                      />
                      <button
                        onClick={() => handleBatchTranslate('th')}
                        disabled={translating}
                        className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50 self-start"
                        title="翻译为泰文"
                      >
                        <Languages className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Event Date - 图片拍摄时间 */}
                  <div>
                    <label className="block text-xs font-mono text-white/40 mb-1">EVENT_DATE (图片发生时间)</label>
                    <input
                      type="date"
                      value={batchEditForm.event_date}
                      onChange={(e) => setBatchEditForm(prev => ({ ...prev, event_date: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                    />
                    <p className="text-[10px] text-white/30 mt-1">留空则使用抓取时间</p>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs font-mono text-white/40 mb-1">TAGS (comma-separated)</label>
                    <input
                      type="text"
                      value={batchEditForm.tags.join(', ')}
                      onChange={(e) => setBatchEditForm(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>

                  {/* Is Featured */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="batch_is_featured"
                      checked={batchEditForm.is_featured}
                      onChange={(e) => setBatchEditForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 focus:ring-lmsy-yellow/40"
                    />
                    <label htmlFor="batch_is_featured" className="text-xs font-mono text-white/60">
                      FEATURED_ITEMS
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                  <motion.button
                    onClick={handleSaveBatchEdit}
                    className="flex-1 px-4 py-2 bg-lmsy-yellow/20 border border-lmsy-yellow/40 text-lmsy-yellow text-sm font-mono hover:bg-lmsy-yellow/30 transition-all rounded"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    SAVE_ALL_CHANGES
                  </motion.button>
                  <motion.button
                    onClick={handleCloseBatchEdit}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-white/60 text-sm font-mono hover:bg-white/15 hover:text-white/80 transition-all rounded"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    CANCEL
                  </motion.button>
                </div>
              </div>

              {/* Right Panel - Item List with Order */}
              <div className="w-80 border-l border-white/10 p-4 overflow-y-auto custom-scrollbar bg-white/5">
                <h3 className="text-xs font-mono text-white/60 mb-4 sticky top-0 bg-white/5 pb-2 border-b border-white/10">
                  SEQUENCE_ORDER
                </h3>
                <div className="space-y-2">
                  {batchOrder.map((id, index) => {
                    const item = drafts.find(d => d.id === id);
                    if (!item) return null;

                    return (
                      <motion.div
                        key={id}
                        layout
                        className="flex items-center gap-2 p-2 bg-black/50 border border-white/10 rounded"
                      >
                        <span className="text-xs font-mono text-white/40 w-6">{index + 1}</span>
                        {item.r2_media_url && (
                          <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={item.r2_media_url}
                              alt=""
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/80 truncate">
                            {item.title.en || 'Untitled'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveItem(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="h-3 w-3" strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => handleMoveItem(index, 'down')}
                            disabled={index === batchOrder.length - 1}
                            className="p-1 text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="h-3 w-3" strokeWidth={2} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setDeleteConfirm({ show: false, type: 'single' })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-black border border-red-500/30 rounded-lg p-6"
              style={{
                boxShadow: '0 0 40px rgba(220, 38, 38, 0.2), inset 0 0 20px rgba(220, 38, 38, 0.05)',
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-full">
                  <Trash2 className="h-5 w-5 text-red-400" strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-serif text-white/90">
                  {deleteConfirm.type === 'batch' ? 'DELETE_MULTIPLE_ITEMS' : 'DELETE_ITEM'}
                </h2>
              </div>

              {/* Message */}
              <p className="text-white/60 text-sm mb-6">
                {deleteConfirm.type === 'batch'
                  ? `Are you sure you want to delete ${deleteConfirm.count} items? This action cannot be undone.`
                  : 'Are you sure you want to delete this item? This action cannot be undone.'}
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <motion.button
                  onClick={deleteConfirm.type === 'batch' ? executeBatchDelete : executeDelete}
                  className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-mono hover:bg-red-500/30 transition-all rounded"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  CONFIRM_DELETE
                </motion.button>
                <motion.button
                  onClick={() => setDeleteConfirm({ show: false, type: 'single' })}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-white/60 text-sm font-mono hover:bg-white/15 hover:text-white/80 transition-all rounded"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  CANCEL
                </motion.button>
              </div>
            </motion.div>
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
