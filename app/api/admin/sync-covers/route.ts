import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';

/**
 * Database Alignment Patch - Auto-sync covers from gallery
 *
 * POST /api/admin/sync-covers
 *
 * This endpoint:
 * 1. Scans all gallery images with catalog_id ending in -000
 * 2. Extracts date from catalog_id (e.g., 20241023)
 * 3. Matches with projects by release_date
 * 4. Auto-fills missing cover_url in projects table
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
    console.log('[SYNC_COVERS] 🚀 Starting cover synchronization...');

    const supabaseAdmin = getSupabaseAdmin();

    // Step 1: Fetch all -000 images from gallery
    const { data: coverImages, error: galleryError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .select('id, catalog_id, image_url, project_id')
      .like('catalog_id', '%-000');

    if (galleryError) {
      console.error('[SYNC_COVERS] ❌ Failed to fetch gallery:', galleryError);
      throw new Error(`Failed to fetch gallery: ${galleryError.message}`);
    }

    if (!coverImages || coverImages.length === 0) {
      console.log('[SYNC_COVERS] ℹ️ No -000 images found');
      return NextResponse.json({
        success: true,
        message: 'No -000 images found to sync',
        updated: 0,
      });
    }

    console.log(`[SYNC_COVERS] 📊 Found ${coverImages.length} -000 images`);

    // Step 2: Fetch all projects that need covers
    const { data: projects, error: projectError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('id, title, cover_url, release_date, catalog_id');

    if (projectError) {
      console.error('[SYNC_COVERS] ❌ Failed to fetch projects:', projectError);
      throw new Error(`Failed to fetch projects: ${projectError.message}`);
    }

    console.log(`[SYNC_COVERS] 📊 Found ${projects?.length || 0} projects`);

    // Step 3: Match and update
    let updatedCount = 0;
    const updates: Array<{ projectId: string; projectTitle: string; imageUrl: string; matchType: string }> = [];

    for (const image of coverImages) {
      const catalogMatch = image.catalog_id?.match(/^LMSY-[A-Z]+-(\d{8})-000$/);

      if (!catalogMatch) {
        console.warn(`[SYNC_COVERS] ⚠️ Invalid catalog_id format: ${image.catalog_id}`);
        continue;
      }

      const imageDate = catalogMatch[1]; // YYYYMMDD
      const imageYear = imageDate.substring(0, 4);
      const imageMonth = imageDate.substring(4, 6);
      const imageDay = imageDate.substring(6, 8);

      // Try direct project_id match first
      if (image.project_id) {
        const project = projects?.find(p => p.id === image.project_id);

        if (project && !project.cover_url) {
          console.log(`[SYNC_COVERS] 🎯 Direct match: "${project.title}" via project_id`);

          const { error } = await supabaseAdmin
            .schema('lmsy_archive')
            .from('projects')
            .update({ cover_url: image.image_url })
            .eq('id', project.id);

          if (!error) {
            updatedCount++;
            updates.push({
              projectId: project.id,
              projectTitle: project.title,
              imageUrl: image.image_url,
              matchType: 'project_id',
            });
          }
        }
        continue;
      }

      // Fallback: Match by release_date
      const matchingProject = projects?.find(p => {
        if (!p.release_date || p.cover_url) return false;

        const releaseDate = new Date(p.release_date);
        const year = releaseDate.getFullYear().toString();
        const month = (releaseDate.getMonth() + 1).toString().padStart(2, '0');
        const day = releaseDate.getDate().toString().padStart(2, '0');

        return `${year}${month}${day}` === imageDate;
      });

      if (matchingProject) {
        console.log(`[SYNC_COVERS] 🎯 Date match: "${matchingProject.title}" (${imageDate})`);

        const { error } = await supabaseAdmin
          .schema('lmsy_archive')
          .from('projects')
          .update({ cover_url: image.image_url })
          .eq('id', matchingProject.id);

        if (!error) {
          updatedCount++;
          updates.push({
            projectId: matchingProject.id,
            projectTitle: matchingProject.title,
            imageUrl: image.image_url,
            matchType: 'release_date',
          });
        }
      }
    }

    console.log(`[SYNC_COVERS] ✅ Sync complete: ${updatedCount} projects updated`);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${updatedCount} project covers`,
      updated: updatedCount,
      updates,
    });

  } catch (error) {
    console.error('[SYNC_COVERS] ❌ Error:', error);

    return NextResponse.json(
      {
        error: 'Cover sync failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
