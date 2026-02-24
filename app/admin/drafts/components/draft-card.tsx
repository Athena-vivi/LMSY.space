/**
 * Draft Card Component
 *
 * Renders a single draft item card with all its interactions
 */

'use client';

import { motion } from 'framer-motion';
import { Check, Edit2, Trash2, Play, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { platformIcons, platformColors, statusBadges, stageBadges } from '../constants';
import { formatRelativeTime, getDisplayTitle } from '../utils';

interface DraftCardProps {
  draft: {
    id: string;
    title: { en?: string; zh?: string; th?: string };
    description: { en?: string; zh?: string; th?: string };
    r2_media_url: string | null;
    r2_key: string | null;
    media_type: 'image' | 'video';
    source_platform: string;
    status: string;
    ingestion_stage: string;
    is_featured: boolean;
    created_at: string;
  };
  isSelected: boolean;
  isVideoHovered: boolean;
  onToggleSelect: (id: string) => void;
  onVideoHoverStart: (id: string) => void;
  onVideoHoverEnd: () => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onEdit: (draft: any) => void;
  onDelete: (id: string, r2Key: string | null) => void;
}

export function DraftCard({
  draft,
  isSelected,
  isVideoHovered,
  onToggleSelect,
  onVideoHoverStart,
  onVideoHoverEnd,
  onPublish,
  onUnpublish,
  onEdit,
  onDelete,
}: DraftCardProps) {
  const isVideo = draft.media_type === 'video';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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
      onHoverStart={() => isVideo && onVideoHoverStart(draft.id)}
      onHoverEnd={onVideoHoverEnd}
    >
      {/* Select Checkbox */}
      <button
        onClick={() => onToggleSelect(draft.id)}
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
              {isVideoHovered ? (
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
              // Published state - show UNPUBLISH button
              <button
                onClick={() => onUnpublish(draft.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-lmsy-blue/10 border border-lmsy-blue/30 text-lmsy-blue/80 text-[10px] font-mono hover:bg-lmsy-blue/20 transition-all"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={2} />
                <span>UNPUBLISH</span>
              </button>
            ) : (
              // Draft state - show PUBLISH button
              <button
                onClick={() => onPublish(draft.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400/80 text-[10px] font-mono hover:bg-green-500/20 transition-all"
              >
                <Check className="h-3 w-3" strokeWidth={2} />
                <span>PUBLISH</span>
              </button>
            )}
            <button
              onClick={() => onEdit(draft)}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white/10 border border-white/20 text-white/60 text-[10px] font-mono hover:bg-white/15 hover:text-white/80 transition-all"
            >
              <Edit2 className="h-3 w-3" strokeWidth={2} />
              <span>EDIT</span>
            </button>
            <button
              onClick={() => onDelete(draft.id, draft.r2_key)}
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
}
