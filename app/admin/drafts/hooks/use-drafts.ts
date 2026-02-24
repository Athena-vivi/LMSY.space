/**
 * useDrafts - Core State Management Hook
 *
 * Manages all data fetching, filtering, and base state
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DraftItem } from '@/lib/supabase/types';
import type { FilterStatus, MediaType } from '../constants';
import { filterBySearch } from '../utils';

export function useDrafts() {
  // Data state
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [filteredDrafts, setFilteredDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterMediaType, setFilterMediaType] = useState<MediaType>('all');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  /**
   * Fetch drafts from API
   */
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

  // Initial fetch
  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  /**
   * Filter drafts by search query
   */
  useEffect(() => {
    const filtered = filterBySearch(drafts, searchQuery);
    setFilteredDrafts(filtered);
  }, [drafts, searchQuery]);

  /**
   * Show toast notification
   */
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  /**
   * Toggle selection for a single item
   */
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

  /**
   * Toggle select all visible items
   */
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDrafts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDrafts.map(d => d.id)));
    }
  };

  /**
   * Optimistic update helpers
   */
  const updateDraftOptimistically = (id: string, updates: Partial<DraftItem>) => {
    setDrafts(prev => prev.map(d =>
      d.id === id ? { ...d, ...updates } : d
    ));
  };

  const removeDraftOptimistically = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  return {
    // Data
    drafts,
    filteredDrafts,
    loading,
    selectedIds,
    toast,
    searchQuery,
    filterStatus,
    filterMediaType,

    // Setters
    setSearchQuery,
    setFilterStatus,
    setFilterMediaType,
    setSelectedIds,

    // Actions
    fetchDrafts,
    showToast,
    toggleSelect,
    toggleSelectAll,
    updateDraftOptimistically,
    removeDraftOptimistically,
  };
}
