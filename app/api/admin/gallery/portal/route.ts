import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';
import { HOME_CATEGORIES, type ProjectCategory } from '@/lib/category-registry';
import { isSecondLevelPath } from '@/lib/cover-slots';

/**
 * Homepage door covers.
 *
 * Two families of fixed door read their photo from this table:
 *   - the five entries under /api/home/portals, one per HOME_CATEGORIES value
 *     (`gallery_assets.portal_slot`)
 *   - the two soul-resonance doors in the soul-resonance block, `talk` and
 *     `live` (`gallery_assets.interview_slot`)
 *
 * The column is still called `interview_slot` for history's sake; its values
 * are `talk` and `live`, matching the two landing pages. The old `photo` /
 * `video` pair is gone - it split the same 97 rows by medium, which is how the
 * "video interviews" door ended up opening a wall of magazine covers.
 *
 * Until this route existed both families derived their photo from project
 * covers, which the curator could not choose. Now each door can be pinned to
 * an image from the vault, exactly like the year photos and the portraits.
 *
 * PATCH { imageId, category: ProjectCategory | null }   -> portal_slot
 * PATCH { imageId, interview: 'talk' | 'live' | null }  -> interview_slot
 * PATCH { imageId, categoryPath: '/live-events/fanmeeting' | null } -> category_slot
 *
 * Exactly one of `category` / `interview` / `categoryPath` must be present. A
 * null value clears the slot and the door falls back to the derived cover it
 * used before. `categoryPath` is the second level of a door (see
 * lib/cover-slots.ts) - the value is a path so the slot and the visitor's
 * address are the same string.
 *
 * One row per door: the previous holder is released before the new one is set,
 * so the partial unique index on either column never sees two rows.
 */

const INTERVIEW_SLOTS = ['talk', 'live'] as const;
type InterviewSlot = (typeof INTERVIEW_SLOTS)[number];

interface SlotTarget {
  column: 'portal_slot' | 'interview_slot' | 'category_slot';
  /** null clears the door */
  value: string | null;
}

function resolveTarget(body: Record<string, unknown>): SlotTarget | { error: string } {
  const hasCategory = Object.prototype.hasOwnProperty.call(body, 'category');
  const hasInterview = Object.prototype.hasOwnProperty.call(body, 'interview');
  const hasPath = Object.prototype.hasOwnProperty.call(body, 'categoryPath');

  const present = [hasCategory, hasInterview, hasPath].filter(Boolean).length;
  if (present !== 1) {
    return { error: 'Exactly one of `category`, `interview` or `categoryPath` is required' };
  }

  if (hasPath) {
    const raw = body.categoryPath;
    if (raw === null) return { column: 'category_slot', value: null };
    if (typeof raw !== 'string' || !isSecondLevelPath(raw)) {
      return { error: 'Invalid categoryPath. Must be the path of a door second level, or null' };
    }
    return { column: 'category_slot', value: raw };
  }

  if (hasCategory) {
    const raw = body.category;
    if (raw === null) return { column: 'portal_slot', value: null };

    const validValues = HOME_CATEGORIES.map((definition) => definition.value);
    if (typeof raw !== 'string' || !validValues.includes(raw as ProjectCategory)) {
      return { error: `Invalid category. Must be one of ${validValues.join(', ')}, or null` };
    }
    return { column: 'portal_slot', value: raw };
  }

  const raw = body.interview;
  if (raw === null) return { column: 'interview_slot', value: null };
  if (typeof raw !== 'string' || !INTERVIEW_SLOTS.includes(raw as InterviewSlot)) {
    return { error: `Invalid interview door. Must be one of ${INTERVIEW_SLOTS.join(', ')}, or null` };
  }
  return { column: 'interview_slot', value: raw };
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const imageId = typeof body.imageId === 'string' ? body.imageId : '';

    if (!imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
    }

    const target = resolveTarget(body);
    if ('error' in target) {
      return NextResponse.json({ error: target.error }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const table = () => supabaseAdmin.schema('lmsy_archive').from('gallery_assets');

    if (target.value !== null) {
      // Release the door from whoever held it, otherwise the unique index
      // rejects the write.
      const { error: clearError } = await table()
        .update({ [target.column]: null })
        .eq(target.column, target.value);

      if (clearError) {
        console.error('[HOME_DOOR_API] Failed to release previous holder:', clearError);
        return apiServerError('admin/gallery/portal PATCH', clearError);
      }
    }

    const { data, error } = await table()
      .update({ [target.column]: target.value })
      .eq('id', imageId)
      .select(`id, image_url, blur_data, ${target.column}`)
      .single();

    if (error) {
      console.error('[HOME_DOOR_API] Failed to set slot:', error);
      return apiServerError('admin/gallery/portal PATCH', error);
    }

    const saved = data as unknown as Record<string, unknown>;
    const savedValue = saved[target.column] as string | null;

    console.log('[HOME_DOOR_API] Set door:', {
      imageId,
      column: target.column,
      value: savedValue,
    });

    return NextResponse.json({
      success: true,
      data: {
        imageId: saved.id,
        imageUrl: saved.image_url,
        blurData: saved.blur_data ?? null,
        column: target.column,
        value: savedValue,
      },
    });
  } catch (error) {
    console.error('[HOME_DOOR_API] Error:', error);
    return apiServerError('admin/gallery/portal', error);
  }
}

/**
 * GET - current cover per door, both families
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const table = () => supabaseAdmin.schema('lmsy_archive').from('gallery_assets');

    // Two queries instead of one OR filter: `not.is.null` inside `.or()` is
    // easy to get wrong, and this runs on an admin page, not a hot path.
    const [portalResult, interviewResult, categoryResult] = await Promise.all([
      table().select('id, image_url, blur_data, portal_slot').not('portal_slot', 'is', null),
      table().select('id, image_url, blur_data, interview_slot').not('interview_slot', 'is', null),
      table().select('id, image_url, blur_data, category_slot').not('category_slot', 'is', null),
    ]);

    const error = portalResult.error ?? interviewResult.error ?? categoryResult.error;
    if (error) {
      console.error('[HOME_DOOR_API] Failed to fetch slots:', error);
      return apiServerError('admin/gallery/portal GET', error);
    }

    const portalRows = (portalResult.data ?? []) as unknown as Array<{
      id: string;
      image_url: string;
      blur_data: string | null;
      portal_slot: string | null;
    }>;
    const interviewRows = (interviewResult.data ?? []) as unknown as Array<{
      id: string;
      image_url: string;
      blur_data: string | null;
      interview_slot: string | null;
    }>;
    const categoryRows = (categoryResult.data ?? []) as unknown as Array<{
      id: string;
      image_url: string;
      blur_data: string | null;
      category_slot: string | null;
    }>;

    return NextResponse.json({
      success: true,
      data: {
        portals: portalRows.map((row) => ({
          id: row.id,
          imageUrl: row.image_url,
          blurData: row.blur_data ?? null,
          category: row.portal_slot,
        })),
        interviews: interviewRows.map((row) => ({
          id: row.id,
          imageUrl: row.image_url,
          blurData: row.blur_data ?? null,
          door: row.interview_slot,
        })),
        categories: categoryRows.map((row) => ({
          id: row.id,
          imageUrl: row.image_url,
          blurData: row.blur_data ?? null,
          path: row.category_slot,
        })),
      },
    });
  } catch (error) {
    console.error('[HOME_DOOR_API] Error:', error);
    return apiServerError('admin/gallery/portal', error);
  }
}
