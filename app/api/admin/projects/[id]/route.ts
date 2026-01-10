import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';

/**
 * Update Project API
 * PATCH /api/admin/projects/[id]
 *
 * Updates a single project in the lmsy_archive.projects table
 * Requires admin authentication
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 🔐 使用统一的认证辅助函数
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user || authResult.error) {
      console.error('[UPDATE_PROJECT] ❌ Authentication failed:', authResult.error);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    console.log('[UPDATE_PROJECT] ✅ User authenticated via', authResult.method);

    // 双重身份校验：硬编码检查 Email
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (user.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, category, release_date, description, watch_url, tags } = body;

    // Validate required fields
    if (!title || !category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['series', 'editorial', 'appearance', 'journal', 'commercial'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Use admin client to update project
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .update({
        title,
        category,
        release_date: release_date || null,
        description: description || null,
        watch_url: watch_url || null,
        tags: tags && Array.isArray(tags) && tags.length > 0 ? tags : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[UPDATE_PROJECT] Database update failed:', error);
      return NextResponse.json(
        { error: `Failed to update project: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[UPDATE_PROJECT] ✅ Project updated successfully:', id);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[UPDATE_PROJECT] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/projects/[id]
 * Deletes a single project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 🔐 使用统一的认证辅助函数
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user || authResult.error) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;

    // 双重身份校验
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (user.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Use admin client to delete project
    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DELETE_PROJECT] Database delete failed:', error);
      return NextResponse.json(
        { error: `Failed to delete project: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[DELETE_PROJECT] ✅ Project deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error: any) {
    console.error('[DELETE_PROJECT] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
