import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';

/**
 * GET - Retrieve gallery images
 * Supports filtering by project_id via query parameter
 * Returns all images including those linked to projects
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
    const supabaseAdmin = getSupabaseAdmin();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    // Build query
    let query = supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by project_id if provided (for curation view)
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ADMIN_GALLERY_API] ❌ Fetch failed:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gallery', details: error.message },
        { status: 500 }
      );
    }

    console.log('[ADMIN_GALLERY_API] ✅ Fetched', data?.length || 0, 'images');

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      data: data || [],
    });
  } catch (error) {
    console.error('[ADMIN_GALLERY_API] ❌ Error:', error);

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
 * POST - Add new gallery images
 * Uses admin client for management operations
 */
export async function POST(request: NextRequest) {
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
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const results = [];

    for (const item of items) {
      const { data, error } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .insert({
          image_url: item.image_url,
          title: item.title,
          excerpt: item.description || null,
          tag: item.tag || null,
          caption: item.caption || '',
          is_featured: item.is_featured || false,
          event_date: item.event_date || null,
          project_id: item.project_id || null,
          blur_data: item.blur_data || null,
          credits: item.credits || null,
          catalog_id: item.catalog_id || null,
          magazine_issue: item.magazine_issue || null,
          integrity_status: item.integrity_status || 'ok',
          display_role: item.display_role || 'regular',
          is_cover: item.is_cover || false,
          is_portal_candidate: item.is_portal_candidate || false,
          rotation: item.rotation || 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[ADMIN_GALLERY_API] ❌ Insert failed:', error);
        return NextResponse.json(
          { error: 'Failed to insert item', details: error.message },
          { status: 500 }
        );
      }

      results.push(data);
    }

    console.log('[ADMIN_GALLERY_API] ✅ Inserted', results.length, 'items');

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('[ADMIN_GALLERY_API] ❌ Error:', error);

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
 * DELETE - Delete gallery images
 * Query params:
 * - ids: comma-separated list of image IDs to delete
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
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json(
        { error: 'Missing required parameter: ids' },
        { status: 400 }
      );
    }

    const idArray = ids.split(',');
    console.log('[ADMIN_GALLERY_API] Deleting', idArray.length, 'images:', idArray);

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .delete()
      .in('id', idArray);

    if (error) {
      console.error('[ADMIN_GALLERY_API] ❌ Delete failed:', error);
      return NextResponse.json(
        { error: 'Failed to delete images', details: error.message },
        { status: 500 }
      );
    }

    console.log('[ADMIN_GALLERY_API] ✅ Deleted', idArray.length, 'images');

    return NextResponse.json({
      success: true,
      deleted: idArray.length,
    });
  } catch (error) {
    console.error('[ADMIN_GALLERY_API] ❌ Error:', error);

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
 * PATCH - Update single gallery asset fields
 */
export async function PATCH(request: NextRequest) {
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
    const { id, rotation, project_id, is_cover } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (rotation !== undefined) updateData.rotation = rotation ?? 0;
    if (project_id !== undefined) updateData.project_id = project_id;
    if (is_cover !== undefined) updateData.is_cover = !!is_cover;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update asset', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
