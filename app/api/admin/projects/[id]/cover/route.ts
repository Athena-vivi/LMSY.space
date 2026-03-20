import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user || authResult.error) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', details: authResult.error },
        { status: 401 }
      );
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (authResult.user.email !== adminEmail) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

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
      .eq('project_id', id)
      .maybeSingle();

    if (assetError) {
      return NextResponse.json(
        { success: false, error: assetError.message },
        { status: 500 }
      );
    }

    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Image not found in this project' },
        { status: 404 }
      );
    }

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
