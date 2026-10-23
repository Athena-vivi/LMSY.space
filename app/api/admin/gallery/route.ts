import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { normalizeLocalizedText } from '@/lib/localized-content';
import { requireAdmin } from '@/lib/security/api-auth';

/**
 * GET - Retrieve one project's gallery images.
 *
 * v2 (2026-10-23): project_id is now required. The old unfiltered "return the
 * whole vault" path had no callers - the Asset Vault grid reads
 * /api/admin/vault/assets, which is keyset-paged - and it was the only place
 * the 1000-row PostgREST truncation could bite. The project_ids (multi) branch
 * had no callers either. Both removed; a missing project_id now fails fast with
 * 400 instead of scanning the whole table. The three curation callers
 * (?project_id=<one>) are unchanged and still read the flat `data` array.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: project_id' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

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
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

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

    // Phase 3 (ingestion contract, task B): validate the linked project
    // explicitly when provided, so a bad reference fails with a clear 404
    // instead of a foreign-key 500 after the first items were inserted.
    const firstProjectId = items.find(item => item.project_id)?.project_id;
    if (firstProjectId) {
      const { data: projectRow, error: projectError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select('id')
        .eq('id', firstProjectId)
        .maybeSingle();

      if (projectError) {
        return NextResponse.json(
          { error: 'Failed to verify project', details: projectError.message },
          { status: 500 }
        );
      }
      if (!projectRow) {
        return NextResponse.json(
          { error: 'Project not found', projectId: firstProjectId },
          { status: 404 }
        );
      }
    }

    // Phase 3 (ingestion contract, task A): image_url is the dedupe key.
    // Pre-check the whole batch and treat already-existing urls as idempotent
    // successes (created: false) instead of inserting duplicate rows.
    const requestedUrls = items.map(item => item.image_url).filter(Boolean);
    const { data: existingRows } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id, image_url')
      .in('image_url', requestedUrls);
    const existingByUrl = new Map(
      (existingRows || []).map(row => [row.image_url, row])
    );

    const results = [];

    for (const item of items) {
      const existing = existingByUrl.get(item.image_url);
      if (existing) {
        results.push({ ...existing, created: false });
        continue;
      }

      const { data, error } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .insert({
          image_url: item.image_url,
          title: item.title,
          title_i18n: normalizeLocalizedText(item.title_i18n, item.title || ''),
          excerpt: item.description || null,
          excerpt_i18n: normalizeLocalizedText(item.excerpt_i18n, item.description || ''),
          tag: item.tag || null,
          caption: item.caption || '',
          caption_i18n: normalizeLocalizedText(item.caption_i18n, item.caption || ''),
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

      results.push({ ...data, created: true });
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
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

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
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { id, rotation, project_id, is_cover, title, title_i18n, caption, caption_i18n, excerpt, excerpt_i18n } = body;

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
    if (title !== undefined) updateData.title = title || null;
    if (title_i18n !== undefined) updateData.title_i18n = title_i18n || null;
    if (caption !== undefined) updateData.caption = caption || null;
    if (caption_i18n !== undefined) updateData.caption_i18n = caption_i18n || null;
    if (excerpt !== undefined) updateData.excerpt = excerpt || null;
    if (excerpt_i18n !== undefined) updateData.excerpt_i18n = excerpt_i18n || null;

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
