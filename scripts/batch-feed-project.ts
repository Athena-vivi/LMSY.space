/**
 * BATCH FEED SCRIPT - Sovereign Project Association
 *
 * 🎯 Feed gallery images to projects regardless of date
 * "Because the Curator defined it, it belongs"
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function batchFeedToProject() {
  console.log('[BATCH_FEED] 🎯 Sovereign Project Association Tool');
  console.log('='.repeat(60));

  // Step 1: List all projects
  const { data: projects, error: projectError } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('id, title, category, release_date')
    .order('created_at', { ascending: true });

  if (projectError || !projects) {
    console.error('❌ Failed to fetch projects:', projectError);
    return;
  }

  console.log('\n📋 Available Projects:');
  projects.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.category}] ${p.title} (${p.release_date || 'No date'})`);
    console.log(`     ID: ${p.id}`);
  });

  // For Affair project specifically - batch associate STILL images
  const affairProject = projects.find(p => p.title.toLowerCase().includes('affair'));

  if (!affairProject) {
    console.log('\n⚠️  No Affair project found. Please create one first.');
    return;
  }

  console.log(`\n🎯 Found Affair project: ${affairProject.title}`);

  // Step 2: Find all STILL images (these are the TV stills from Affair)
  const { data: stillImages, error: stillError } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('gallery')
    .select('id, catalog_id, image_url, event_date, project_id')
    .like('catalog_id', '%STILL%')
    .order('event_date', { ascending: true });

  if (stillError) {
    console.error('❌ Failed to fetch STILL images:', stillError);
    return;
  }

  console.log(`\n📸 Found ${stillImages?.length || 0} STILL images`);

  if (!stillImages || stillImages.length === 0) {
    console.log('No STILL images to process.');
    return;
  }

  // Step 3: Associate STILL images to Affair project
  let linkedCount = 0;
  let skippedCount = 0;

  console.log('\n🔗 Linking STILL images to Affair project...');

  for (const image of stillImages) {
    // Skip if already linked to this project
    if (image.project_id === affairProject.id) {
      skippedCount++;
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .update({ project_id: affairProject.id })
      .eq('id', image.id);

    if (updateError) {
      console.error(`  ❌ Failed to link ${image.catalog_id}:`, updateError.message);
    } else {
      console.log(`  ✅ Linked: ${image.catalog_id} (${image.event_date})`);
      linkedCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('[BATCH_FEED] Summary:');
  console.log(`  ✅ Linked:    ${linkedCount}`);
  console.log(`  ⊙ Skipped:   ${skippedCount} (already linked)`);
  console.log('='.repeat(60));

  // Step 4: Set Affair project cover if not set
  const { data: affairData } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('cover_url')
    .eq('id', affairProject.id)
    .single();

  if (affairData && !affairData.cover_url) {
    // Find first STILL image with -001 or earliest
    const coverImage = stillImages.find(img =>
      img.catalog_id?.endsWith('-001') || img.catalog_id?.includes('-001')
    ) || stillImages[0];

    if (coverImage) {
      await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .update({ cover_url: coverImage.image_url })
        .eq('id', affairProject.id);

      console.log(`\n🎯 Set cover: ${coverImage.catalog_id}`);
    }
  }
}

batchFeedToProject().catch(console.error);
