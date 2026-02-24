/**
 * Drafts Content State Components
 *
 * Loading, Empty, and Grid states
 */

'use client';

import { motion } from 'framer-motion';
import { DraftCard } from './draft-card';

interface LoadingStateProps {
  loading: boolean;
}

export function LoadingState({ loading }: LoadingStateProps) {
  if (!loading) return null;

  return (
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
  );
}

interface EmptyStateProps {
  hasDrafts: boolean;
}

export function EmptyState({ hasDrafts }: EmptyStateProps) {
  return (
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
        {hasDrafts ? 'NO_MATCHING_RESULTS' : 'WAITING_FOR_INGESTION'}
      </p>
    </motion.div>
  );
}

interface DraftsGridProps {
  drafts: any[];
  selectedIds: Set<string>;
  hoveredVideoId: string | null;
  onToggleSelect: (id: string) => void;
  onVideoHoverStart: (id: string) => void;
  onVideoHoverEnd: () => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onEdit: (draft: any) => void;
  onDelete: (id: string, r2Key: string | null) => void;
}

export function DraftsGrid({
  drafts,
  selectedIds,
  hoveredVideoId,
  onToggleSelect,
  onVideoHoverStart,
  onVideoHoverEnd,
  onPublish,
  onUnpublish,
  onEdit,
  onDelete,
}: DraftsGridProps) {
  return (
    <motion.div
      key="grid"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {drafts.map((draft, index) => {
        const isSelected = selectedIds.has(draft.id);
        const isVideoHovered = hoveredVideoId === draft.id;

        return (
          <DraftCard
            key={draft.id}
            draft={draft}
            isSelected={isSelected}
            isVideoHovered={isVideoHovered}
            onToggleSelect={onToggleSelect}
            onVideoHoverStart={onVideoHoverStart}
            onVideoHoverEnd={onVideoHoverEnd}
            onPublish={onPublish}
            onUnpublish={onUnpublish}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
    </motion.div>
  );
}
