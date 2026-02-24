/**
 * Drafts Constants
 *
 * Platform icons, colors, badges, and type definitions
 */

// Platform icons mapping
export const platformIcons: Record<string, string> = {
  twitter: '𝕏',
  instagram: '📸',
  weibo: '🌐',
  xiaohongshu: '📕',
  youtube: '▶️',
  tiktok: '🎵',
  manual: '📝',
};

// Platform colors
export const platformColors: Record<string, string> = {
  twitter: 'text-white/60',
  instagram: 'text-pink-400/80',
  weibo: 'text-red-400/80',
  xiaohongshu: 'text-red-500/80',
  youtube: 'text-red-500/80',
  tiktok: 'text-white/80',
  manual: 'text-white/40',
};

// Status badges
export const statusBadges: Record<string, { label: string; className: string }> = {
  draft: { label: 'DRAFT', className: 'bg-white/10 border-white/20 text-white/60' },
  pending_review: { label: 'REVIEW', className: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400/90' },
  ready: { label: 'READY', className: 'bg-green-500/20 border-green-500/30 text-green-400/90' },
  published: { label: 'PUBLISHED', className: 'bg-blue-500/20 border-blue-500/30 text-blue-400/90' },
  rejected: { label: 'REJECTED', className: 'bg-red-500/20 border-red-500/30 text-red-400/90' },
};

// Ingestion stage badges
export const stageBadges: Record<string, { label: string; className: string }> = {
  pending: { label: 'PENDING', className: 'bg-white/5 border-white/10 text-white/30' },
  downloading: { label: 'DOWNLOADING', className: 'bg-blue-500/10 border-blue-500/20 text-blue-400/70' },
  uploading: { label: 'UPLOADING', className: 'bg-blue-500/10 border-blue-500/20 text-blue-400/70' },
  translating: { label: 'TRANSLATING', className: 'bg-purple-500/10 border-purple-500/20 text-purple-400/70' },
  ready: { label: 'READY', className: 'bg-green-500/20 border-green-500/30 text-green-400/90' },
  failed: { label: 'FAILED', className: 'bg-red-500/20 border-red-500/30 text-red-400/90' },
};

// Type definitions
export type FilterStatus = 'all' | 'draft' | 'ready' | 'failed';
export type MediaType = 'all' | 'image' | 'video';
