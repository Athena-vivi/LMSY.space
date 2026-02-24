/**
 * Drafts Content Component
 *
 * Manages loading, empty, and grid states
 */

'use client';

import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { DraftItem } from '@/lib/supabase/types';
import { LoadingState, EmptyState, DraftsGrid } from './drafts-content-states';

interface DraftsContentProps {
  drafts: DraftItem[];
  filteredDrafts: DraftItem[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onEdit: (draft: any) => void;
  onDelete: (id: string, r2Key: string | null) => void;
}

export function DraftsContent({
  drafts,
  filteredDrafts,
  loading,
  selectedIds,
  onToggleSelect,
  onPublish,
  onUnpublish,
  onEdit,
  onDelete,
}: DraftsContentProps) {
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <LoadingState loading={loading} />
      ) : !loading && filteredDrafts.length === 0 ? (
        <EmptyState hasDrafts={drafts.length > 0} />
      ) : (
        <DraftsGrid
          drafts={filteredDrafts}
          selectedIds={selectedIds}
          hoveredVideoId={hoveredVideoId}
          onToggleSelect={onToggleSelect}
          onVideoHoverStart={setHoveredVideoId}
          onVideoHoverEnd={() => setHoveredVideoId(null)}
          onPublish={onPublish}
          onUnpublish={onUnpublish}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </AnimatePresence>
  );
}
