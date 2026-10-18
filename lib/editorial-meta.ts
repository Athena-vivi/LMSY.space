/**
 * Editorial display helpers (phase-6 batch 1, hardened in batch 3).
 *
 * Three problems this fixes:
 * 1. The detail page counted artifacts as `galleryImages.length + 1` "for the
 *    cover". For most public editorial works the cover_url IS one of the
 *    gallery images, so the page over-counted by one. The count must be the
 *    number of distinct real artifacts, or the gallery length when there is
 *    no separate cover.
 * 2. The list card built its corner plate by stripping every non-ASCII
 *    character, so a Chinese or Thai title rendered as "__________". A title
 *    with non-Latin script is now shown as-is.
 * 3. Cover and page URLs are stored in two different shapes (relative R2 path
 *    vs absolute CDN URL). Comparing them as raw strings made the same file
 *    look like two artifacts, which is why the list said 21 and the detail
 *    said 22 for four issues. Comparison now goes through the existing
 *    getImageUrl normalizer, so both shapes resolve to one identity.
 *
 * Pure functions, no path aliases - directly testable with node --test.
 */

import { getImageUrl } from './image-url.ts';

export interface ArtifactLike {
  image_url: string;
}

/**
 * Canonical identity for one stored image reference.
 *
 * Uses the shared getImageUrl normalizer (relative R2 path -> absolute CDN
 * URL) and then collapses repeated slashes in the path. The full path is
 * kept: two files that share a basename but live in different directories
 * stay distinct, and two different hosts stay distinct.
 */
export function imageIdentity(url: string | null | undefined): string | null {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!raw) return null;

  const resolved = getImageUrl(raw);
  if (!resolved) return null;

  // Collapse duplicate slashes in the path only; the protocol "://" keeps its
  // two slashes because the character before them is a colon.
  return resolved.replace(/([^:/])\/{2,}/g, '$1/');
}

/**
 * Distinct artifact count for one issue.
 * - no usable cover: just the gallery pages
 * - cover that is already a gallery page: still just the gallery pages
 * - cover that is NOT among the gallery pages: gallery pages + 1
 *
 * "Already a gallery page" is decided on image identity, not on raw string
 * equality, so a relative cover_url and the CDN URL of the same file count
 * once.
 */
export function countIssueArtifacts(
  images: readonly ArtifactLike[] | null | undefined,
  coverUrl: string | null | undefined
): number {
  const pages = images?.length ?? 0;
  const cover = imageIdentity(coverUrl);
  if (!cover) return pages;
  const coverIsPage = (images ?? []).some(
    (img) => imageIdentity(img?.image_url) === cover
  );
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
