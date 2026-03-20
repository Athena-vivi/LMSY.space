import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { normalizeLocalizedText } from '@/lib/localized-content';

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

export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', details: authResult.error },
      { status: 401 }
    );
  }

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (authResult.user.email !== adminEmail) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const [galleryResult, projectsResult, draftsResult] = await Promise.all([
      supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select('*')
        .order('release_date', { ascending: false }),
      supabaseAdmin
        .from('draft_items')
        .select('id,title,description,chronicle_title,chronicle_excerpt,chronicle_title_i18n,chronicle_excerpt_i18n,r2_media_url,event_date,chronicle_visible,project_id')
        .eq('status', 'published')
        .order('event_date', { ascending: false }),
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

    const gallery = galleryResult.data || [];
    const projects = projectsResult.data || [];
    const drafts = (draftsResult.data || []) as DraftPayload[];

    const milestones = Object.fromEntries(
      gallery
        .filter((item) => item.milestone_priority)
        .map((item) => {
          const yearMap: Record<number, string> = {
            1: '2022',
            2: '2023',
            3: '2024',
            4: '2025',
            5: '∞',
          };

          return [
            yearMap[item.milestone_priority as number],
            {
              id: item.id,
              image_url: item.image_url,
              year: yearMap[item.milestone_priority as number],
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
        projects_count: projects.length,
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
