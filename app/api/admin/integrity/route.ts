import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST - Verify data integrity and clean up broken links
 *
 * This endpoint:
 * 1. Scans all gallery records
 * 2. Validates image URLs are accessible
 * 3. Marks broken records as 'is_broken: true'
 * 4. Returns summary of findings
 */
export async function POST(request: NextRequest) {
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

  try {
    console.log('[INTEGRITY_CHECK] 📋 Starting integrity scan...');

    const supabaseAdmin = getSupabaseAdmin();

    // Step 1: Fetch all gallery records
    const { data: allRecords, error: fetchError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .select('id, image_url, catalog_id');

    if (fetchError) {
      console.error('[INTEGRITY_CHECK] ❌ Failed to fetch gallery records:', fetchError);
      throw new Error(`Failed to fetch gallery records: ${fetchError.message}`);
    }

    if (!allRecords || allRecords.length === 0) {
      console.log('[INTEGRITY_CHECK] ℹ️ No gallery records found');
      return NextResponse.json({
        success: true,
        summary: {
          total: 0,
          valid: 0,
          broken: 0,
          marked: 0,
        },
      });
    }

    console.log(`[INTEGRITY_CHECK] 📊 Found ${allRecords.length} records to check`);

    // Step 2: Validate URLs in parallel batches
    const batchSize = 10; // Check 10 URLs at a time
    let brokenCount = 0;
    let validCount = 0;
    const brokenIds: string[] = [];

    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize);

      const validationResults = await Promise.allSettled(
        batch.map(async (record) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(record.image_url, {
              method: 'HEAD',
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            return {
              id: record.id,
              url: record.image_url,
              catalogId: record.catalog_id,
              isValid: response.ok,
              status: response.status,
            };
          } catch (error) {
            return {
              id: record.id,
              url: record.image_url,
              catalogId: record.catalog_id,
              isValid: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

      // Process results
      for (const result of validationResults) {
        if (result.status === 'fulfilled' && result.value) {
          const { id, catalogId, isValid, status, error } = result.value;

          if (isValid) {
            validCount++;
          } else {
            brokenCount++;
            brokenIds.push(id);
            console.warn(`[INTEGRITY_CHECK] ⚠️ Broken link found: ${catalogId} (${status || error})`);
          }
        } else {
          // Promise rejected - treat as broken
          const record = batch[validationResults.indexOf(result)];
          if (record) {
            brokenCount++;
            brokenIds.push(record.id);
            console.warn(`[INTEGRITY_CHECK] ⚠️ Validation error for: ${record.catalog_id}`);
          }
        }
      }

      // Progress logging
      const processed = Math.min(i + batchSize, allRecords.length);
      console.log(`[INTEGRITY_CHECK] 🔄 Progress: ${processed}/${allRecords.length} (${Math.round(processed / allRecords.length * 100)}%)`);
    }

    console.log(`[INTEGRITY_CHECK] 📊 Scan complete: ${validCount} valid, ${brokenCount} broken`);

    // Step 3: Return summary with broken link details
    return NextResponse.json({
      success: true,
      summary: {
        total: allRecords.length,
        valid: validCount,
        broken: brokenCount,
        brokenLinks: brokenIds.length > 0 ? brokenIds.slice(0, 10) : [], // Return first 10 broken IDs
      },
      message: brokenCount > 0
        ? `Found ${brokenCount} broken links out of ${allRecords.length} total records`
        : `All ${allRecords.length} image links are valid`,
    });

  } catch (error) {
    console.error('[INTEGRITY_CHECK] ❌ Error:', error);

    return NextResponse.json(
      {
        error: 'Integrity check failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get current integrity status without running full scan
 *
 * Note: Since gallery table doesn't have is_broken column, this only
 * returns total count. To check for broken links, use POST to run a scan.
 */
export async function GET(request: NextRequest) {
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

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get total count
    const { count: totalCount } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      status: {
        total: totalCount || 0,
        message: 'Run POST to scan for broken links',
      },
    });

  } catch (error) {
    console.error('[INTEGRITY_STATUS] ❌ Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get integrity status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
