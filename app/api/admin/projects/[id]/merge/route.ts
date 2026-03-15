import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: sourceProjectId } = await params;
    const { targetProjectId } = await request.json();

    if (!sourceProjectId || !targetProjectId) {
      return NextResponse.json(
        { error: 'sourceProjectId and targetProjectId are required' },
        { status: 400 }
      );
    }

    if (sourceProjectId === targetProjectId) {
      return NextResponse.json(
        { error: 'Cannot merge a project into itself' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: sourceProject, error: sourceError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('*')
      .eq('id', sourceProjectId)
      .single();

    if (sourceError || !sourceProject) {
      return NextResponse.json(
        { error: sourceError?.message || 'Source project not found' },
        { status: 404 }
      );
    }

    const { data: targetProject, error: targetError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('*')
      .eq('id', targetProjectId)
      .single();

    if (targetError || !targetProject) {
      return NextResponse.json(
        { error: targetError?.message || 'Target project not found' },
        { status: 404 }
      );
    }

    const draftUpdate = await supabaseAdmin
      .from('draft_items')
      .update({ project_id: targetProjectId })
      .eq('project_id', sourceProjectId);

    if (draftUpdate.error) {
      return NextResponse.json(
        { error: draftUpdate.error.message },
        { status: 500 }
      );
    }

    const assetUpdate = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .update({ project_id: targetProjectId })
      .eq('project_id', sourceProjectId);

    if (assetUpdate.error) {
      return NextResponse.json(
        { error: assetUpdate.error.message },
        { status: 500 }
      );
    }

    if (!targetProject.cover_url && sourceProject.cover_url) {
      await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .update({ cover_url: sourceProject.cover_url })
        .eq('id', targetProjectId);
    }

    const { error: deleteError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .delete()
      .eq('id', sourceProjectId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sourceProjectId,
      targetProjectId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to merge project',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
