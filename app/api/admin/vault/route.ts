import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { normalizeLocalizedText } from '@/lib/localized-content';
import { getAdminEmail } from '@/lib/security/api-auth';
import { milestonePriorityToYear } from '@/lib/milestone-years';

type DraftPayload = {
  id: string;
  title?: { en?: string; zh?: string; th?: string } | string | null;
  description?: { en?: string; zh?: string; th?: string } | string | null;
  chronicle_title?: string | null;
  chronicle_excerpt?: string | null;
  chronicle_title_i18n?: { en?: string; zh?: string; th?: string } | null;
  chronicle_excerpt_i18n?: { en?: string; zh?: string; th?: string } | null;
  r2_media_url?: string | null;
  event_date?: string | null;
  chronicle_visible?: boolean;
  project_id?: string | null;
};

function extractLocalizedText(value: DraftPayload['title'] | DraftPayload['description']) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.en || value.zh || value.th || '';
}

/**
 * PostgREST answers at most 1000 rows per request (Supabase's db-max-rows),
 * so a single `.select('*')` silently truncates the asset vault and every
 * asset after the first 1000 becomes unreachable. Walk the table a page at a
 * time instead. `id` breaks ties on created_at so a page boundary can never
 * repeat or skip a row.
 */
const PAGE_SIZE = 1000;
const MAX_PAGES = 50; // hard stop well past the ten-thousand row mark

interface GalleryRow {
  id: string;
  image_url: string;
  milestone_priority: number | null;
  caption: string | null;
  tag: string | null;
  project_id?: string | null;
}

interface PagedResult<T> {
  rows: T[];
  error: { message: string } | null;
  /** True when the loop stopped at MAX_PAGES instead of the last row. */
  truncated: boolean;
}

async function fetchEveryRow<T>(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  table: 'gallery_assets' | 'projects',
  orderBy: 'created_at' | 'release_date'
): Promise<PagedResult<T>> {
  const rows: T[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from(table)
      .select('*')
      .order(orderBy, { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) return { rows, error, truncated: false };

    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return { rows, error: null, truncated: false };
  }

  return { rows, error: null, truncated: true };
}

export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', details: authResult.error },
      { status: 401 }
    );
  }

  const adminEmail = getAdminEmail();
  if (authResult.user.email?.toLowerCase() !== adminEmail) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const [galleryResult, projectsResult, draftsResult, galleryTotalResult] = await Promise.all([
      fetchEveryRow<GalleryRow>(supabaseAdmin, 'gallery_assets', 'created_at'),
      fetchEveryRow<Record<string, unknown>>(supabaseAdmin, 'projects', 'release_date'),
      supabaseAdmin
        .from('draft_items')
        .select('id,title,description,chronicle_title,chronicle_excerpt,chronicle_title_i18n,chronicle_excerpt_i18n,r2_media_url,event_date,chronicle_visible,project_id')
        .eq('status', 'published')
        .order('event_date', { ascending: false }),
      // The true row count, asked for explicitly. The tab badge reads this, so
      // it stays right even if a future ceiling stops the page walk early.
      supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('id', { count: 'exact', head: true }),
    ]);

    if (galleryResult.error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch gallery', details: galleryResult.error.message },
        { status: 500 }
      );
    }

    if (projectsResult.error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch projects', details: projectsResult.error.message },
        { status: 500 }
      );
    }

    if (draftsResult.error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch chronicle drafts', details: draftsResult.error.message },
        { status: 500 }
      );
    }

    const gallery = galleryResult.rows;
    const projects = projectsResult.rows;
    const drafts = (draftsResult.data || []) as DraftPayload[];
    /** Real table size; falls back to what was actually loaded. */
    const galleryTotal = galleryTotalResult.count ?? gallery.length;

    const milestones = Object.fromEntries(
      gallery
        .filter((item) => item.milestone_priority)
        .map((item) => {
          const year = milestonePriorityToYear(item.milestone_priority);

          return [
            year,
            {
              id: item.id,
              image_url: item.image_url,
              year,
              caption: item.caption,
              tag: item.tag,
            },
          ];
        })
    );

    const chronicle = drafts
      .filter((item) => item.event_date)
      .map((item) => {
        const titleI18n = normalizeLocalizedText(
          item.chronicle_title_i18n || item.title,
          item.chronicle_title || extractLocalizedText(item.title) || 'Untitled'
        );
        const excerptI18n = normalizeLocalizedText(
          item.chronicle_excerpt_i18n || item.description,
          item.chronicle_excerpt || extractLocalizedText(item.description) || ''
        );

        return {
          id: item.id,
          title: titleI18n.en || titleI18n.zh || titleI18n.th || 'Untitled',
          title_i18n: titleI18n,
          description: excerptI18n.en || excerptI18n.zh || excerptI18n.th || '',
          description_i18n: excerptI18n,
          event_date: item.event_date,
          event_type: 'custom',
          image_ids: [],
          image_url: item.r2_media_url || null,
          chronicle_visible: item.chronicle_visible ?? true,
          project_id: item.project_id || null,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        gallery,
        projects,
        events: chronicle,
        milestones,
      },
      debug: {
        gallery_count: gallery.length,
        gallery_total: galleryTotal,
        gallery_truncated: galleryResult.truncated,
        projects_count: projects.length,
        projects_truncated: projectsResult.truncated,
        chronicle_count: chronicle.length,
        milestone_count: Object.keys(milestones).length,
        first_gallery_id: gallery[0]?.id || null,
        first_gallery_project_id: gallery[0]?.project_id || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
