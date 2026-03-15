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
    const { title } = await request.json();

    if (!sourceProjectId || !title || !String(title).trim()) {
      return NextResponse.json(
        { error: 'sourceProjectId and title are required' },
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

    const { data: newProject, error: createError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .insert({
        title: String(title).trim(),
        category: sourceProject.category,
        release_date: sourceProject.release_date,
        description: sourceProject.description,
        cover_url: sourceProject.cover_url,
        watch_url: sourceProject.watch_url,
        tags: sourceProject.tags,
        portal_visible: false,
        portal_priority: 0,
        theme_statement: sourceProject.theme_statement || null,
        curation_status: 'draft',
      })
      .select('*')
      .single();

    if (createError || !newProject) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create split project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newProject,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to split project',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
