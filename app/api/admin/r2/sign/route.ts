import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getAdminEmail } from '@/lib/security/api-auth';
import { validateObjectKey, isAllowedMimeType, UPLOAD_POLICY } from '@/lib/security/upload-guard';
import { getR2PathForCatalogId, isValidCatalogId, parseCatalogId } from '@/lib/catalog-id';
import { apiServerError } from '@/lib/security/http';

// Canonical layout is <person>/<door>/<year>/ (see docs/architecture/20261021-asset-naming.md).
// 'magazines/' is the pre-2026-10-21 layout and is still listed so the 316
// legacy objects remain reachable until they are retired.
const ALLOWED_R2_PREFIXES = ['lmsy/', 'lm/', 'sy/', 'magazines/', 'draft/', 'gallery/'];

/**
 * POST - Generate R2 Presigned URL for direct client-to-R2 upload
 *
 * This endpoint creates a temporary, pre-signed URL that allows the browser
 * to upload files directly to R2 without going through Vercel.
 *
 * Request body:
 * {
 *   "catalogId": "LMSY-MAG-20241023-001",
 *   "contentType": "image/webp"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "uploadUrl": "https://...",
 *   "publicUrl": "https://cdn.lmsy.space/...",
 *   "r2Path": "magazines/2024/LMSY-MAG-20241023-001.webp",
 *   "expiresIn": 300
 * }
 */
export async function POST(request: NextRequest) {
  // Authentication check
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json(
      { error: 'Unauthorized', details: authResult.error },
      { status: 401 }
    );
  }

  const adminEmail = getAdminEmail();
  if (authResult.user.email !== adminEmail) {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { catalogId, contentType } = body;

    if (!catalogId) {
      return NextResponse.json(
        { error: 'catalogId is required' },
        { status: 400 }
      );
    }

    if (!contentType) {
      return NextResponse.json(
        { error: 'contentType is required' },
        { status: 400 }
      );
    }

    // Only allow image content types (SVG is deliberately excluded).
    if (!isAllowedMimeType(contentType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported content type. Allowed: ${UPLOAD_POLICY.allowedMimeTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get R2 configuration
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME || 'lmsy-archive';
    const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.lmsy.space';

    // Validate configuration
    const missingVars = [];
    if (!endpoint) missingVars.push('R2_ENDPOINT');
    if (!accessKeyId) missingVars.push('R2_ACCESS_KEY_ID');
    if (!secretAccessKey) missingVars.push('R2_SECRET_ACCESS_KEY');

    if (missingVars.length > 0) {
      console.error('[R2_SIGN] Missing environment variables:', missingVars.join(', '));
      return apiServerError('admin/r2/sign');
    }

    // Initialize R2 S3 client with proper type assertions
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint!,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });

    // R2 path comes from the shared helper so the layout stays
    // <person>/<door>/<year>/ everywhere (canonical naming spec section 7).
    if (!isValidCatalogId(catalogId)) {
      return NextResponse.json(
        {
          error: 'Invalid catalog ID format',
          expected: '<PERSON>-<DOOR>-<SUBJECT>[-<THEME>]-<YYYYMMDD>-<NNN>',
          example: 'LMSY-MAG-THER-HEARTBEATFORYOU-20250801-001',
          catalogId,
        },
        { status: 400 }
      );
    }

    const parsed = parseCatalogId(catalogId);
    const year = parsed?.date ? parsed.date.substring(0, 4) : new Date().getFullYear().toString();
    const r2Path = getR2PathForCatalogId(catalogId);

    // The key must stay inside the expected upload prefix.
    const keyValidation = validateObjectKey(r2Path, ALLOWED_R2_PREFIXES);
    if (!keyValidation.ok) {
      return NextResponse.json(
        { success: false, error: keyValidation.error },
        { status: keyValidation.status }
      );
    }

    console.log('[R2_SIGN] 🔑 Generating presigned URL:', {
      catalogId,
      r2Path,
      contentType,
      bucket: bucketName,
    });

    // Create PutObject command for presigned URL.
    // ContentLength pins the maximum accepted body so R2 rejects larger uploads.
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Path,
      ContentType: contentType,
      ContentLength: UPLOAD_POLICY.maxFileSizeBytes,
      // Add metadata for debugging
      Metadata: {
        'catalog-id': catalogId,
        'uploaded-by': authResult.user.email!,
        'uploaded-at': new Date().toISOString(),
      },
    });

    // Generate presigned URL (valid for 5 minutes)
    const expiresIn = 300; // 5 minutes

    console.log('[R2_SIGN] Generating presigned URL with config:', {
      bucket: bucketName,
      r2Path,
      endpoint: endpoint!.substring(0, 50) + '...',
      region: 'auto',
      expiresIn,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    console.log('[R2_SIGN] Presigned URL generated:', {
      catalogId,
      expiresIn: `${expiresIn}s`,
      urlHost: new URL(uploadUrl).hostname,
    });

    // Return presigned URL and public CDN URL
    return NextResponse.json({
      success: true,
      uploadUrl,
      publicUrl: `${cdnUrl}/${r2Path}`,
      r2Path,
      expiresIn,
    });

  } catch (error) {
    return apiServerError('admin/r2/sign', error);
  }
}

/**
 * GET - Get R2 configuration status (for debugging)
 */
export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const adminEmail = getAdminEmail();
  if (authResult.user.email !== adminEmail) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;

  return NextResponse.json({
    configured: !!(endpoint && accessKeyId && secretAccessKey),
    config: {
      hasEndpoint: !!endpoint,
      hasAccessKeyId: !!accessKeyId,
      hasSecretAccessKey: !!secretAccessKey,
      hasBucketName: !!bucketName,
      hasCdnUrl: !!cdnUrl,
      bucket: bucketName || 'lmsy-archive',
      cdn: cdnUrl || 'https://cdn.lmsy.space',
    },
  });
}
