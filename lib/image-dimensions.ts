/**
 * Intrinsic image dimensions, generated once from the R2 mirror.
 *
 * WHY: the gallery was rendered with <Image width={0} height={0} unoptimized>,
 * so the browser downloaded the full-size original (some are several MB) and
 * the column height was unknown until load, causing layout shift.
 *
 * The map is keyed by R2 object key (e.g. "magazines/2025/LMSY-MAG-...webp").
 * Regenerate it with `node scripts/extract-image-dimensions.mjs` after adding
 * new assets. Unknown images fall back to a neutral 2:3 box (the median ratio
 * of the archive).
 */

import dimensions from '@/lib/generated/image-dimensions.json';

type Dim = { w: number; h: number };
const MAP = dimensions as Record<string, Dim>;

/** Median aspect ratio (w/h) of the archive: portrait, close to 2:3. */
export const FALLBACK_ASPECT_RATIO = 2 / 3;

const CDN_BASE = (process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.lmsy.space').replace(/\/$/, '');

/** Resolve a stored image_url (absolute CDN URL or relative key) to an R2 key. */
export function toR2Key(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const withoutQuery = imageUrl.split('?')[0];
  if (withoutQuery.startsWith('http://') || withoutQuery.startsWith('https://')) {
    if (!withoutQuery.startsWith(CDN_BASE + '/')) return null;
    return withoutQuery.slice(CDN_BASE.length + 1) || null;
  }
  return withoutQuery.replace(/^\//, '') || null;
}

/**
 * Intrinsic size for an image, adjusted for stored rotation (90/270 swap the
 * displayed aspect ratio).
 */
export function getImageDimensions(
  imageUrl: string | null | undefined,
  rotation = 0
): { width: number; height: number } | null {
  const key = toR2Key(imageUrl);
  if (!key) return null;
  const dim = MAP[key];
  if (!dim) return null;
  const swapped = rotation === 90 || rotation === 270;
  return swapped ? { width: dim.h, height: dim.w } : { width: dim.w, height: dim.h };
}

/** Aspect ratio (w/h) for an image, falling back to the archive median. */
export function getImageAspectRatio(imageUrl: string | null | undefined, rotation = 0): number {
  const dim = getImageDimensions(imageUrl, rotation);
  return dim ? dim.width / dim.height : FALLBACK_ASPECT_RATIO;
}
