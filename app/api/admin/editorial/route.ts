import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { normalizeLocalizedText } from '@/lib/localized-content';
import { requireAdmin } from '@/lib/security/api-auth';
import { revalidateContentSurfaces } from '@/lib/revalidate-content';
import {
  listEditorialSeriesProjects,
  clearEditorialHomepageFeatured,
  updateProject,
  deleteProject,
} from '@/lib/data/projects';
import { deleteGalleryAssetsByProjectId } from '@/lib/data/gallery-admin';

/**
 * GET /api/admin/editorial - Fetch all editorial projects (Admin Only)
 *
 * This endpoint uses the admin client to fetch all editorial/magazine projects
 * for the admin dashboard.
 */
export async function GET(request: NextRequest) {
  // Authentication
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    console.log('[ADMIN_FORCED_ALIGNMENT] ========== ADMIN FORCED ALIGNMENT ==========');
    console.log('[ADMIN_FORCED_ALIGNMENT] 🎯 Target: lmsy_archive.projects');
    console.log('[ADMIN_FORCED_ALIGNMENT] 🎯 Expected: 7 editorial + 2 series projects');
    console.log('[ADMIN_FORCED_ALIGNMENT] 📡 Query: .or("category.eq.editorial,category.eq.series")');

    const supabaseAdmin = getSupabaseAdmin();

    let data: Array<Record<string, unknown>>;
    try {
      data = await listEditorialSeriesProjects(supabaseAdmin);
    } catch (error) {
      console.error('[ADMIN_FORCED_ALIGNMENT] ❌ CRITICAL ERROR:', error);
      return NextResponse.json(
        { error: 'FORCED_ALIGNMENT_FAILED', details: (error as Error).message },
        { status: 500 }
      );
    }

    console.log('[ADMIN_FORCED_ALIGNMENT] 📊 Data Length:', data?.length || 0);
    console.log('[ADMIN_FORCED_ALIGNMENT] ✅ Fetched', data?.length || 0, 'projects');

    return NextResponse.json({
      success: true,
      projects: data || [],
      count: data?.length || 0,
    });

  } catch (error) {
    console.error('[ADMIN_EDITORIAL_API] ❌ Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/editorial - Update an editorial project (Admin Only)
 *
 * Request body:
 * {
 *   "id": "project-uuid",
 *   "title": "Magazine Title",
 *   "description": "Excerpt",
 *   "release_date": "2024-10-23"
 * }
 */
export async function PUT(request: NextRequest) {
  // Authentication
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const {
      id,
      title,
      title_i18n,
      description,
      description_i18n,
      release_date,
      homepage_featured,
      homepage_excerpt,
      homepage_excerpt_i18n,
      homepage_cover_url,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    console.log('[ADMIN_EDITORIAL_API] Updating project:', id);

    const supabaseAdmin = getSupabaseAdmin();

    if (homepage_featured === true) {
      try {
        await clearEditorialHomepageFeatured(supabaseAdmin, id);
      } catch (clearError) {
        return NextResponse.json(
          { error: 'Failed to clear previous homepage feature', details: (clearError as Error).message },
          { status: 500 }
        );
      }
    }

    const normalizedTitle = normalizeLocalizedText(title_i18n, title || '');
    const normalizedDescription = normalizeLocalizedText(description_i18n, description || '');
    const normalizedHomepageExcerpt = normalizeLocalizedText(
      homepage_excerpt_i18n,
      homepage_excerpt || ''
    );

    let updated: Array<Record<string, unknown>>;
    try {
      updated = await updateProject(supabaseAdmin, id, {
        title: normalizedTitle.en || title || '',
        title_i18n: normalizedTitle,
        description: normalizedDescription.en || description || '',
        description_i18n: normalizedDescription,
        release_date,
        homepage_featured: !!homepage_featured,
        homepage_excerpt: normalizedHomepageExcerpt.en || homepage_excerpt || null,
        homepage_excerpt_i18n: normalizedHomepageExcerpt,
        homepage_cover_url: homepage_cover_url || null,
      });
    } catch (error) {
      console.error('[ADMIN_EDITORIAL_API] ❌ Update failed:', error);
      return NextResponse.json(
        { error: 'Failed to update project', details: (error as Error).message },
        { status: 500 }
      );
    }

    console.log('[ADMIN_EDITORIAL_API] ✅ Updated project:', id);

    revalidateContentSurfaces();

    return NextResponse.json({
      success: true,
      project: updated[0] ?? null,
    });

  } catch (error) {
    console.error('[ADMIN_EDITORIAL_API] ❌ Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/editorial - Delete an editorial project (Admin Only)
 *
 * Query params:
 * - id: project ID to delete
 */
export async function DELETE(request: NextRequest) {
  // Authentication
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    console.log('[ADMIN_EDITORIAL_API] Deleting project:', id);

    const supabaseAdmin = getSupabaseAdmin();

    // First, delete associated gallery assets. A failure here is non-fatal in
    // the original route (it only warns), so swallow it and continue to the
    // project delete.
    try {
      await deleteGalleryAssetsByProjectId(supabaseAdmin, id);
    } catch (galleryError) {
      console.error('[ADMIN_EDITORIAL_API] ⚠️ Failed to delete gallery images:', galleryError);
    }

    // Then delete the project
    try {
      await deleteProject(supabaseAdmin, id);
    } catch (error) {
      console.error('[ADMIN_EDITORIAL_API] ❌ Delete failed:', error);
      return NextResponse.json(
        { error: 'Failed to delete project', details: (error as Error).message },
        { status: 500 }
      );
    }

    console.log('[ADMIN_EDITORIAL_API] ✅ Deleted project:', id);

    revalidateContentSurfaces();

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('[ADMIN_EDITORIAL_API] ❌ Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
