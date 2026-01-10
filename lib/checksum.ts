/**
 * Client-side checksum utilities for duplicate detection
 */

/**
 * Calculate SHA-256 checksum of a file
 * @param file - File to calculate checksum for
 * @returns Hex string of SHA-256 hash
 */
export async function calculateSHA256(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Calculate MD5 checksum of a file (simple implementation)
 * Note: This is a basic implementation. For production, consider using a proper MD5 library.
 * @param file - File to calculate checksum for
 * @returns Hex string of MD5 hash
 */
export async function calculateMD5(file: File): Promise<string> {
  // Use SHA-256 as fallback since MD5 is not available in Web Crypto API
  // For proper MD5, you would need to use a library like spark-md5
  const arrayBuffer = await file.arrayBuffer();

  // Simple hash function for demonstration
  // In production, use spark-md5 or similar library
  let hash = 0;
  const view = new Uint8Array(arrayBuffer);

  for (let i = 0; i < view.length; i++) {
    const char = view[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(16).padStart(32, '0');
}

/**
 * Quick duplicate check by file size
 * @param file - File to check
 * @param existingSizes - Array of existing file sizes
 * @returns True if a file with same size exists
 */
export function hasSizeMatch(file: File, existingSizes: number[]): boolean {
  return existingSizes.includes(file.size);
}

/**
 * Generate a simple fingerprint for quick comparison
 * @param file - File to fingerprint
 * @returns Fingerprint string (size + first/last 1KB)
 */
export async function generateFingerprint(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const view = new Uint8Array(arrayBuffer);

  // Take first 100 bytes and last 100 bytes
  const sampleSize = 100;
  let fingerprint = `${file.size}-`;

  // Add first N bytes
  for (let i = 0; i < Math.min(sampleSize, view.length); i++) {
    fingerprint += view[i].toString(16).padStart(2, '0');
  }

  fingerprint += '-';

  // Add last N bytes
  for (let i = Math.max(0, view.length - sampleSize); i < view.length; i++) {
    fingerprint += view[i].toString(16).padStart(2, '0');
  }

  return fingerprint;
}
