import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

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

    await getR2Client().send(command);
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

/**
 * Test R2 connection by listing buckets
 * @returns Connection status with error details if failed
 */
export async function testR2Connection(): Promise<{
  success: boolean;
  error?: string;
  code?: string;
  rawError?: any;
}> {
  try {
    // Verify configuration
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = R2_BUCKET_NAME;

    console.log('[R2_CONFIG] Server-side environment check:', {
      endpoint: !!endpoint,
      accessKeyId: !!accessKeyId,
      secretAccessKey: !!secretAccessKey,
      bucketName,
    });

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

    // Test with HeadBucket instead of ListBuckets (more specific)
    const { HeadBucketCommand } = await import('@aws-sdk/client-s3');
    const command = new HeadBucketCommand({
      Bucket: bucketName,
    });

    await getR2Client().send(command);
    console.log('[R2_MEDIA] Connection test successful, bucket accessible:', bucketName);
    return { success: true };
  } catch (error: any) {
    const errorCode = error?.name || error?.Code || 'UNKNOWN';
    const errorMessage = error?.message || error?.Message || 'Unknown error';
    const httpStatusCode = error?.$metadata?.httpStatusCode;

    console.error(`[R2_RAW_ERROR] 🔍 Detailed Cloudflare R2 error analysis:`);
    console.error('[R2_RAW_ERROR] Error Name:', error?.name);
    console.error('[R2_RAW_ERROR] Error Code:', error?.Code || error?.name);
    console.error('[R2_RAW_ERROR] HTTP Status:', httpStatusCode);
    console.error('[R2_RAW_ERROR] Message:', errorMessage);
    console.error('[R2_RAW_ERROR] Request ID:', error?.$metadata?.requestId);
    console.error('[R2_RAW_ERROR] Extended Request ID:', error?.$metadata?.extendedRequestId);
    console.error('[R2_RAW_ERROR] Endpoint:', process.env.R2_ENDPOINT);
    console.error('[R2_RAW_ERROR] Bucket:', R2_BUCKET_NAME);
    console.error('[R2_RAW_ERROR] Region:', 'auto');
    console.error('[R2_RAW_ERROR] Full Error Object:', JSON.stringify(error, null, 2));

    console.error(`[R2_MEDIA] Connection failed:`, {
      bucket: R2_BUCKET_NAME,
      code: errorCode,
      message: errorMessage,
      httpStatusCode,
      raw: error,
    });

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      rawError: error,
    };
  }
}
