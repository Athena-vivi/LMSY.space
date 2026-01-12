/**
 * UPDATE ALL PROJECT TIME SPANS
 *
 * 🕐 Set time span fields for all projects
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateAllProjectTimeSpans() {
  console.log('[TIMESPAN_UPDATE] 🕐 Updating all project time spans...');

  // Fetch all projects
  const { data: projects, error } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('id, title, release_date, category');

  if (error || !projects) {
    console.error('❌ Failed to fetch projects:', error);
    return;
  }

  console.log(`\n📋 Found ${projects.length} projects\n`);

  for (const project of projects) {
    let startDate: string | null = null;
    let endDate: string | null = null;
    let isOngoing = false;

    // Determine time span based on project
    if (project.title.toLowerCase().includes('affair')) {
      // Affair: Multi-year project
      startDate = '2024-01-01';
      endDate = '2025-12-31';
      isOngoing = true;
    } else if (project.title.toLowerCase().includes('harmony') || project.title.toLowerCase().includes('和谐密语')) {
      // Harmony Secret: Started July 2025, ongoing
      startDate = '2025-07-01';
      endDate = '2025-12-31';
      isOngoing = true;
    } else if (project.release_date) {
      // Default: Single day event
      startDate = project.release_date;
      endDate = project.release_date;
      isOngoing = false;
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
        console.error(`  ❌ ${project.title}:`, updateError.message);
      } else {
        const period = isOngoing
          ? `${formatDate(startDate)} - Ongoing`
          : `${formatDate(startDate)}`;

        console.log(`  ✅ ${project.title}:`);
        console.log(`     Period: ${period}`);
        console.log(`     Start:  ${startDate}`);
        console.log(`     End:    ${endDate}`);
        console.log();
      }
    }
  }

  console.log('[TIMESPAN_UPDATE] ✅ All projects updated!');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

updateAllProjectTimeSpans().catch(console.error);
