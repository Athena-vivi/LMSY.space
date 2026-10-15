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
