import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { revalidateContentSurfaces } from '@/lib/revalidate-content';
import {
  getProjectForTransfer,
  transferGalleryAssetsToProject,
  setProjectCoverUrl,
} from '@/lib/data/gallery-admin';

/**
 * POST /api/admin/gallery/transfer - Batch transfer gallery items to project
 * 🔒 IRON CURTAIN: Manual curator-controlled linkage only
 */
export async function POST(request: NextRequest) {
  // Authentication
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { ids, projectId } = body;

    console.log('[IRON_CURTAIN] ========== MANUAL TRANSFER ==========');
    console.log('[IRON_CURTAIN] 📝 Transferring', ids.length, 'items to project:', projectId);

    // Validate inputs
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty ids array' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify project exists
    console.log('[IRON_CURTAIN] 🔍 Verifying project exists...');
    let project: { id: string; title: string | null } | null;
    try {
      project = await getProjectForTransfer(supabaseAdmin, projectId);
    } catch (error) {
      // Mirror the original verbatim behaviour: a lookup error also returned 404
      // "Project not found" (it checked `projectError || !project`).
      console.error('[IRON_CURTAIN] ❌ Project lookup failed:', error);
      return NextResponse.json(
        { error: 'Project not found', projectId },
        { status: 404 }
      );
    }

    if (!project) {
      console.error('[IRON_CURTAIN] ❌ Project not found:', projectId);
      return NextResponse.json(
        { error: 'Project not found', projectId },
        { status: 404 }
      );
    }

    console.log('[IRON_CURTAIN] ✅ Project verified:', project.title);

    // Update all gallery items
    // NOTE: must target gallery_assets (the live asset table). The legacy
    // `gallery` table has 0 rows and previously made this call a silent no-op.
    console.log('[IRON_CURTAIN] 📝 Updating gallery assets...');
    let updatedItems: Array<Record<string, unknown>>;
    try {
      updatedItems = await transferGalleryAssetsToProject(supabaseAdmin, ids, projectId);
    } catch (error) {
      console.error('[IRON_CURTAIN] ❌ Update failed:', error);
      return NextResponse.json(
        { error: 'Failed to transfer items', details: (error as Error).message },
        { status: 500 }
      );
    }

    console.log('[IRON_CURTAIN] ✅ Transferred', updatedItems?.length || 0, 'items to', project.title);

    // Auto-set project cover if an explicit cover or -000 image is in the batch
    const coverImage = updatedItems?.find(item => item.is_cover) ||
      updatedItems?.find(item => (item.catalog_id as string | undefined)?.endsWith('-000'));
    if (coverImage) {
      console.log('[IRON_CURTAIN] 🎯 Cover image in batch, updating project cover...');
      await setProjectCoverUrl(supabaseAdmin, projectId, coverImage.image_url as string | null);
      console.log('[IRON_CURTAIN] ✅ Project cover updated');
    }

    revalidateContentSurfaces();

    return NextResponse.json({
      success: true,
      transferred: updatedItems?.length || 0,
      projectId,
      projectTitle: project.title,
    });

  } catch (error) {
    console.error('[IRON_CURTAIN] ❌ Exception:', error);
    return NextResponse.json(
      {
        error: 'Transfer failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
