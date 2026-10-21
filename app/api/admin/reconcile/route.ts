import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { listR2Objects, BASE_CDN_URL } from '@/lib/r2-client';
import { generateBlurData } from '@/lib/image-processing';
import { getAdminEmail } from '@/lib/security/api-auth';

/**
 * R2 prefixes that hold archive assets.
 * Canonical layout is <person>/<door>/<year>/ (naming spec section 7);
 * 'magazines/' is the legacy layout kept until the old objects are retired.
 * Scanning only one of them used to report every file in the other as orphaned.
 */
const ASSET_R2_PREFIXES = ['lmsy/', 'lm/', 'sy/', 'magazines/'];

async function listAllAssetObjects() {
  const merged = new Map<string, { key: string; size: number; lastModified: Date; etag: string }>();
  for (const prefix of ASSET_R2_PREFIXES) {
    const result = await listR2Objects(prefix);
    if (!result.success || !result.objects) {
      return { success: false as const, error: `${prefix}: ${result.error}` };
    }
    for (const obj of result.objects) merged.set(obj.key, obj);
  }
  return { success: true as const, objects: [...merged.values()] };
}

/**
 * Manual Reconciliation API
 *
 * POST /api/admin/reconcile - Scan R2 and backfill missing database records
 */

interface ReconcileResult {
  catalogId: string;
  r2Path: string;
  imageUrl: string;
  status: 'created' | 'exists' | 'error';
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user || authResult.error) {
      console.error('[RECONCILE] ❌ Authentication failed:', authResult.error);
      return NextResponse.json(
        { error: 'Unauthorized', details: authResult.error },
        { status: 401 }
      );
    }

    const adminEmail = getAdminEmail();
    if (authResult.user.email?.toLowerCase() !== adminEmail) {
      console.error('[RECONCILE] ❌ Authorization failed: Non-admin user');
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    console.log('[RECONCILE] 🔍 Starting manual reconciliation...');

    const supabaseAdmin = getSupabaseAdmin();
    const results: ReconcileResult[] = [];
    const errors: string[] = [];

    // Step 1: Get all existing catalog IDs from database.
    // Phase 3 fix: this used to read the legacy `gallery` table (0 rows), so
    // the dedupe set was always empty and everything was treated as missing.
    // gallery_assets is the live asset table (ADR-001 D2).
    const { data: existingRecords, error: fetchError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('catalog_id, image_url');

    if (fetchError) {
      console.error('[RECONCILE] ❌ Failed to fetch existing records:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch existing records', details: fetchError.message },
        { status: 500 }
      );
    }

    const existingCatalogIds = new Set(
      (existingRecords || []).map(r => r.catalog_id)
    );
    const existingImageUrls = new Set(
      (existingRecords || []).map(r => r.image_url)
    );

    console.log('[RECONCILE] Found', existingCatalogIds.size, 'existing records in database');

    // Step 2: List all archive objects (canonical + legacy directories)
    const r2ListResult = await listAllAssetObjects();

    if (!r2ListResult.success || !r2ListResult.objects) {
      console.error('[RECONCILE] ❌ Failed to list R2 objects:', r2ListResult.error);
      return NextResponse.json(
        { error: 'Failed to list R2 objects', details: r2ListResult.error },
        { status: 500 }
      );
    }

    console.log('[RECONCILE] Found', r2ListResult.objects.length, 'objects in R2');

    // Step 3: Process each R2 object
    for (const obj of r2ListResult.objects) {
      const r2Path = obj.key;
      const filename = r2Path.split('/').pop() || '';

      // Extract catalog ID from filename (e.g., LMSY-G-20241023-001.webp)
      const catalogMatch = filename.match(/^(LMSY-[A-Z]+-\d{8}-\d{3})\.webp$/);

      if (!catalogMatch) {
        console.log('[RECONCILE] ⚠️ Skipping non-standard filename:', filename);
        continue;
      }

      const catalogId = catalogMatch[1];
      const imageUrl = `${BASE_CDN_URL}/${r2Path}`;

      // Extract date from catalog ID for event_date
      const dateMatch = catalogId.match(/(\d{8})/);
      const eventDate = dateMatch
        ? `${dateMatch[1].substring(0, 4)}-${dateMatch[1].substring(4, 6)}-${dateMatch[1].substring(6, 8)}`
        : new Date().toISOString().split('T')[0];

      const result: ReconcileResult = {
        catalogId,
        r2Path,
        imageUrl,
        status: 'exists',
      };

      // Skip if already in database (by catalog id OR by image url — the same
      // file can exist under a different catalog id, and catalog_id is
      // nullable, so the url check prevents duplicate assets).
      if (existingCatalogIds.has(catalogId) || existingImageUrls.has(imageUrl)) {
        console.log('[RECONCILE] ⊙ Already exists:', catalogId);
        results.push(result);
        continue;
      }

      // Step 4: Generate blur data (optional, may fail)
      let blurData: string | null = null;
      try {
        // Fetch image for blur generation
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const blob = await imageResponse.blob();
          const file = new File([blob], filename, { type: 'image/webp' });
          blurData = await generateBlurData(file);
        }
      } catch (blurError) {
        console.warn('[RECONCILE] ⚠️ Blur generation failed for', catalogId);
        blurData = null;
      }

      // Step 5: Insert into database. Phase 3 fix: target gallery_assets
      // (the live asset table), not the legacy 0-row `gallery` table. All
      // inserted columns exist on gallery_assets.
      try {
        const { data: insertData, error: insertError } = await supabaseAdmin
          .schema('lmsy_archive')
          .from('gallery_assets')
          .insert({
            image_url: imageUrl,
            caption: null,
            tag: null,
            is_featured: false,
            catalog_id: catalogId,
            is_editorial: true, // Assume editorial for magazines
            curator_note: '[RECONCILED] Backfilled from R2 scan',
            blur_data: blurData,
            event_date: eventDate,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        if (!insertData) {
          throw new Error('Insert returned no data');
        }

        result.status = 'created';
        console.log('[RECONCILE] ✅ Created record:', catalogId);
      } catch (error) {
        result.status = 'error';
        result.error = error instanceof Error ? error.message : String(error);
        console.error('[RECONCILE] ❌ Failed to create record:', catalogId, error);
      }

      results.push(result);
    }

    // Summary
    const created = results.filter(r => r.status === 'created').length;
    const exists = results.filter(r => r.status === 'exists').length;
    const errored = results.filter(r => r.status === 'error').length;

    console.log('[RECONCILE] ✅ Reconciliation complete:', {
      total: results.length,
      created,
      exists,
      errored,
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        created,
        exists,
        errored,
      },
      results,
    });
  } catch (error) {
    console.error('[RECONCILE] ❌ Operation exception:', error);
    return NextResponse.json(
      {
        error: 'Reconciliation failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to preview reconciliation without making changes
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user || authResult.error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminEmail = getAdminEmail();
    if (authResult.user?.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    console.log('[RECONCILE] 🔍 Preview mode - listing R2 objects...');

    const supabaseAdmin = getSupabaseAdmin();

    // Get existing catalog IDs. Phase 3 fix: gallery_assets is the live
    // asset table; the legacy `gallery` table has 0 rows and made every
    // object look missing in preview.
    const { data: existingRecords } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('catalog_id');

    const existingCatalogIds = new Set(
      (existingRecords || []).map(r => r.catalog_id)
    );

    // List R2 objects (canonical + legacy directories)
    const r2ListResult = await listAllAssetObjects();

    if (!r2ListResult.success || !r2ListResult.objects) {
      return NextResponse.json(
        { error: 'Failed to list R2 objects', details: r2ListResult.error },
        { status: 500 }
      );
    }

    // Classify objects
    const toCreate: string[] = [];
    const exists: string[] = [];
    const invalid: string[] = [];

    for (const obj of r2ListResult.objects) {
      const filename = obj.key.split('/').pop() || '';
      const catalogMatch = filename.match(/^(LMSY-[A-Z]+-\d{8}-\d{3})\.webp$/);

      if (!catalogMatch) {
        invalid.push(filename);
        continue;
      }

      const catalogId = catalogMatch[1];

      if (existingCatalogIds.has(catalogId)) {
        exists.push(catalogId);
      } else {
        toCreate.push(catalogId);
      }
    }

    return NextResponse.json({
      preview: {
        total: r2ListResult.objects.length,
        toCreate: toCreate.length,
        exists: exists.length,
        invalid: invalid.length,
      },
      toCreate,
      exists,
      invalid,
    });
  } catch (error) {
    console.error('[RECONCILE] Preview error:', error);
    return NextResponse.json(
      {
        error: 'Preview failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
