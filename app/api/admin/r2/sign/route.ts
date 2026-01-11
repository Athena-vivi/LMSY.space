import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
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
      console.error('[R2_SIGN] ❌ Missing environment variables:', missingVars);
      return NextResponse.json(
        {
          error: 'R2 configuration incomplete',
          missingVars,
          bucket: bucketName,
        },
        { status: 500 }
      );
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

    // Generate R2 path from catalog ID
    // Parse catalog ID to extract year: LMSY-MAG-20241023-001
    const catalogMatch = catalogId.match(/^LMSY-[A-Z]+-(\d{4})\d{4}-\d{3}$/);
    if (!catalogMatch) {
      return NextResponse.json(
        { error: 'Invalid catalog ID format', catalogId },
        { status: 400 }
      );
    }

    const year = catalogMatch[1];
    const r2Path = `magazines/${year}/${catalogId}.webp`;

    console.log('[R2_SIGN] 🔑 Generating presigned URL:', {
      catalogId,
      r2Path,
      contentType,
      bucket: bucketName,
    });

    // Create PutObject command for presigned URL
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Path,
      ContentType: contentType,
      // Add metadata for debugging
      Metadata: {
        'catalog-id': catalogId,
        'uploaded-by': authResult.user.email!,
        'uploaded-at': new Date().toISOString(),
      },
    });

    // Generate presigned URL (valid for 5 minutes)
    const expiresIn = 300; // 5 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    console.log('[R2_SIGN] ✅ Presigned URL generated successfully:', {
      catalogId,
      expiresIn: `${expiresIn}s`,
      urlPreview: uploadUrl.substring(0, 100) + '...',
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
    console.error('[R2_SIGN] ❌ Error generating presigned URL:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate presigned URL',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
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

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
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
