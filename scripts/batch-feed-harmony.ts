/**
 * BATCH FEED SCRIPT - Harmony Secret Project Association
 *
 * 🎯 Feed gallery images to Harmony Secret project
 * "Because the Curator defined it, it belongs"
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function batchFeedHarmonySecret() {
  console.log('[BATCH_FEED_HARMONY] 🎯 Harmony Secret Sovereign Association');
  console.log('='.repeat(60));

  // Step 1: Find Harmony Secret project
  const { data: project, error: projectError } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .ilike('title', '%Harmony Secret%')
    .single();

  if (projectError || !project) {
    console.error('❌ Harmony Secret project not found:', projectError);
    return;
  }

  console.log(`\n🎯 Found Harmony Secret project:`);
  console.log(`  ID: ${project.id}`);
  console.log(`  Title: ${project.title}`);
  console.log(`  Category: ${project.category}`);
  console.log(`  Release Date: ${project.release_date}`);

  // Step 2: Find unassociated images that might belong to Harmony Secret
  // Look for images around 2025-07-26 or with related tags
  const { data: unlinkedImages, error: unlinkError } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('gallery')
    .select('id, catalog_id, image_url, event_date, project_id, tag')
    .is('project_id', null)
    .order('event_date', { ascending: true });

  if (unlinkError) {
    console.error('❌ Failed to fetch unlinked images:', unlinkError);
    return;
  }

  console.log(`\n📸 Found ${unlinkedImages?.length || 0} unlinked gallery images`);

  if (!unlinkedImages || unlinkedImages.length === 0) {
    console.log('No unlinked images to process.');
    return;
  }

  // Display unlinked images for curator's review
  console.log('\n📋 Unlinked Images:');
  unlinkedImages.forEach((img, i) => {
    console.log(`  ${i + 1}. ${img.catalog_id} | ${img.event_date} | ${img.tag || 'no tag'}`);
  });

  // Step 3: Auto-associate based on patterns
  // For Harmony Secret, we'll associate images from July 2025 timeframe
  let linkedCount = 0;
  let skippedCount = 0;

  console.log('\n🔗 Associating images to Harmony Secret...');

  for (const image of unlinkedImages) {
    // Check if already linked to this project
    if (image.project_id === project.id) {
      skippedCount++;
      continue;
    }

    // Association criteria for Harmony Secret:
    // 1. Images from July 2025
    // 2. Images with tag containing 'Harmony' or 'Secret'
    // 3. Images catalog_id matching HARMONY pattern

    let shouldLink = false;
    let reason = '';

    if (image.event_date) {
      const imgDate = new Date(image.event_date);
      const projectDate = new Date(project.release_date || '2025-07-26');

      // Within 3 months of release date
      const monthDiff = (imgDate.getFullYear() - projectDate.getFullYear()) * 12 +
                       (imgDate.getMonth() - projectDate.getMonth());

      if (Math.abs(monthDiff) <= 3) {
        shouldLink = true;
        reason = `date proximity (${Math.abs(monthDiff)} months)`;
      }
    }

    if (!shouldLink && image.tag) {
      if (image.tag.toLowerCase().includes('harmony') ||
          image.tag.toLowerCase().includes('secret')) {
        shouldLink = true;
        reason = `tag match: ${image.tag}`;
      }
    }

    if (!shouldLink && image.catalog_id) {
      if (image.catalog_id.toUpperCase().includes('HARMONY') ||
          image.catalog_id.toUpperCase().includes('SECRET')) {
        shouldLink = true;
        reason = `catalog_id pattern`;
      }
    }

    if (shouldLink) {
      const { error: updateError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .update({ project_id: project.id })
        .eq('id', image.id);

      if (updateError) {
        console.error(`  ❌ Failed to link ${image.catalog_id}:`, updateError.message);
      } else {
        console.log(`  ✅ Linked: ${image.catalog_id} (${image.event_date}) - ${reason}`);
        linkedCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('[BATCH_FEED_HARMONY] Summary:');
  console.log(`  ✅ Linked:    ${linkedCount}`);
  console.log(`  ⊙ Skipped:   ${skippedCount} (already linked)`);
  console.log(`  ⏭️  Remaining: ${unlinkedImages.length - linkedCount - skippedCount}`);
  console.log('='.repeat(60));

  // Step 4: Set Harmony Secret project cover if not set
  if (!project.cover_url) {
    const { data: projectImages } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .select('id, image_url, catalog_id')
      .eq('project_id', project.id)
      .order('event_date', { ascending: true })
      .limit(1);

    if (projectImages && projectImages.length > 0) {
      await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .update({ cover_url: projectImages[0].image_url })
        .eq('id', project.id);

      console.log(`\n🎯 Set cover: ${projectImages[0].catalog_id}`);
    }
  }

  // Step 5: Update project time span
  console.log('\n⏳ Updating Harmony Secret time span...');

  // Harmony Secret is an ongoing series (July 2025 onwards)
  await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .update({
      start_date: '2025-07-01',  // Start of July 2025
      end_date: '2025-12-31',    // Through end of year
      is_ongoing: true,
    })
    .eq('id', project.id);

  console.log('  ✅ Time span updated: Jul 2025 - Dec 2025 (ongoing)');
}

batchFeedHarmonySecret().catch(console.error);
