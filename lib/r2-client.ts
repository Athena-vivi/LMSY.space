import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';

// 🔒 SECURITY: This file must only be used on the server side
// Environment variables without NEXT_PUBLIC_ prefix are never available in the browser
if (typeof window !== 'undefined') {
  throw new Error(
    'CRITICAL SECURITY ERROR: R2 client (with SERVICE_ROLE credentials) must never be used in browser code. ' +
    'Use API routes or server actions instead.'
  );
}

// Bucket name - 统一使用 lmsy-archive
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'lmsy-archive';

// Initialize R2 Client (lazy initialization, only when used)
const getR2Client = (): S3Client => {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 configuration incomplete. Missing: ' +
      [
        !endpoint && 'R2_ENDPOINT',
        !accessKeyId && 'R2_ACCESS_KEY_ID',
        !secretAccessKey && 'R2_SECRET_ACCESS_KEY',
      ].filter(Boolean).join(', ')
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

// Base CDN URL
export const BASE_CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.lmsy.space';

export interface UploadResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

/**
 * Upload a file to R2 storage
 * @param file - File to upload
 * @param path - Destination path in bucket (e.g., 'gallery/image.jpg')
 * @returns Upload result with path and CDN URL
 */
export async function uploadToR2(
  file: File | Buffer,
  path: string,
  contentType?: string
): Promise<UploadResult> {
  try {
    // Convert File to Buffer if needed
    let buffer: Buffer;
    let finalContentType = contentType || 'image/jpeg';

    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      finalContentType = contentType || file.type || 'image/jpeg';
    } else {
      buffer = file;
    }

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: path,
      Body: buffer,
      ContentType: finalContentType,
    });

    await getR2Client().send(command);

    // Return relative path and full CDN URL
    return {
      success: true,
      path: path,
      url: `${BASE_CDN_URL}/${path}`,
    };
  } catch (error) {
    // Log the message only - never dump the raw SDK error object.
    console.error('R2 upload error:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a file from R2 storage
 * @param path - Path of file to delete
 * @returns Success status
 */
export async function deleteFromR2(path: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: path,
    });

    await getR2Client().send(command);
    return true;
  } catch (error) {
    // Log the message only - never dump the raw SDK error object.
    console.error('R2 delete error:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * True when an object already exists at this key.
 *
 * Used before a rename so a destination that is already occupied is reported
 * as a conflict instead of silently overwriting another asset's file.
 */
export async function r2ObjectExists(key: string): Promise<boolean> {
  const result = await getR2ObjectMetadata(key);
  return result.success;
}

/**
 * Copy an object inside the bucket, server-side (no download / re-upload).
 *
 * R2 supports CopyObject for objects up to 5 GB; the archive's pictures are
 * webp files of a few hundred KB, so a single call is always enough.
 */
export async function copyR2Object(fromKey: string, toKey: string): Promise<boolean> {
  try {
    const command = new CopyObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: toKey,
      // CopySource is "<bucket>/<key>" and the key part must be URL-encoded.
      CopySource: `${R2_BUCKET_NAME}/${encodeURIComponent(fromKey)}`,
    });

    await getR2Client().send(command);
    return true;
  } catch (error) {
    console.error('R2 copy error:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Move an object: copy to the new key, confirm it is readable there, then
 * delete the old one.
 *
 * The destination is verified BEFORE the source is removed, so a failed copy
 * never leaves the archive without a file. Deleting first was the obvious
 * wrong order - it loses the picture when the copy fails.
 *
 * Returns 'moved' | 'same' | 'copy-failed' | 'missing-source'.
 */
export async function moveR2Object(
  fromKey: string,
  toKey: string
): Promise<'moved' | 'same' | 'copy-failed' | 'missing-source'> {
  if (!fromKey || !toKey || fromKey === toKey) return 'same';

  if (!(await r2ObjectExists(fromKey))) return 'missing-source';
  if (!(await copyR2Object(fromKey, toKey))) return 'copy-failed';
  if (!(await r2ObjectExists(toKey))) return 'copy-failed';

  await deleteFromR2(fromKey);
  return 'moved';
}

/**
 * Get the full CDN URL for a given path
 * @param path - Relative path in R2 bucket
 * @returns Full CDN URL
 */
export function getCdnUrl(path: string): string {
  // If path already includes full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  return `${BASE_CDN_URL}/${cleanPath}`;
}

/**
 * Get the relative path from a full CDN URL
 * @param url - Full CDN URL or path
 * @returns Relative path for database storage
 */
export function getRelativePath(url: string): string {
  // If it's already a relative path, return as is
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }

  // Extract path from CDN URL
  try {
    const urlObj = new URL(url);
    // Remove leading slash from pathname
    return urlObj.pathname.slice(1);
  } catch {
    // If URL parsing fails, return as is
    return url;
  }
}

/**
 * List objects in R2 bucket with optional prefix filter
 * @param prefix - Optional prefix to filter objects (e.g., 'lmsy/mag/2025/')
 * @returns Array of R2 object metadata
 */
export async function listR2Objects(prefix?: string): Promise<{
  success: boolean;
  objects?: Array<{
    key: string;
    size: number;
    lastModified: Date;
    etag: string;
  }>;
  error?: string;
}> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await getR2Client().send(command);

    const objects = (response.Contents || []).map(obj => ({
      key: obj.Key!,
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
      etag: obj.ETag?.replace(/"/g, '') || '',
    }));

    console.log(`[R2_LIST] Found ${objects.length} objects with prefix: ${prefix || '(all)'}`);

    return {
      success: true,
      objects,
    };
  } catch (error) {
    // Log the message only - never dump the raw SDK error object.
    console.error('[R2_LIST] Error listing objects:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get object metadata from R2
 * @param key - Object key in R2 bucket
 * @returns Object metadata
 */
export async function getR2ObjectMetadata(key: string): Promise<{
  success: boolean;
  metadata?: {
    size: number;
    contentType: string;
    lastModified: Date;
  };
  error?: string;
}> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await getR2Client().send(command);

    return {
      success: true,
      metadata: {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
      },
    };
  } catch (error) {
    // Log the message only - never dump the raw SDK error object.
    console.error('[R2_METADATA] Error getting object metadata:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

