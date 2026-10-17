/**
 * Image URL utilities for browser and server
 *
 * 🔒 NO PLACEHOLDER, NO FAKE DATA - Direct CDN URL construction
 * 🚀 FULL COMPATIBILITY: Handles both old absolute URLs and new relative paths
 */

/**
 * Get the full image URL for display
 * Handles relative paths from R2 storage
 *
 * @param imageUrl - Image URL from database (relative path or absolute URL)
 * @returns Full URL to display, or null if no image
 *
 * @example
 * // R2 relative path (NEW FORMAT)
 * getImageUrl('gallery/photo.jpg') // => 'https://cdn.lmsy.space/gallery/photo.jpg'
 * getImageUrl('/gallery/photo.jpg') // => 'https://cdn.lmsy.space/gallery/photo.jpg'
 *
 * // Already absolute URL (OLD FORMAT)
 * getImageUrl('https://cdn.lmsy.space/gallery/photo.jpg') // => 'https://cdn.lmsy.space/gallery/photo.jpg'
 *
 * // null input
 * getImageUrl(null) // => null
 */
/**
 * Static assets shipped in the app's public/ directory are served by the app
 * origin itself. The media CDN mirrors only the R2 bucket and 404s on site
 * static files (even favicon.ico), so these paths must never be rewritten.
 */
const LOCAL_PUBLIC_ASSETS = new Set([
  '/lmsy-001.jpg',
  '/hero-reveal.jpg',
]);

/**
 * Resolve an image source for display: local public/ assets are served as-is,
 * everything else goes through getImageUrl (CDN rewrite for R2 paths).
 *
 * @example
 * resolveImageUrl('/lmsy-001.jpg')       // => '/lmsy-001.jpg' (local, as-is)
 * resolveImageUrl('gallery/photo.jpg')   // => 'https://cdn.lmsy.space/gallery/photo.jpg'
 * resolveImageUrl('https://cdn.../x.jpg')// => unchanged
 */
export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) {
    return null;
  }

  if (LOCAL_PUBLIC_ASSETS.has(imageUrl)) {
    return imageUrl;
  }

  return getImageUrl(imageUrl);
}

export function getImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) {
    // 🔒 NO PLACEHOLDER: Return null, let the caller handle it
    return null;
  }

  // 🚨 CRITICAL: If already absolute URL (HTTP/HTTPS), return AS-IS without modification
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // 🔧 Convert relative path to CDN URL
  const cdnBaseUrl = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.lmsy.space';

  // 🩹 SLASH FIX: Remove leading slash if present to avoid double slashes
  const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;

  // 🔒 ENSURE SINGLE SLASH: cdnBaseUrl never ends with /, cleanPath never starts with /
  const finalUrl = `${cdnBaseUrl}/${cleanPath}`;

  return finalUrl;
}
