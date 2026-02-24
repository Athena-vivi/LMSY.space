/**
 * Drafts Utility Functions
 */

/**
 * Format relative time for display
 */
export function formatRelativeTime(dateStr: string): string {
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
}

/**
 * Get display title with fallback to first non-empty language
 */
export function getDisplayTitle(draft: { title: { en?: string; zh?: string; th?: string } }): string {
  return draft.title.en || draft.title.zh || draft.title.th || 'Untitled';
}

/**
 * Filter drafts by search query
 */
export function filterBySearch(drafts: any[], query: string): any[] {
  if (!query) return drafts;

  const lowerQuery = query.toLowerCase();
  return drafts.filter(draft => {
    const titleEn = draft.title.en?.toLowerCase() || '';
    const titleZh = draft.title.zh?.toLowerCase() || '';
    const titleTh = draft.title.th?.toLowerCase() || '';
    const descEn = draft.description.en?.toLowerCase() || '';
    const tags = (draft.tags || []).join(' ').toLowerCase();
    const sourceUrl = draft.source_url?.toLowerCase() || '';

    return (
      titleEn.includes(lowerQuery) ||
      titleZh.includes(lowerQuery) ||
      titleTh.includes(lowerQuery) ||
      descEn.includes(lowerQuery) ||
      tags.includes(lowerQuery) ||
      sourceUrl.includes(lowerQuery)
    );
  });
}
