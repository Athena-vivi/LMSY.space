import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { revalidateContentSurfaces } from '@/lib/revalidate-content';
import { setProjectCover } from '@/lib/data/projects';
import { getAssetById, clearCoverFlags, setCoverFlag } from '@/lib/data/gallery-assets';

/**
 * PATCH /api/admin/projects/[id]/cover - point a project at one picture.
 *
 * P1-3 Phase 2: the reads and writes moved to lib/data. The repositories
 * throw on a db error, and the catch-all at the bottom answers with the
 * same { success: false, error: <message> } 500 the per-query branches
 * used to return, so the responses are unchanged.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const imageId = typeof body?.imageId === 'string' ? body.imageId : '';

    if (!id || !imageId) {
      return NextResponse.json(
        { success: false, error: 'Project id and imageId are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const asset = await getAssetById(supabaseAdmin, imageId);

    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // A cover may point at a page from another batch: a series row owns no
    // pictures of its own, and an event without photos can borrow one from a
    // sibling. `is_cover` stays a per-batch flag, so only a picture that really
    // belongs to this row is marked as its cover.
    const sameBatch = asset.project_id === id;

    if (sameBatch) {
      await clearCoverFlags(supabaseAdmin, id);
      await setCoverFlag(supabaseAdmin, imageId);
    }

    await setProjectCover(supabaseAdmin, id, asset.image_url);

    revalidateContentSurfaces();

    return NextResponse.json({
      success: true,
      data: {
        projectId: id,
        imageId,
        cover_url: asset.image_url,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - drop the chosen cover and go back to the automatic one.
 *
 * A cover is a pointer (see docs/architecture/20261021-asset-naming.md §6.1),
 * so clearing it is one null on the row; no file is touched.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    await clearCoverFlags(supabaseAdmin, id);
    await setProjectCover(supabaseAdmin, id, null);

    revalidateContentSurfaces();

    return NextResponse.json({ success: true, data: { projectId: id, cover_url: null } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
