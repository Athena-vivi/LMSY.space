import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { getSupabasePublic } from '@/lib/data/client';
import { countDramaEntriesByWorkId, listDramaSeries } from '@/lib/data/projects';
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
  const db = getSupabasePublic();

  // A series is a project row of its own (project_kind = 'series'); every entry
  // under it is another project row pointing back through work_id. One table,
  // one kind field - the door never talks to a second list.
  const dramas = (await listDramaSeries(db)) as unknown as Array<
    Omit<DramaCardRow, 'entryCount'> & { work_id: string | null }
  >;
  if (dramas.length === 0) return [];

  // One query for the counts: the door needs a number per card, not the
  // entries themselves. An entry carries the same work_id as its series, so
  // the grouping key is the work, not the series row.
  const workIds = dramas
    .map((drama) => drama.work_id)
    .filter((id): id is string => Boolean(id));

  const counts = await countDramaEntriesByWorkId(db, workIds);

  return dramas.map((drama) => ({
    ...drama,
    entryCount: drama.work_id ? counts[drama.work_id] ?? 0 : 0,
  }));
}
