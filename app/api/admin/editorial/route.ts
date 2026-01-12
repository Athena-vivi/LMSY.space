import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/admin/editorial - Fetch all editorial projects (Admin Only)
 *
 * This endpoint uses the admin client to fetch all editorial/magazine projects
 * for the admin dashboard.
 */
export async function GET(request: NextRequest) {
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
    console.log('[ADMIN_FORCED_ALIGNMENT] ========== ADMIN FORCED ALIGNMENT ==========');
    console.log('[ADMIN_FORCED_ALIGNMENT] 🎯 Target: lmsy_archive.projects');
    console.log('[ADMIN_FORCED_ALIGNMENT] 🎯 Expected: 7 editorial + 2 series projects');
    console.log('[ADMIN_FORCED_ALIGNMENT] 📡 Query: .or("category.eq.editorial,category.eq.series")');

    const supabaseAdmin = getSupabaseAdmin();

    // 🔥 FORCED: Explicit schema + category filter matching database
    const { data, error, status, statusText } = await supabaseAdmin
      .schema('lmsy_archive')  // 🚨 MANDATORY EXPLICIT SCHEMA
      .from('projects')
      .select('*')
      .or('category.eq.editorial,category.eq.series')  // Match confirmed 7+2 projects
      .order('release_date', { ascending: false });

    console.log('[ADMIN_FORCED_ALIGNMENT] ========== QUERY RESULT ==========');
    console.log('[ADMIN_FORCED_ALIGNMENT] 📊 HTTP Status:', status, statusText);
    console.log('[ADMIN_FORCED_ALIGNMENT] 📊 Data Length:', data?.length || 0);
    console.log('[ADMIN_FORCED_ALIGNMENT] 📊 Error:', error ? JSON.stringify(error, null, 2) : 'NO_ERROR');

    if (data && data.length > 0) {
      console.log('[ADMIN_FORCED_ALIGNMENT] ✅ SUCCESS - Found projects:', data.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category
      })));
    }

    if (error) {
      console.error('[ADMIN_FORCED_ALIGNMENT] ❌ CRITICAL ERROR:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'FORCED_ALIGNMENT_FAILED', details: error.message, code: error.code, fullError: JSON.stringify(error, null, 2) },
        { status: 500 }
      );
    }

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
    const body = await request.json();
    const { id, title, description, release_date } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    console.log('[ADMIN_EDITORIAL_API] Updating project:', id);

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .update({
        title,
        description,
        release_date,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ADMIN_EDITORIAL_API] ❌ Update failed:', error);
      return NextResponse.json(
        { error: 'Failed to update project', details: error.message },
        { status: 500 }
      );
    }

    console.log('[ADMIN_EDITORIAL_API] ✅ Updated project:', id);

    return NextResponse.json({
      success: true,
      project: data,
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

    // First, delete associated gallery images
    const { error: galleryError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery')
      .delete()
      .eq('project_id', id);

    if (galleryError) {
      console.error('[ADMIN_EDITORIAL_API] ⚠️ Failed to delete gallery images:', galleryError);
    }

    // Then delete the project
    const { error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ADMIN_EDITORIAL_API] ❌ Delete failed:', error);
      return NextResponse.json(
        { error: 'Failed to delete project', details: error.message },
        { status: 500 }
      );
    }

    console.log('[ADMIN_EDITORIAL_API] ✅ Deleted project:', id);

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
