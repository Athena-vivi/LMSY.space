import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';

/**
 * Projects Management API
 *
 * DELETE /api/admin/projects/[id] - Delete a project
 * PATCH /api/admin/projects/[id] - Update a project
 */

// ========================================
// DELETE - Delete Project
// ========================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user || authResult.error) {
      console.error('[PROJECTS_DELETE] ❌ Authentication failed:', authResult.error);
      return NextResponse.json(
        { error: 'Unauthorized', details: authResult.error },
        { status: 401 }
      );
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (authResult.user.email !== adminEmail) {
      console.error('[PROJECTS_DELETE] ❌ Authorization failed: Non-admin user');
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get project ID
    const { id } = await params;

    if (!id) {
      console.error('[PROJECTS_DELETE] ❌ Missing project ID');
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Delete project using admin client
    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[PROJECTS_DELETE] ❌ Delete failed:', error.message, '| Code:', error.code);
      return NextResponse.json(
        { error: 'Failed to delete project', details: error.message },
        { status: 500 }
      );
    }

    console.log('[PROJECTS_DELETE] ✅ Project deleted:', id);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('[PROJECTS_DELETE] ❌ Operation exception:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete project',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ========================================
// PATCH - Update Project
// ========================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user || authResult.error) {
      console.error('[PROJECTS_PATCH] ❌ Authentication failed:', authResult.error);
      return NextResponse.json(
        { error: 'Unauthorized', details: authResult.error },
        { status: 401 }
      );
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (authResult.user.email !== adminEmail) {
      console.error('[PROJECTS_PATCH] ❌ Authorization failed: Non-admin user');
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get project ID
    const { id } = await params;

    console.log('[PROJECTS_PATCH] Update request for ID:', id);

    if (!id) {
      console.error('[PROJECTS_PATCH] ❌ Missing project ID');
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.title.trim()) {
      console.error('[PROJECTS_PATCH] ❌ Missing title');
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      title: body.title.trim(),
      category: body.category,
    };

    // Optional fields
    if (body.release_date !== undefined) updateData.release_date = body.release_date || null;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.watch_url !== undefined) updateData.watch_url = body.watch_url || null;
    if (body.tags !== undefined) updateData.tags = body.tags && body.tags.length > 0 ? body.tags : null;

    console.log('[PROJECTS_PATCH] Update data:', updateData);

    // Update project using admin client
    const supabaseAdmin = getSupabaseAdmin();

    // ❌ DON'T use .single() - it's too fragile and throws PGRST116 if no rows match
    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[PROJECTS_PATCH] ❌ Update failed:', error.message, '| Code:', error.code);
      return NextResponse.json(
        { error: 'Failed to update project', details: error.message },
        { status: 500 }
      );
    }

    // Check if any rows were updated
    if (!data || data.length === 0) {
      console.error('[PROJECTS_PATCH] ❌ No rows updated. Project not found for ID:', id);
      return NextResponse.json(
        { error: 'Project not found', details: `No project with ID ${id}` },
        { status: 404 }
      );
    }

    console.log('[PROJECTS_PATCH] ✅ Project updated:', id, '| Rows:', data.length);

    return NextResponse.json({
      success: true,
      data: data[0], // Return first (and should be only) row
    });
  } catch (error) {
    console.error('[PROJECTS_PATCH] ❌ Operation exception:', error);
    return NextResponse.json(
      {
        error: 'Failed to update project',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
