import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { normalizeLocalizedText } from '@/lib/localized-content';
import { requireAdmin } from '@/lib/security/api-auth';
import { revalidateContentSurfaces } from '@/lib/revalidate-content';
import { isValidCatalogId, r2KeyForCatalogId } from '@/lib/catalog-id';
import { getCdnUrl, getRelativePath, moveR2Object, r2ObjectExists } from '@/lib/r2-client';
import {
  listGalleryAssetsByProject,
  getProjectIdIfExists,
  findGalleryAssetsByImageUrls,
  insertGalleryAsset,
  deleteGalleryAssetsByIds,
  updateGalleryAsset,
} from '@/lib/data/gallery-admin';

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
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: project_id' },
        { status: 400 }
      );
    }

    let images: Array<Record<string, unknown>>;
    try {
      images = await listGalleryAssetsByProject(getSupabaseAdmin(), projectId);
    } catch (error) {
      console.error('[ADMIN_GALLERY_API] ❌ Fetch failed:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gallery', details: (error as Error).message },
        { status: 500 }
      );
    }

    console.log('[ADMIN_GALLERY_API] ✅ Fetched', images.length || 0, 'images');

    return NextResponse.json({
      success: true,
      count: images.length || 0,
      data: images,
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
      let projectId: string | null;
      try {
        projectId = await getProjectIdIfExists(supabaseAdmin, firstProjectId);
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to verify project', details: (error as Error).message },
          { status: 500 }
        );
      }
      if (!projectId) {
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
    let existingRows: Array<{ id: string; image_url: string | null }>;
    try {
      existingRows = await findGalleryAssetsByImageUrls(supabaseAdmin, requestedUrls);
    } catch (error) {
      console.error('[ADMIN_GALLERY_API] ❌ Dedupe check failed:', error);
      return NextResponse.json(
        { error: 'Failed to fetch gallery', details: (error as Error).message },
        { status: 500 }
      );
    }
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

      const row = {
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
      };

      let data: Record<string, unknown>;
      try {
        data = await insertGalleryAsset(supabaseAdmin, row);
      } catch (error) {
        console.error('[ADMIN_GALLERY_API] ❌ Insert failed:', error);
        return NextResponse.json(
          { error: 'Failed to insert item', details: (error as Error).message },
          { status: 500 }
        );
      }

      results.push({ ...data, created: true });
    }

    console.log('[ADMIN_GALLERY_API] ✅ Inserted', results.length, 'items');

    revalidateContentSurfaces();

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

    try {
      await deleteGalleryAssetsByIds(getSupabaseAdmin(), idArray);
    } catch (error) {
      console.error('[ADMIN_GALLERY_API] ❌ Delete failed:', error);
      return NextResponse.json(
        { error: 'Failed to delete images', details: (error as Error).message },
        { status: 500 }
      );
    }

    console.log('[ADMIN_GALLERY_API] ✅ Deleted', idArray.length, 'images');

    revalidateContentSurfaces();

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
    const { id, rotation, project_id, is_cover, title, title_i18n, caption, caption_i18n, excerpt, excerpt_i18n, catalog_id, event_date } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // ---- catalog_id: renaming moves the file, so it is handled first ----
    // The catalog id is the file's name: <PERSON>-<DOOR>-<SUBJECT>[-<DATE>]-<NNN>
    // maps to an R2 key. Changing it therefore means moving the object, not
    // just rewriting a column - otherwise the row would point at a key that
    // no longer exists and every reader would 404.
    let movedFrom: string | null = null;
    let movedTo: string | null = null;

    const nextCatalogRaw = typeof catalog_id === 'string' ? catalog_id.trim() : null;
    const nextCatalogId = nextCatalogRaw ? nextCatalogRaw.toUpperCase() : null;

    if (catalog_id !== undefined) {
      const { data: current, error: readError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('id, catalog_id, image_url')
        .eq('id', id)
        .maybeSingle();

      if (readError) {
        return NextResponse.json(
          { error: 'Failed to read asset', details: readError.message },
          { status: 500 }
        );
      }
      if (!current) {
        return NextResponse.json({ error: 'Asset not found', id }, { status: 404 });
      }

      const previousCatalogId = (current.catalog_id as string | null) ?? null;

      if (nextCatalogId !== previousCatalogId) {
        if (nextCatalogId && !isValidCatalogId(nextCatalogId)) {
          return NextResponse.json(
            {
              error: `"${nextCatalogId}" is not a valid catalog id`,
              hint: 'Expected <PERSON>-<DOOR>-<SUBJECT>[-<YYYYMMDD>]-<NNN>, e.g. LMSY-FEAT-DAILY-20221015-001',
            },
            { status: 400 }
          );
        }

        // Another row already owns this number: refuse rather than create two
        // rows that answer to the same id.
        if (nextCatalogId) {
          const { data: clash, error: clashError } = await supabaseAdmin
            .schema('lmsy_archive')
            .from('gallery_assets')
            .select('id')
            .eq('catalog_id', nextCatalogId)
            .neq('id', id)
            .maybeSingle();

          if (clashError) {
            return NextResponse.json(
              { error: 'Failed to check the catalog id', details: clashError.message },
              { status: 500 }
            );
          }
          if (clash) {
            return NextResponse.json(
              { error: `${nextCatalogId} is already used by another asset`, id: clash.id },
              { status: 409 }
            );
          }
        }

        // The file follows its name. The source is the key the row actually
        // points at (old rows predate the canonical layout), the destination
        // is the canonical key for the new id.
        const sourceKey = getRelativePath(String(current.image_url ?? ''));
        const destinationKey = nextCatalogId ? r2KeyForCatalogId(nextCatalogId) : null;

        if (sourceKey && destinationKey && sourceKey !== destinationKey) {
          if (await r2ObjectExists(destinationKey)) {
            return NextResponse.json(
              {
                error: `A file already exists at ${destinationKey}`,
                hint: 'Pick a different number - the object would overwrite another picture',
              },
              { status: 409 }
            );
          }

          const outcome = await moveR2Object(sourceKey, destinationKey);

          if (outcome === 'missing-source') {
            // No object to move: keep the row usable and just rename it.
            console.warn(`[ADMIN_GALLERY_PATCH] no object at ${sourceKey}; renaming the row only`);
          } else if (outcome === 'copy-failed') {
            return NextResponse.json(
              { error: `Could not move the file to ${destinationKey}; nothing was changed` },
              { status: 500 }
            );
          } else if (outcome === 'moved') {
            movedFrom = sourceKey;
            movedTo = destinationKey;
          }
        }
      }
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

    if (catalog_id !== undefined) updateData.catalog_id = nextCatalogId;

    // A date the curator is not sure about yet stays empty - it is filled in
    // later from the same editor, which is why '' and null both mean "unknown"
    // instead of failing validation.
    if (event_date !== undefined) {
      const raw = String(event_date ?? '').trim();
      if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return NextResponse.json(
          { error: `event_date must be YYYY-MM-DD or empty, got "${raw}"` },
          { status: 400 }
        );
      }
      updateData.event_date = raw || null;
    }

    // The row points at the new key once the object has been moved there. The
    // column holds the full CDN URL (every other row does), not the bare key,
    // so the moved-to key is expanded before it is written.
    if (movedTo) updateData.image_url = getCdnUrl(movedTo);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      );
    }

    let data: Record<string, unknown>;
    try {
      data = await updateGalleryAsset(getSupabaseAdmin(), id, updateData);
    } catch (error) {
      // The file was already moved. Put it back so a failed rename does not
      // leave the archive pointing at a key the object never reached.
      if (movedFrom && movedTo) {
        await moveR2Object(movedTo, movedFrom);
      }
      return NextResponse.json(
        { error: 'Failed to update asset', details: (error as Error).message },
        { status: 500 }
      );
    }

    // A rename changes the URL, so both the old and the new key must leave the
    // CDN cache: the old one still answers with the picture it used to hold.
    if (movedFrom && movedTo) {
      const { purgeCdnUrls } = await import('@/lib/cloudflare-purge');
      await purgeCdnUrls([movedFrom, movedTo]);
    }

    revalidateContentSurfaces();

    return NextResponse.json({
      success: true,
      data,
      movedFrom,
      movedTo,
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
