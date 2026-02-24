/**
 * Vault Filter Bar Component
 *
 * Unified search and filter bar for all views
 */

'use client';

import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import type { VaultTabId } from '../constants';

interface VaultFilterBarProps {
  activeTab: VaultTabId;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterTag: string;
  setFilterTag: (value: string) => void;
  uniqueTags?: string[];
}

export function VaultFilterBar({
  activeTab,
  searchQuery,
  setSearchQuery,
  filterTag,
  setFilterTag,
  uniqueTags = [],
}: VaultFilterBarProps) {
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const showTagFilter = activeTab === 'all';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex items-center gap-4 py-2 border-b"
      style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
    >
      {/* Search */}
      <div className="flex-1 min-w-[200px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" strokeWidth={1.5} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="SEARCH_VAULT..."
          className="w-full pl-9 pr-8 py-1.5 bg-transparent text-white/60 text-sm font-mono focus:outline-none placeholder:text-white/20 tracking-wide"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Tag Filter (only for All Assets) */}
      {showTagFilter && uniqueTags.length > 0 && (
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="px-3 py-1.5 bg-transparent text-white/40 text-xs font-mono focus:outline-none border border-white/10 focus:border-lmsy-yellow/40 tracking-wider"
        >
          <option value="">ALL_TAGS</option>
          {uniqueTags.map(tag => (
            <option key={tag || ''} value={tag || ''}>{tag || 'No Tag'}</option>
          ))}
        </select>
      )}

      {/* Status indicator */}
      <div className="text-xs font-mono text-white/20 tracking-wider">
        {activeTab.toUpperCase()}
      </div>
    </motion.div>
  );
}
