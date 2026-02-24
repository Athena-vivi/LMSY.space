/**
 * File Security Validator
 *
 * Client-side file validation to prevent:
 * - Memory bombs (huge images)
 * - DoS attacks (too many files)
 * - Malicious file types
 *
 * NOTE: This is client-side only. Server-side validation is still required.
 */

export const UPLOAD_LIMITS = {
  maxFileSize: 50 * 1024 * 1024, // 50MB per file
  maxBatchSize: 500 * 1024 * 1024, // 500MB per batch
  maxFiles: 50,
  maxDimension: 12000, // pixels (safety margin)
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
} as const;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Validate a single file
 */
export function validateFile(file: File): FileValidationResult {
  const warnings: string[] = [];

  // Size check
  if (file.size > UPLOAD_LIMITS.maxFileSize) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${UPLOAD_LIMITS.maxFileSize / 1024 / 1024}MB)`,
    };
  }

  // MIME type check
  if (!UPLOAD_LIMITS.allowedMimeTypes.includes(file.type as any)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type || 'unknown'}. Allowed: ${UPLOAD_LIMITS.allowedMimeTypes.join(', ')}`,
    };
  }

  // Warning for large files
  if (file.size > 10 * 1024 * 1024) {
    warnings.push(`Large file (${(file.size / 1024 / 1024).toFixed(1)}MB) - processing may be slow`);
  }

  return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * Validate a batch of files
 */
export function validateBatch(files: File[]): FileValidationResult {
  // Count check
  if (files.length > UPLOAD_LIMITS.maxFiles) {
    return {
      valid: false,
      error: `Too many files: ${files.length} (max ${UPLOAD_LIMITS.maxFiles})`,
    };
  }

  // Total size check
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > UPLOAD_LIMITS.maxBatchSize) {
    return {
      valid: false,
      error: `Batch too large: ${(totalSize / 1024 / 1024).toFixed(1)}MB (max ${UPLOAD_LIMITS.maxBatchSize / 1024 / 1024}MB)`,
    };
  }

  // Validate each file
  for (const file of files) {
    const result = validateFile(file);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Check image dimensions before processing
 * Prevents Canvas memory bombs
 */
export async function checkImageDimensions(
  file: File
): Promise<{ valid: boolean; width?: number; height?: number; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      const { width, height } = img;
      cleanup();

      if (width > UPLOAD_LIMITS.maxDimension || height > UPLOAD_LIMITS.maxDimension) {
        resolve({
          valid: false,
          width,
          height,
          error: `Image too large: ${width}x${height}px (max ${UPLOAD_LIMITS.maxDimension}x${UPLOAD_LIMITS.maxDimension})`,
        });
      } else {
        resolve({ valid: true, width, height });
      }
    };

    img.onerror = () => {
      cleanup();
      resolve({ valid: false, error: 'Failed to load image' });
    };

    img.src = url;
  });
}

/**
 * Batch dimension check with progress callback
 */
export async function checkBatchDimensions(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<{ valid: boolean; results: Array<{ file: File; valid: boolean; width?: number; height?: number; error?: string }> }> {
  const results = await Promise.all(
    files.map(async (file) => {
      const check = await checkImageDimensions(file);
      onProgress?.(results.length + 1, files.length);
      return { file, ...check };
    })
  );

  const invalid = results.find(r => !r.valid);
  return {
    valid: !invalid,
    results,
  };
}
