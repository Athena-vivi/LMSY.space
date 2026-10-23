import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';

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

    const { data: asset, error: assetError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id, image_url, project_id')
      .eq('id', imageId)
      .maybeSingle();

    if (assetError) {
      return NextResponse.json(
        { success: false, error: assetError.message },
        { status: 500 }
      );
    }

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
      const { error: clearCoverError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .update({ is_cover: false })
        .eq('project_id', id);

      if (clearCoverError) {
        return NextResponse.json(
          { success: false, error: clearCoverError.message },
          { status: 500 }
        );
      }

      const { error: setAssetError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .update({ is_cover: true })
        .eq('id', imageId);

      if (setAssetError) {
        return NextResponse.json(
          { success: false, error: setAssetError.message },
          { status: 500 }
        );
      }
    }

    const { error: updateProjectError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .update({ cover_url: asset.image_url })
      .eq('id', id);

    if (updateProjectError) {
      return NextResponse.json(
        { success: false, error: updateProjectError.message },
        { status: 500 }
      );
    }

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

    const { error: clearFlagError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .update({ is_cover: false })
      .eq('project_id', id);

    if (clearFlagError) {
      return NextResponse.json(
        { success: false, error: clearFlagError.message },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .update({ cover_url: null })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

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
