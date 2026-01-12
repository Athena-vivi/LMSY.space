/**
 * EMERGENCY SCRIPT: Sync R2 files to database
 *
 * Scans R2 path magazines/2024/ and inserts missing records into lmsy_archive.gallery
 *
 * Usage:
 *   npx tsx scripts/sync-r2-to-db.ts
 */

import { listR2Objects, getCdnUrl } from '../lib/r2-client';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface R2Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
}

/**
 * Parse catalog ID from R2 key
 * Expected format: magazines/2024/LMSY-XXX-YYYYMMDD-###.webp
 */
function parseCatalogIdFromKey(key: string): string | null {
  // Extract filename from path
  const filename = key.split('/').pop();
  if (!filename) return null;

  // Remove .webp extension
  const catalogId = filename.replace(/\.webp$/, '');
  return catalogId;
}

/**
 * Parse event date from catalog ID
 * Expected format: LMSY-XXX-YYYYMMDD-###
 */
function parseEventDateFromCatalogId(catalogId: string): string | null {
  // Match YYYYMMDD in catalog ID
  const match = catalogId.match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;

  const [, year, month, day] = match;
  return `${year}-${month}-${day}`;
}

/**
 * Check if record already exists in database
 */
async function recordExists(imageUrl: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('gallery')
    .select('id')
    .eq('image_url', imageUrl)
    .limit(1)
    .maybeSingle();

  return !error && !!data;
}

/**
 * Main sync function
 */
async function syncR2ToDatabase() {
  console.log('[SYNC_R2_DB] 🚀 Starting emergency sync from R2 to database...');
  console.log('[SYNC_R2_DB] 🔍 Scanning R2 path: magazines/2024/');

  // Step 1: List all objects in R2
  const r2Result = await listR2Objects('magazines/2024/');

  if (!r2Result.success || !r2Result.objects) {
    console.error('[SYNC_R2_DB] ❌ Failed to list R2 objects:', r2Result.error);
    return;
  }

  console.log(`[SYNC_R2_DB] ✅ Found ${r2Result.objects.length} files in R2`);

  // Step 2: Process each file
  const results = {
    total: r2Result.objects.length,
    inserted: 0,
    skipped: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const obj of r2Result.objects) {
    const catalogId = parseCatalogIdFromKey(obj.key);

    if (!catalogId) {
      console.warn(`[SYNC_R2_DB] ⚠️ Skipped (invalid format): ${obj.key}`);
      results.skipped++;
      continue;
    }

    // Build CDN URL
    const eventDate = parseEventDateFromCatalogId(catalogId);

    // Check if already exists (by relative path)
    const exists = await recordExists(obj.key);

    if (exists) {
      console.log(`[SYNC_R2_DB] ⊙ Already exists: ${catalogId}`);
      results.skipped++;
      continue;
    }

    // Insert into database
    try {
      const { data, error } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .insert({
          image_url: obj.key, // Store relative path
          catalog_id: catalogId,
          event_date: eventDate,
          caption: null,
          tag: null,
          is_featured: catalogId.endsWith('-000'),
          is_editorial: true,
          curator_note: null,
          project_id: null, // Will be linked separately
          blur_data: null,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      console.log(`[SYNC_R2_DB] ✅ Inserted: ${catalogId} (${obj.size} bytes)`);
      results.inserted++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[SYNC_R2_DB] ❌ Failed to insert ${catalogId}:`, errorMsg);
      results.failed++;
      results.errors.push(`${catalogId}: ${errorMsg}`);
    }
  }

  // Step 3: Print summary
  console.log('\n[SYNC_R2_DB] 📊 SUMMARY:');
  console.log(`[SYNC_R2_DB] Total files:     ${results.total}`);
  console.log(`[SYNC_R2_DB] ✅ Inserted:     ${results.inserted}`);
  console.log(`[SYNC_R2_DB] ⊙ Skipped:       ${results.skipped} (already exists)`);
  console.log(`[SYNC_R2_DB] ❌ Failed:        ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n[SYNC_R2_DB] ERROR DETAILS:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log('\n[SYNC_R2_DB] ✅ Sync complete!');
}

// Run the sync
syncR2ToDatabase().catch(console.error);
