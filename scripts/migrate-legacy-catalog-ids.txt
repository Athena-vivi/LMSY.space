/**
 * Legacy Catalog ID Migration Script
 *
 * Migrates existing catalog IDs from old format to new Astra 馆长档案标准
 *
 * Old format: LMSY-G-2024-001
 * New format: LMSY-G-20240101-001
 *
 * This script:
 * 1. Fetches all legacy catalog IDs from database
 * 2. Parses legacy IDs to extract year and sequence
 * 3. Generates new catalog IDs using event_date
 * 4. Updates database records
 * 5. Renames R2 files (requires manual execution or R2 API calls)
 *
 * Prerequisites:
 * - Run in Node.js environment with Supabase admin access
 * - Backup database before running
 * - Test on staging environment first
 *
 * Usage:
 *   tsx scripts/migrate-legacy-catalog-ids.ts [--dry-run] [--table=gallery|projects]
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { parseLegacyCatalogId, generateCatalogId, getR2PathForCatalogId } from '@/lib/catalog-id';
import { listR2Objects, renameR2Object, deleteR2Object } from '@/lib/r2-client';

interface MigrationResult {
  table: string;
  total_records: number;
  legacy_ids: number;
  migrated: number;
  failed: number;
  errors: Array<{ id: string; catalog_id: string; error: string }>;
  dry_run: boolean;
}

/**
 * Migrate catalog IDs for a specific table
 */
async function migrateTable(
  tableName: 'gallery' | 'projects',
  dryRun: boolean = true
): Promise<MigrationResult> {
  const supabaseAdmin = getSupabaseAdmin();
  const result: MigrationResult = {
    table: tableName,
    total_records: 0,
    legacy_ids: 0,
    migrated: 0,
    failed: 0,
    errors: [],
    dry_run: dryRun,
  };

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Migrating ${tableName} table...`);

  try {
    // Fetch all records with catalog_ids
    const { data: records, error: fetchError } = await supabaseAdmin
      .from(tableName)
      .select('id, catalog_id, event_date, created_at')
      .not('catalog_id', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch records: ${fetchError.message}`);
    }

    result.total_records = records?.length || 0;
    console.log(`Found ${result.total_records} records with catalog_ids`);

    if (!records || records.length === 0) {
      return result;
    }

    // Process each record
    for (const record of records) {
      const { id, catalog_id, event_date, created_at } = record;

      // Check if it's a legacy format
      if (!catalog_id || !catalog_id.match(/^LMSY-[A-Z]+-\d{4}-\d{3}$/)) {
        continue; // Skip new format or null
      }

      result.legacy_ids++;
      console.log(`\nProcessing: ${catalog_id}`);

      try {
        // Parse legacy catalog ID
        const parsed = parseLegacyCatalogId(catalog_id);
        if (!parsed) {
          throw new Error('Failed to parse legacy catalog ID');
        }

        // Determine date for new catalog ID
        let migrationDate: string;

        if (event_date) {
          // Use existing event_date
          migrationDate = event_date;
          console.log(`  Using event_date: ${migrationDate}`);
        } else {
          // Fallback to created_at date (extract YYYY-MM-DD)
          migrationDate = new Date(created_at).toISOString().split('T')[0];
          console.log(`  Using created_at: ${migrationDate}`);
        }

        // Generate new catalog ID
        const category = parsed.type === 'ED' ? 'MAG' : (parsed.type as 'G' | 'P');
        const newCatalogId = generateCatalogId({
          category,
          eventDate: migrationDate,
          sequence: parsed.sequence,
        });

        console.log(`  New ID: ${newCatalogId}`);

        if (dryRun) {
          console.log(`  [DRY RUN] Would update: ${catalog_id} → ${newCatalogId}`);
          result.migrated++;
        } else {
          // Update database record
          const { error: updateError } = await supabaseAdmin
            .from(tableName)
            .update({ catalog_id: newCatalogId })
            .eq('id', id);

          if (updateError) {
            throw new Error(`Failed to update: ${updateError.message}`);
          }

          console.log(`  ✓ Updated: ${catalog_id} → ${newCatalogId}`);
          result.migrated++;

          // R2 migration would happen separately
          // See migrateR2Files() function below
        }
      } catch (err: any) {
        const error = err.message || 'Unknown error';
        console.error(`  ✗ Failed: ${error}`);
        result.failed++;
        result.errors.push({
          id,
          catalog_id,
          error,
        });
      }
    }

    console.log(`\n${tableName} migration summary:`);
    console.log(`  Legacy IDs found: ${result.legacy_ids}`);
    console.log(`  Migrated: ${result.migrated}`);
    console.log(`  Failed: ${result.failed}`);

  } catch (err: any) {
    console.error(`Fatal error migrating ${tableName}:`, err);
    result.errors.push({
      id: 'ALL',
      catalog_id: 'ALL',
      error: err.message || 'Unknown fatal error',
    });
  }

  return result;
}

/**
 * Get R2 migration commands
 * This generates a list of commands to rename R2 files
 *
 * Note: AWS S3 SDK doesn't have a direct "rename" operation.
 * You need to copy to new location then delete old.
 */
async function getR2MigrationCommands(dryRun: boolean = true): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Generating R2 migration commands...`);

  // Fetch all records to get old and new catalog IDs
  const { data: galleryRecords } = await supabaseAdmin
    .from('gallery')
    .select('catalog_id, image_url');

  const { data: projectRecords } = await supabaseAdmin
    .from('projects')
    .select('catalog_id, cover_url');

  const allRecords = [
    ...(galleryRecords?.map(r => ({ catalog_id: r.catalog_id, url: r.image_url })) || []),
    ...(projectRecords?.map(r => ({ catalog_id: r.catalog_id, url: r.cover_url })) || []),
  ];

  const commands: string[] = [];

  for (const record of allRecords) {
    if (!record.catalog_id) continue;

    const isLegacy = record.catalog_id.match(/^LMSY-[A-Z]+-\d{4}-\d{3}$/);
    if (!isLegacy) continue;

    // Extract old path from URL
    const urlParts = record.url.split('/');
    const oldFilename = urlParts[urlParts.length - 1];
    const oldPath = `gallery/${oldFilename}`; // Adjust path as needed

    // Generate new path
    const newPath = getR2PathForCatalogId(record.catalog_id);

    if (oldPath !== newPath) {
      commands.push(`# ${record.catalog_id}`);
      commands.push(`# OLD: ${oldPath}`);
      commands.push(`# NEW: ${newPath}`);
      commands.push(`aws s3 cp s3://lmsy-archive/${oldPath} s3://lmsy-archive/${newPath} --endpoint YOUR_R2_ENDPOINT`);
      commands.push(`aws s3 rm s3://lmsy-archive/${oldPath} --endpoint YOUR_R2_ENDPOINT`);
      commands.push('');
    }
  }

  if (dryRun) {
    console.log('\n=== R2 Migration Commands ===\n');
    console.log(commands.join('\n'));
    console.log('\n=== End of Commands ===');
    console.log('\nTo execute R2 migration:');
    console.log('1. Save commands to a file: migrate-r2.sh');
    console.log('2. Replace YOUR_R2_ENDPOINT with actual R2 endpoint');
    console.log('3. Run: bash migrate-r2.sh');
  }
}

/**
 * Main migration function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--no-dry-run');
  const tableArg = args.find(arg => arg.startsWith('--table='));
  const table = tableArg ? tableArg.split('=')[1] as 'gallery' | 'projects' : null;

  console.log('='.repeat(60));
  console.log('Legacy Catalog ID Migration');
  console.log('Astra 馆长档案标准');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify data)'}`);
  console.log(`Table: ${table || 'ALL'}`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made');
    console.log('To run live migration, use: --no-dry-run\n');
  } else {
    console.log('\n⚠️  LIVE MODE - This will modify database records!');
    console.log('Make sure you have a backup!\n');
  }

  // Migrate tables
  const results: MigrationResult[] = [];

  if (!table || table === 'gallery') {
    results.push(await migrateTable('gallery', dryRun));
  }

  if (!table || table === 'projects') {
    results.push(await migrateTable('projects', dryRun));
  }

  // Generate R2 migration commands
  await getR2MigrationCommands(dryRun);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));

  let totalLegacy = 0;
  let totalMigrated = 0;
  let totalFailed = 0;

  for (const result of results) {
    console.log(`\n${result.table}:`);
    console.log(`  Total records: ${result.total_records}`);
    console.log(`  Legacy IDs: ${result.legacy_ids}`);
    console.log(`  Migrated: ${result.migrated}`);
    console.log(`  Failed: ${result.failed}`);

    totalLegacy += result.legacy_ids;
    totalMigrated += result.migrated;
    totalFailed += result.failed;
  }

  console.log(`\nTOTAL:`);
  console.log(`  Legacy IDs: ${totalLegacy}`);
  console.log(`  Migrated: ${totalMigrated}`);
  console.log(`  Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.log('\n⚠️  Some migrations failed. Check errors above.');
    process.exit(1);
  }

  console.log('\n✓ Migration complete!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { migrateTable, getR2MigrationCommands };
