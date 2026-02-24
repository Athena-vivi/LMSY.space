/**
 * Drafts Filter Bar Component
 *
 * Extracted from the main drafts page for better maintainability.
 * Includes the Bulk Upload trigger button.
 *
 * Usage:
 * <DraftsFilterBar
 *   searchQuery={searchQuery}
 *   setSearchQuery={setSearchQuery}
 *   ...otherProps
 * />
 */

'use client';

import { motion } from 'framer-motion';
import { Search, Check } from 'lucide-react';
import { UploadTriggerButton } from '@/components/upload';

type FilterStatus = 'all' | 'draft' | 'ready' | 'failed';
type MediaType = 'all' | 'image' | 'video';

interface DraftsFilterBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterStatus: FilterStatus;
  setFilterStatus: (value: FilterStatus) => void;
  filterMediaType: MediaType;
  setFilterMediaType: (value: MediaType) => void;
  filteredDrafts: any[];
  selectedIds: Set<string>;
  toggleSelectAll: () => void;
  fetchDrafts: () => void;
  loading: boolean;
}

export function DraftsFilterBar({
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterMediaType,
  setFilterMediaType,
  filteredDrafts,
  selectedIds,
  toggleSelectAll,
  fetchDrafts,
  loading,
}: DraftsFilterBarProps) {
  return (
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

      {/* Bulk Upload Button */}
      <UploadTriggerButton />
    </motion.div>
  );
}
