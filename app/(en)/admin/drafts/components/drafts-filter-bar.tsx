/**
 * Drafts Filter Bar Component
 *
 * Extracted from the main drafts page for better maintainability.
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
import { useAdminLang } from '@/lib/admin-i18n';

type FilterStatus = 'all' | 'draft' | 'ready' | 'failed';
type MediaType = 'all' | 'image' | 'video';

interface DraftsFilterBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterStatus: FilterStatus;
  setFilterStatus: (value: FilterStatus) => void;
  filterMediaType: MediaType;
  setFilterMediaType: (value: MediaType) => void;
  filterBatchId?: string;
  setFilterBatchId?: (value: string) => void;
  filterProjectId?: string;
  setFilterProjectId?: (value: string) => void;
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
  filterBatchId,
  setFilterBatchId,
  filterProjectId,
  setFilterProjectId,
  filteredDrafts,
  selectedIds,
  toggleSelectAll,
  fetchDrafts,
  loading,
}: DraftsFilterBarProps) {
  const { t } = useAdminLang();
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-2" strokeWidth={1.5} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('d.searchPlaceholder')}
          className="w-full pl-9 pr-4 py-1.5 bg-transparent text-ink-2 text-sm font-mono focus:outline-none placeholder:text-ink-2 tracking-wide"
        />
      </div>

      {/* Status Filter */}
      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
        className="px-3 py-1.5 bg-transparent text-ink-2 text-xs font-mono focus:outline-none border border-white/10 focus:border-lmsy-yellow/40 tracking-wider"
      >
        <option value="all">{t('d.status.all')}</option>
        <option value="draft">{t('d.status.draft')}</option>
        <option value="ready">{t('d.status.ready')}</option>
        <option value="failed">{t('d.status.failed')}</option>
      </select>

      {/* Media Type Filter */}
      <select
        value={filterMediaType}
        onChange={(e) => setFilterMediaType(e.target.value as MediaType)}
        className="px-3 py-1.5 bg-transparent text-ink-2 text-xs font-mono focus:outline-none border border-white/10 focus:border-lmsy-yellow/40 tracking-wider"
      >
        <option value="all">{t('d.type.all')}</option>
        <option value="image">{t('d.type.image')}</option>
        <option value="video">{t('d.type.video')}</option>
      </select>

      {/* Batch filter (batch 2): paste a batch id to review one ingestion run */}
      <input
        type="text"
        value={filterBatchId ?? ''}
        onChange={(e) => setFilterBatchId?.(e.target.value)}
        placeholder={t('d.batchId')}
        title={t('d.batchIdHint')}
        className="w-36 px-3 py-1.5 bg-transparent text-ink-2 text-xs font-mono focus:outline-none border border-white/10 focus:border-lmsy-yellow/40 placeholder:text-ink-2 tracking-wider"
      />

      {/* Project filter (batch 2): paste a project id to review one project */}
      <input
        type="text"
        value={filterProjectId ?? ''}
        onChange={(e) => setFilterProjectId?.(e.target.value)}
        placeholder={t('d.projectId')}
        title={t('d.projectIdHint')}
        className="w-36 px-3 py-1.5 bg-transparent text-ink-2 text-xs font-mono focus:outline-none border border-white/10 focus:border-lmsy-yellow/40 placeholder:text-ink-2 tracking-wider"
      />

      {/* Select All */}
      {filteredDrafts.length > 0 && (
        <motion.button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 px-3 py-1.5 border border-white/10 text-ink-2 text-xs font-mono hover:text-ink-2 hover:border-white/20 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {selectedIds.size === filteredDrafts.length ? (
            <>
              <Check className="h-3 w-3" strokeWidth={2} />
              <span>{t('common.deselectAll')}</span>
            </>
          ) : (
            <>
              <div className="h-3 w-3 border border-white/30" />
              <span>{t('common.selectAll')}</span>
            </>
          )}
        </motion.button>
      )}

      {/* Refresh Button */}
      <motion.button
        onClick={fetchDrafts}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-ink-2 text-xs font-mono hover:text-lmsy-yellow hover:border-lmsy-yellow/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        title={t('d.refreshHint')}
      >
        <motion.span
          animate={{ rotate: loading ? 360 : 0 }}
          transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
        >
          ↻
        </motion.span>
        <span>{t('d.refresh')}</span>
      </motion.button>
    </motion.div>
  );
}
