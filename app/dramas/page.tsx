import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { DramasClient, type DramaCardRow } from './dramas-client';

/**
 * /dramas - door 1: everything they acted in.
 *
 * Server-rendered on purpose. The three series pages and every dated entry
 * under them are the SEO surface of this hall, so the list cannot sit behind a
 * client fetch (the way /talks does): only the pictures and the language switch
 * are interactive.
 *
 * One hall, one front door - drama_work left the /projects index when this
 * page opened, so the same three rows no longer live under two addresses.
 */
export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Series',
  description:
    'Every story Lookmhee & Sonya have told, kept in one place - the series themselves, their music, the novels behind them, the announcements and the awards.',
  path: '/dramas',
});

export default async function DramasPage() {
  const series = await loadSeries();

  return <DramasClient series={series} />;
}

async function loadSeries(): Promise<DramaCardRow[]> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data } = await applyPublicProjectFilter(
    supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select(
        'id, slug, title, title_i18n, description, description_i18n, subtype, event_date, release_date, cover_url'
      )
  )
    .eq('category', 'drama_work')
    .order('event_date', { ascending: true, nullsFirst: false });

  const dramas = (data ?? []) as unknown as Omit<DramaCardRow, 'entryCount'>[];
  if (dramas.length === 0) return [];

  // One query for the counts: the door needs a number per card, not the
  // entries themselves.
  const { data: events } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('drama_events')
    .select('project_id')
    .in(
      'project_id',
      dramas.map((drama) => drama.id)
    );

  const counts: Record<string, number> = {};
  for (const row of events ?? []) {
    const id = (row as { project_id: string }).project_id;
    counts[id] = (counts[id] ?? 0) + 1;
  }

  return dramas.map((drama) => ({ ...drama, entryCount: counts[drama.id] ?? 0 }));
}
