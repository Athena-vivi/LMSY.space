import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { listR2Objects, getR2ObjectMetadata } from '@/lib/r2-client';

/**
 * Duplicate Detection API
 *
 * POST /api/admin/check-duplicate - Check if file already exists in R2
 */

export async function POST(request: NextRequest) {
  try {
    // Authentication
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

    const body = await request.json();
    const { checksum, size } = body;

    if (!checksum || typeof checksum !== 'string') {
      return NextResponse.json(
        { error: 'Checksum is required' },
        { status: 400 }
      );
    }

    console.log('[DUPLICATE_CHECK] Checking for duplicate:', { checksum, size });

    // Get all R2 objects for comparison
    const r2ListResult = await listR2Objects();

    if (!r2ListResult.success || !r2ListResult.objects) {
      console.error('[DUPLICATE_CHECK] Failed to list R2 objects');
      return NextResponse.json(
        { error: 'Failed to check for duplicates' },
        { status: 500 }
      );
    }

    // Check for potential duplicates by size first (faster filter)
    const sizeMatches = size
      ? r2ListResult.objects.filter(obj => obj.size === size)
      : r2ListResult.objects;

    if (sizeMatches.length === 0) {
      console.log('[DUPLICATE_CHECK] ✅ No size matches found');
      return NextResponse.json({
        success: true,
        isDuplicate: false,
        message: 'No duplicate found',
      });
    }

    // For files with matching sizes, we would need to compute MD5/SHA-256
    // Since R2 ETag is not always reliable for checksum comparison,
    // we'll return a list of potential matches for the client to verify
    const potentialMatches = sizeMatches.map(obj => ({
      key: obj.key,
      size: obj.size,
      etag: obj.etag,
      lastModified: obj.lastModified,
    }));

    console.log('[DUPLICATE_CHECK] ⚠️ Found', potentialMatches.length, 'potential matches by size');

    return NextResponse.json({
      success: true,
      isDuplicate: potentialMatches.length > 0,
      potentialMatches,
      message: potentialMatches.length > 0
        ? `Found ${potentialMatches.length} file(s) with same size. Please verify before uploading.`
        : 'No duplicate found',
    });
  } catch (error) {
    console.error('[DUPLICATE_CHECK] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check for duplicates',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to list all objects with their sizes and ETags
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user || authResult.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (authResult.user?.email !== adminEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const r2ListResult = await listR2Objects();

    if (!r2ListResult.success || !r2ListResult.objects) {
      return NextResponse.json(
        { error: 'Failed to list objects' },
        { status: 500 }
      );
    }

    // Return all objects with their metadata for client-side comparison
    const objects = r2ListResult.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      etag: obj.etag,
      lastModified: obj.lastModified,
    }));

    return NextResponse.json({
      success: true,
      objects,
      totalBytes: objects.reduce((sum, obj) => sum + obj.size, 0),
    });
  } catch (error) {
    console.error('[DUPLICATE_LIST] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list objects',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
