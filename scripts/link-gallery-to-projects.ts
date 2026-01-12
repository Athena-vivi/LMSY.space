/**
 * LINK GALLERY TO PROJECTS - Auto-associate existing gallery images to projects
 *
 * Matches gallery images to projects by event_date
 * Sets project covers for -000 images
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function linkGalleryToProjects() {
  console.log('[LINK_GALLERY] 🔗 Starting gallery to project linking...');

  // Step 1: Get all editorial projects
  const { data: projects, error: projectsError } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('id, title, release_date, cover_url, catalog_id')
    .eq('category', 'editorial');

  if (projectsError || !projects) {
    console.error('[LINK_GALLERY] ❌ Failed to fetch projects:', projectsError);
    return;
  }

  console.log(`[LINK_GALLERY] ✅ Found ${projects.length} editorial projects`);

  // Step 2: Get all gallery images with null project_id
  const { data: gallery, error: galleryError } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('gallery')
    .select('id, image_url, catalog_id, event_date')
    .is('project_id', null)
    .not('event_date', 'is', null)
    .order('event_date', { ascending: true });

  if (galleryError || !gallery) {
    console.error('[LINK_GALLERY] ❌ Failed to fetch gallery:', galleryError);
    return;
  }

  console.log(`[LINK_GALLERY] ✅ Found ${gallery.length} unlinked gallery images`);

  // Step 3: Match gallery to projects by event_date
  const results = {
    linked: 0,
    coversSet: 0,
    unmatched: 0,
    errors: [] as string[],
  };

  for (const image of gallery) {
    if (!image.event_date) {
      results.unmatched++;
      continue;
    }

    // Find project with matching release_date
    const matchingProject = projects.find(p => {
      if (!p.release_date) return false;
      const projectDate = new Date(p.release_date).toISOString().split('T')[0];
      const imageDate = new Date(image.event_date).toISOString().split('T')[0];
      return projectDate === imageDate;
    });

    if (!matchingProject) {
      console.log(`[LINK_GALLERY] ⚠️ No match for ${image.catalog_id} (${image.event_date})`);
      results.unmatched++;
      continue;
    }

    // Link image to project
    try {
      const { error: updateError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .update({ project_id: matchingProject.id })
        .eq('id', image.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      console.log(`[LINK_GALLERY] ✅ Linked ${image.catalog_id} → ${matchingProject.title}`);
      results.linked++;

      // Set cover if -000 image or project has no cover
      if (image.catalog_id.endsWith('-000') || !matchingProject.cover_url) {
        const { error: coverError } = await supabaseAdmin
          .schema('lmsy_archive')
          .from('projects')
          .update({ cover_url: image.image_url })
          .eq('id', matchingProject.id);

        if (!coverError) {
          console.log(`[LINK_GALLERY] 🎯 Set cover for ${matchingProject.title}`);
          results.coversSet++;
        } else {
          console.error(`[LINK_GALLERY] ❌ Failed to set cover:`, coverError.message);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[LINK_GALLERY] ❌ Failed to link ${image.catalog_id}:`, errorMsg);
      results.errors.push(`${image.catalog_id}: ${errorMsg}`);
    }
  }

  // Step 4: Summary
  console.log('\n[LINK_GALLERY] 📊 SUMMARY:');
  console.log(`[LINK_GALLERY] ✅ Linked:        ${results.linked}`);
  console.log(`[LINK_GALLERY] 🎯 Covers set:    ${results.coversSet}`);
  console.log(`[LINK_GALLERY] ⚠️ Unmatched:     ${results.unmatched}`);
  console.log(`[LINK_GALLERY] ❌ Errors:        ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n[LINK_GALLERY] ERROR DETAILS:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  console.log('\n[LINK_GALLERY] ✅ Linking complete!');
}

linkGalleryToProjects().catch(console.error);
