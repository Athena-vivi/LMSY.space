/**
 * Editorial display helpers (phase-6 batch 1).
 *
 * Two problems this fixes:
 * 1. The detail page counted artifacts as `galleryImages.length + 1` "for the
 *    cover". For 7 of the 11 public editorial works the cover_url IS one of
 *    the gallery images, so the page over-counted by one. The count must be
 *    the number of distinct real artifacts, or the gallery length when there
 *    is no separate cover.
 * 2. The list card built its corner plate by stripping every non-ASCII
 *    character, so a Chinese or Thai title rendered as "__________". A title
 *    with non-Latin script is now shown as-is.
 *
 * Pure functions, no path aliases - directly testable with node --test.
 */

export interface ArtifactLike {
  image_url: string;
}

/**
 * Distinct artifact count for one issue.
 * - no cover: just the gallery pages
 * - cover that is already a gallery page: still just the gallery pages
 * - cover that is NOT among the gallery pages: gallery pages + 1
 */
export function countIssueArtifacts(
  images: readonly ArtifactLike[] | null | undefined,
  coverUrl: string | null | undefined
): number {
  const pages = images?.length ?? 0;
  if (!coverUrl) return pages;
  const coverIsPage = (images ?? []).some((img) => img?.image_url === coverUrl);
  return coverIsPage ? pages : pages + 1;
}

/**
 * Corner plate text for an editorial card. Latin titles keep the archive
 * convention (uppercase, spaces to underscores); anything containing CJK or
 * Thai characters is preserved verbatim so it stays readable.
 */
export function titlePlateLabel(title: string): string {
  const trimmed = (title ?? '').trim();
  if (!trimmed) return '';
  // Any character outside ASCII means the strip-to-underscore treatment would
  // destroy the word, not just normalize spacing.
  if (/[^\x20-\x7E]/.test(trimmed)) return trimmed;
  return trimmed.replace(/\s+/g, '_').toUpperCase();
}
