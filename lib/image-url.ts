import { getCdnUrl } from './r2-client';

/**
 * Get the full image URL for display
 * Handles both relative paths (from R2) and legacy absolute URLs (from Supabase)
 *
 * @param imageUrl - Image URL from database (can be relative path or absolute URL)
 * @returns Full URL to display in <img> tags
 *
 * @example
 * // R2 path (new)
 * getImageUrl('gallery/photo.jpg') // => 'https://cdn.lmsy.space/gallery/photo.jpg'
 *
 * // Legacy Supabase URL (old)
 * getImageUrl('https://xyz.supabase.co/storage/v1/object/public/...') // => same URL
 */
export function getImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) {
    // Return placeholder if no image
    return '/placeholder.jpg';
  }

  // If it's already an absolute URL, return as is (legacy Supabase URLs)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Convert relative path to CDN URL
  return getCdnUrl(imageUrl);
}

/**
 * Check if an image URL is from R2 (new) or Supabase (legacy)
 */
export function isLegacyImageUrl(imageUrl: string): boolean {
  return imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
}

/**
 * Get the relative path for database storage
 * Use this when you have a full URL and need to store just the path
 */
export function getStoragePath(url: string): string {
  if (isLegacyImageUrl(url)) {
    return url; // Keep legacy URLs as is
  }

  // Already a relative path
  return url.startsWith('/') ? url.slice(1) : url;
}

/**
 * Generate optimized image URL for Next.js Image component
 * This ensures all images use the CDN domain
 */
export function getOptimizedImageUrl(
  imageUrl: string | null | undefined,
  width?: number,
  quality?: number
): string {
  const fullUrl = getImageUrl(imageUrl);

  // If it's our CDN, we could add optimization parameters
  // For now, return the URL as-is
  // You can extend this to add CDN-specific query parameters
  return fullUrl;
}
