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

  // A series is a project row of its own (project_kind = 'series'); every entry
  // under it is another project row pointing back through work_id. One table,
  // one kind field - the door never talks to a second list.
  const { data } = await applyPublicProjectFilter(
    supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select(
        'id, work_id, slug, title, title_i18n, description, description_i18n, subtype, event_date, release_date, cover_url'
      )
  )
    .eq('category', 'drama_work')
    .eq('project_kind', 'series')
    // Newest series first: a new work appears at the top of the door the day
    // it is added, which is how every other door is read too.
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('release_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  const dramas = (data ?? []) as unknown as Array<
    Omit<DramaCardRow, 'entryCount'> & { work_id: string | null }
  >;
  if (dramas.length === 0) return [];

  // One query for the counts: the door needs a number per card, not the
  // entries themselves. An entry carries the same work_id as its series, so
  // the grouping key is the work, not the series row.
  const workIds = dramas
    .map((drama) => drama.work_id)
    .filter((id): id is string => Boolean(id));

  const { data: events } = workIds.length
    ? await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select('work_id')
        .in('work_id', workIds)
        .neq('project_kind', 'series')
    : { data: [] as Array<{ work_id: string | null }> };

  const counts: Record<string, number> = {};
  for (const row of events ?? []) {
    const id = (row as { work_id: string | null }).work_id;
    if (!id) continue;
    counts[id] = (counts[id] ?? 0) + 1;
  }

  return dramas.map((drama) => ({
    ...drama,
    entryCount: drama.work_id ? counts[drama.work_id] ?? 0 : 0,
  }));
}
