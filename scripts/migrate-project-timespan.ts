/**
 * PROJECT TIME SPAN MIGRATION
 *
 * 🕐 Transform projects from "points" to "containers"
 * Adds start_date, end_date, is_ongoing fields
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateProjectTimeSpan() {
  console.log('[TIMESPAN_MIGRATION] 🕐 Transforming projects into chronological containers...');

  // Step 1: Add new columns
  console.log('\n[STEP 1] Adding time span columns...');

  const alterStatements = [
    `ALTER TABLE lmsy_archive.projects
     ADD COLUMN IF NOT EXISTS start_date DATE,
     ADD COLUMN IF NOT EXISTS end_date DATE,
     ADD COLUMN IF NOT EXISTS is_ongoing BOOLEAN DEFAULT false;`
  ];

  for (const sql of alterStatements) {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
      if (error) {
        // Supabase doesn't support raw SQL via RPC, use migration file approach
        console.log('  ⚠️  Note: SQL ALTER should be run via Supabase dashboard or migration file');
        console.log(`  SQL: ${sql}`);
      }
    } catch {
      // Ignore
    }
  }

  // Step 2: Fetch current projects
  const { data: projects, error } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('id, title, release_date, category');

  if (error || !projects) {
    console.error('❌ Failed to fetch projects:', error);
    return;
  }

  console.log(`\n[STEP 2] Found ${projects.length} projects`);

  // Step 3: Update projects with time span defaults
  console.log('\n[STEP 3] Setting default time spans...');

  for (const project of projects) {
    // For editorial projects, set start_date to release_date
    // For ongoing series like Affair, set wider ranges
    let startDate: string | null = null;
    let endDate: string | null = null;
    let isOngoing = false;

    if (project.title.toLowerCase().includes('affair')) {
      // Affair: Multi-year project
      startDate = '2024-01-01';
      endDate = '2025-12-31';
      isOngoing = true;
    } else if (project.release_date) {
      // Default: Single day event, span = that day
      startDate = project.release_date;
      endDate = project.release_date;
    }

    if (startDate) {
      const { error: updateError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .update({
          start_date: startDate,
          end_date: endDate,
          is_ongoing: isOngoing,
        })
        .eq('id', project.id);

      if (updateError) {
        console.error(`  ❌ Failed to update ${project.title}:`, updateError.message);
      } else {
        console.log(`  ✅ ${project.title}: ${startDate} → ${endDate}${isOngoing ? ' (ongoing)' : ''}`);
      }
    }
  }

  console.log('\n[TIMESPAN_MIGRATION] ✅ Migration complete!');
  console.log('\n⚠️  IMPORTANT: Run these ALTER statements in Supabase SQL Editor:');
  console.log(`
ALTER TABLE lmsy_archive.projects
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS is_ongoing BOOLEAN DEFAULT false;
  `);
}

migrateProjectTimeSpan().catch(console.error);
