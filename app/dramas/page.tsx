import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { DramasClient, type DramaEventRow, type DramaRow } from './dramas-client';

/**
 * /dramas - door 1: everything they acted in.
 *
 * Server-rendered on purpose. The three series pages and every dated entry
 * under them are the SEO surface of this hall, so the list cannot sit behind a
 * client fetch (the way /talks does): only the tab switching is interactive.
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
  const { dramas, events, assetCounts } = await loadDoorOne();

  return <DramasClient dramas={dramas} events={events} assetCounts={assetCounts} />;
}

async function loadDoorOne(): Promise<{
  dramas: DramaRow[];
  events: DramaEventRow[];
  assetCounts: Record<string, number>;
}> {
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

  const dramas = (data ?? []) as unknown as DramaRow[];
  if (dramas.length === 0) {
    return { dramas: [], events: [], assetCounts: {} };
  }

  const ids = dramas.map((drama) => drama.id);

  // The events and the asset counts are two small queries; running them in
  // parallel keeps the page at one round trip of latency.
  const [{ data: events }, { data: assets }] = await Promise.all([
    supabaseAdmin
      .schema('lmsy_archive')
      .from('drama_events')
      .select(
        'project_id, group_key, slug, title, event_date, description, source_url, result, sort_order'
      )
      .in('project_id', ids),
    supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('project_id')
      .in('project_id', ids),
  ]);

  const assetCounts: Record<string, number> = {};
  for (const asset of assets ?? []) {
    const row = asset as { project_id: string };
    assetCounts[row.project_id] = (assetCounts[row.project_id] ?? 0) + 1;
  }

  return {
    dramas,
    events: (events ?? []) as unknown as DramaEventRow[],
    assetCounts,
  };
}
