import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { listR2Objects } from '@/lib/r2-client';

/**
 * Storage Usage API
 *
 * GET /api/admin/storage - Get R2 storage usage statistics
 */

const R2_FREE_LIMIT_GB = 10;
const BYTES_PER_GB = 1024 * 1024 * 1024;
const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_KB = 1024;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  if (bytes < BYTES_PER_KB) return `${bytes} B`;
  if (bytes < BYTES_PER_MB) return `${(bytes / BYTES_PER_KB).toFixed(2)} KB`;
  if (bytes < BYTES_PER_GB) return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;

  return `${(bytes / BYTES_PER_GB).toFixed(3)} GB`;
}

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user || authResult.error) {
      console.error('[STORAGE] ❌ Authentication failed:', authResult.error);
      return NextResponse.json(
        { error: 'Unauthorized', details: authResult.error },
        { status: 401 }
      );
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (authResult.user.email !== adminEmail) {
      console.error('[STORAGE] ❌ Authorization failed: Non-admin user');
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    console.log('[STORAGE] 🔍 Calculating R2 storage usage...');

    // List all objects in R2 (no prefix = all objects)
    const r2ListResult = await listR2Objects();

    if (!r2ListResult.success || !r2ListResult.objects) {
      console.error('[STORAGE] ❌ Failed to list R2 objects:', r2ListResult.error);
      return NextResponse.json(
        { error: 'Failed to list R2 objects', details: r2ListResult.error },
        { status: 500 }
      );
    }

    // Calculate total storage used
    const totalBytes = r2ListResult.objects.reduce((sum, obj) => sum + obj.size, 0);
    const totalGB = totalBytes / BYTES_PER_GB;
    const usagePercent = (totalGB / R2_FREE_LIMIT_GB) * 100;
    const remainingBytes = (R2_FREE_LIMIT_GB * BYTES_PER_GB) - totalBytes;

    // Breakdown by path prefix
    const breakdown: Record<string, { count: number; size: number }> = {};

    for (const obj of r2ListResult.objects) {
      const parts = obj.key.split('/');
      const prefix = parts.length > 1 ? `${parts[0]}/` : 'root';

      if (!breakdown[prefix]) {
        breakdown[prefix] = { count: 0, size: 0 };
      }

      breakdown[prefix].count++;
      breakdown[prefix].size += obj.size;
    }

    // Format breakdown for display
    const formattedBreakdown = Object.entries(breakdown)
      .map(([prefix, data]) => ({
        prefix,
        count: data.count,
        size: formatBytes(data.size),
        sizeBytes: data.size,
      }))
      .sort((a, b) => b.sizeBytes - a.sizeBytes);

    const response = {
      success: true,
      usage: {
        totalBytes,
        totalGB: totalGB.toFixed(3),
        totalFormatted: formatBytes(totalBytes),
        usedPercent: usagePercent.toFixed(2),
        limitGB: R2_FREE_LIMIT_GB,
        limitBytes: R2_FREE_LIMIT_GB * BYTES_PER_GB,
        remainingBytes,
        remainingGB: remainingBytes / BYTES_PER_GB,
        remainingFormatted: formatBytes(remainingBytes),
        objectCount: r2ListResult.objects.length,
        breakdown: formattedBreakdown,
      },
    };

    console.log('[STORAGE] ✅ Usage calculated:', {
      total: response.usage.totalFormatted,
      percent: response.usage.usedPercent + '%',
      remaining: response.usage.remainingFormatted,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('[STORAGE] ❌ Operation exception:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate storage usage',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
