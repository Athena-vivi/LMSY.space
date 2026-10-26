/**
 * Asset Vault Utility Functions
 */

/**
 * Get full CDN URL from storage path
 */
export const getCdnUrl = (path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `https://cdn.lmsy.space/${path}`;
};

/**
 * Group events by year for Chronicle view
 */
export const groupEventsByYear = <T extends { event_date: string }>(events: T[]): Record<number, T[]> => {
  return events.reduce((acc, event) => {
    const year = new Date(event.event_date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {} as Record<number, T[]>);
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();
};

/**
 * Format short date (month day)
 */
export const formatShortDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};
