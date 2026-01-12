/**
 * Image URL utilities for browser and server
 *
 * 🔒 NO PLACEHOLDER, NO FAKE DATA - Direct CDN URL construction
 */

// Debug counter to limit console output
let debugCounter = 0;
const MAX_DEBUG = 5; // Only print first 5 calls

/**
 * Get the full image URL for display
 * Handles relative paths from R2 storage
 *
 * @param imageUrl - Image URL from database (relative path or absolute URL)
 * @returns Full URL to display, or null if no image
 *
 * @example
 * // R2 relative path
 * getImageUrl('gallery/photo.jpg') // => 'https://cdn.lmsy.space/gallery/photo.jpg'
 *
 * // Already absolute URL
 * getImageUrl('https://cdn.lmsy.space/gallery/photo.jpg') // => same
 *
 * // null input
 * getImageUrl(null) // => null
 */
export function getImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) {
    // 🔒 NO PLACEHOLDER: Return null, let the caller handle it
    return null;
  }

  // If it's already an absolute URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    if (debugCounter < MAX_DEBUG) {
      console.log('[IMAGE_URL_DEBUG] Already absolute URL:', imageUrl);
      debugCounter++;
    }
    return imageUrl;
  }

  // Convert relative path to CDN URL
  const cdnBaseUrl = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.lmsy.space';

  // Remove leading slash if present
  const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
  const finalUrl = `${cdnBaseUrl}/${cleanPath}`;

  if (debugCounter < MAX_DEBUG) {
    console.log('[IMAGE_URL_DEBUG] Path construction:', {
      input: imageUrl,
      cleanPath,
      cdnBaseUrl,
      finalUrl,
      hasLeadingSlash: imageUrl.startsWith('/'),
    });
    debugCounter++;
  }

  return finalUrl;
}
