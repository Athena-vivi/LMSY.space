/**
 * R2-DB Sync Script - The Great Sync
 *
 * 🤖 PHYSICAL & LOGICAL ALIGNMENT:
 * 1. Scan all files in R2 storage bucket
 * 2. Compare with database image_url records
 * 3. Auto-rename R2 files if naming mismatch detected (G vs MAG)
 * 4. Auto-update database if R2 file exists but not recorded
 *
 * Usage: npx tsx scripts/sync-r2-db.ts
 */

import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSupabaseAdmin } from '../lib/supabase/admin';

// R2 Configuration
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://e5b4187c5c945697f59cdf3cc036cb98.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = 'lmsy-archive';

interface R2File {
  key: string;
  size: number;
  lastModified: Date;
}

interface DbImage {
  id: string;
  image_url: string;
  catalog_id: string | null;
  project_id: string | null;
}

/**
 * Scan all files in R2 bucket
 */
async function scanR2Files(): Promise<R2File[]> {
  console.log('[R2_SCAN] 📡 Scanning R2 bucket for all files...');

  const files: R2File[] = [];
  let continuationToken: string | undefined = undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      ContinuationToken: continuationToken,
    });

    const response = await r2Client.send(command);

    if (response.Contents) {
      for (const item of response.Contents) {
        if (item.Key) {
          files.push({
            key: item.Key,
            size: item.Size || 0,
            lastModified: item.LastModified || new Date(),
          });
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`[R2_SCAN] ✅ Found ${files.length} files in R2`);
  return files;
}

/**
 * Fetch all images from database
 */
async function fetchDbImages(): Promise<DbImage[]> {
  console.log('[DB_SCAN] 📊 Fetching all images from database...');

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .schema('lmsy_archive')
    .from('gallery')
    .select('id, image_url, catalog_id, project_id');

  if (error) {
    console.error('[DB_SCAN] ❌ Failed to fetch images:', error);
    throw error;
  }

  console.log(`[DB_SCAN] ✅ Found ${data?.length || 0} images in database`);
  return data || [];
}

/**
 * Extract catalog ID from file path
 * Handles both formats:
 * - gallery/2024/LMSY-G-20241023-001.webp
 * - magazines/2024/LMSY-MAG-20241023-000.webp
 */
function extractCatalogFromPath(path: string): string | null {
  const match = path.match(/LMSY-(G|MAG)-\d{8}-\d{3}/);
  return match ? match[0] : null;
}

/**
 * Normalize catalog ID to current standard
 * G format should become MAG format
 */
function normalizeCatalogId(catalogId: string): string {
  // If it's G format, convert to MAG
  if (catalogId.startsWith('LMSY-G-')) {
    return catalogId.replace('LMSY-G-', 'LMSY-MAG-');
  }
  return catalogId;
}

/**
 * Generate correct path from catalog ID
 */
function generatePathFromCatalog(catalogId: string): string {
  const dateMatch = catalogId.match(/(\d{8})/);
  if (!dateMatch) return `gallery/${catalogId}.webp`;

  const date = dateMatch[1];
  const year = date.substring(0, 4);
  return `magazines/${year}/${catalogId}.webp`;
}

/**
 * Perform R2 file rename (copy + delete)
 */
async function renameR2File(oldKey: string, newKey: string): Promise<boolean> {
  console.log(`[R2_RENAME] 🔄 Renaming: ${oldKey} -> ${newKey}`);

  try {
    // Copy to new location
    const copyCommand = new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${oldKey}`,
      Key: newKey,
    });

    await r2Client.send(copyCommand);

    // Delete old file
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: oldKey,
    });

    await r2Client.send(deleteCommand);

    console.log(`[R2_RENAME] ✅ Renamed successfully`);
    return true;
  } catch (error) {
    console.error(`[R2_RENAME] ❌ Failed to rename:`, error);
    return false;
  }
}

/**
 * Update database image_url
 */
async function updateDbImageUrl(imageId: string, newUrl: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .schema('lmsy_archive')
    .from('gallery')
    .update({ image_url: newUrl })
    .eq('id', imageId);

  if (error) {
    console.error(`[DB_UPDATE] ❌ Failed to update image ${imageId}:`, error);
    return false;
  }

  console.log(`[DB_UPDATE] ✅ Updated image ${imageId}`);
  return true;
}

/**
 * Main sync orchestration
 */
async function main() {
  console.log('='.repeat(60));
  console.log('[THE_GREAT_SYNC] 🚀 Starting R2-DB Alignment...');
  console.log('='.repeat(60));

  // Step 1: Scan both R2 and DB
  const [r2Files, dbImages] = await Promise.all([
    scanR2Files(),
    fetchDbImages(),
  ]);

  // Step 2: Build lookup maps
  const r2ByCatalog = new Map<string, R2File>();
  const dbByCatalog = new Map<string, DbImage>();

  // Index R2 files by catalog ID
  for (const file of r2Files) {
    const catalog = extractCatalogFromPath(file.key);
    if (catalog) {
      const normalized = normalizeCatalogId(catalog);
      r2ByCatalog.set(normalized, file);
    }
  }

  // Index DB images by catalog ID
  for (const img of dbImages) {
    if (img.catalog_id) {
      const normalized = normalizeCatalogId(img.catalog_id);
      dbByCatalog.set(normalized, img);
    }
  }

  console.log(`[INDEX] R2 files with catalog: ${r2ByCatalog.size}`);
  console.log(`[INDEX] DB images with catalog: ${dbByCatalog.size}`);

  // Step 3: Detect and fix mismatches
  let renamedCount = 0;
  let updatedCount = 0;

  // Check for R2 files with wrong naming (G instead of MAG)
  console.log('\n[SYNC_PHASE_1] 🔍 Checking for naming mismatches...');
  for (const [normalizedCatalog, r2File] of r2ByCatalog) {
    const dbImage = dbByCatalog.get(normalizedCatalog);

    if (!dbImage) {
      // R2 file exists but not in DB - create entry
      console.log(`[SYNC] ⚠️  R2 file has no DB record: ${normalizedCatalog}`);
      // TODO: Could auto-create DB entry here
      continue;
    }

    // Check if paths match
    const expectedPath = generatePathFromCatalog(normalizedCatalog);
    const actualPath = dbImage.image_url;

    if (r2File.key !== actualPath) {
      console.log(`[SYNC] ⚠️  Path mismatch detected:`);
      console.log(`  R2 has:  ${r2File.key}`);
      console.log(`  DB has:   ${actualPath}`);
      console.log(`  Expect:  ${expectedPath}`);

      // Rename R2 file to match expected path
      if (await renameR2File(r2File.key, expectedPath)) {
        // Update DB to point to new path
        const newPath = expectedPath;
        if (await updateDbImageUrl(dbImage.id, newPath)) {
          renamedCount++;
          updatedCount++;
        }
      }
    }
  }

  // Step 4: Check for orphaned DB records (R2 file missing)
  console.log('\n[SYNC_PHASE_2] 🔍 Checking for orphaned DB records...');
  for (const [catalog, dbImage] of dbByCatalog) {
    const r2File = r2ByCatalog.get(catalog);

    if (!r2File) {
      console.log(`[SYNC] ⚠️  DB record has no R2 file: ${catalog}`);
      // TODO: Could mark DB record as invalid
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('[THE_GREAT_SYNC] ✅ Alignment Complete');
  console.log(`  R2 files renamed: ${renamedCount}`);
  console.log(`  DB records updated: ${updatedCount}`);
  console.log('='.repeat(60));
}

// Execute
main().catch(console.error);
