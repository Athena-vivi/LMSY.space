import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';
import { HOME_CATEGORIES, type ProjectCategory } from '@/lib/category-registry';

/**
 * Homepage portal covers.
 *
 * The homepage shows five fixed doors, one per HOME_CATEGORIES entry. Until
 * now the photo behind each door was whatever the first public project in
 * that hall happened to carry, which the curator could not choose. This route
 * lets them pick the image themselves, out of the vault, exactly like the
 * year photos and the portraits.
 *
 * PATCH { imageId: string, category: ProjectCategory | null }
 *   category = null clears the slot and the door falls back to the automatic
 *   cover it used before.
 *
 * One row per slot: the previous holder is cleared before the new one is set,
 * so the partial unique index on portal_slot never sees two rows.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { imageId, category } = body as {
      imageId?: string;
      category?: string | null;
    };

    if (!imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
    }

    const validValues = HOME_CATEGORIES.map((definition) => definition.value);
    const slot =
      category === null || category === undefined
        ? null
        : validValues.includes(category as ProjectCategory)
          ? (category as ProjectCategory)
          : undefined;

    if (slot === undefined) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of ${validValues.join(', ')}, or null` },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const table = () => supabaseAdmin.schema('lmsy_archive').from('gallery_assets');

    if (slot !== null) {
      // Release the slot from whoever held it, otherwise the unique index
      // rejects the write.
      const { error: clearError } = await table()
        .update({ portal_slot: null })
        .eq('portal_slot', slot);

      if (clearError) {
        console.error('[PORTAL_SLOT_API] Failed to release previous holder:', clearError);
        return apiServerError('admin/gallery/portal PATCH', clearError);
      }
    }

    const { data, error } = await table()
      .update({ portal_slot: slot })
      .eq('id', imageId)
      .select('id, image_url, blur_data, portal_slot')
      .single();

    if (error) {
      console.error('[PORTAL_SLOT_API] Failed to set slot:', error);
      return apiServerError('admin/gallery/portal PATCH', error);
    }

    console.log('[PORTAL_SLOT_API] Set portal slot:', { imageId, slot });

    return NextResponse.json({
      success: true,
      data: {
        imageId: data.id,
        imageUrl: data.image_url,
        blurData: data.blur_data ?? null,
        category: data.portal_slot,
      },
    });
  } catch (error) {
    console.error('[PORTAL_SLOT_API] Error:', error);
    return apiServerError('admin/gallery/portal', error);
  }
}

/**
 * GET - current cover per homepage entry
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id, image_url, blur_data, portal_slot')
      .not('portal_slot', 'is', null);

    if (error) {
      console.error('[PORTAL_SLOT_API] Failed to fetch slots:', error);
      return apiServerError('admin/gallery/portal GET', error);
    }

    return NextResponse.json({
      success: true,
      data:
        data?.map((item) => ({
          id: item.id,
          imageUrl: item.image_url,
          blurData: item.blur_data ?? null,
          category: item.portal_slot,
        })) ?? [],
    });
  } catch (error) {
    console.error('[PORTAL_SLOT_API] Error:', error);
    return apiServerError('admin/gallery/portal', error);
  }
}
