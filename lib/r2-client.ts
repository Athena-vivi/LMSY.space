import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Initialize R2 Client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://<account-id>.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

// Bucket name
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'lmsy-gallery';

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

    await r2Client.send(command);

    // Return relative path and full CDN URL
    return {
      success: true,
      path: path,
      url: `${BASE_CDN_URL}/${path}`,
    };
  } catch (error) {
    console.error('R2 upload error:', error);
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

    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error('R2 delete error:', error);
    return false;
  }
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
