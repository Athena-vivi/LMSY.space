import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabasePublic } from '@/lib/data/client';
import { isPublicProject } from '@/lib/project-visibility';
import { pageMetadata } from '@/lib/seo';
import { getLocalizedText } from '@/lib/localized-content';
import {
  getDramaSeriesByKey,
  listDramaEntries,
  listDramaSeriesSiblings,
} from '@/lib/data/projects';
import { listDramaEntryAssets } from '@/lib/data/gallery-assets';
import {
  DramaDetailClient,
  type DramaAssetRow,
  type DramaEventCard,
  type DramaSeriesRow,
} from './drama-detail-client';

/**
 * /dramas/[slug] - one series, every entry under it.
 *
 * The SEO surface of door 1: three of these pages exist (one per series), each
 * server-rendered with its own title and canonical. The old address
 * /projects/[slug] for a drama_work row redirects here, so a series keeps
 * exactly one URL.
 *
 * Every event is handed to the client with the picture it opens on: its own
 * cover if it has one, otherwise the first image filed under it. An event with
 * no picture still gets a frame - this is a picture archive, so a blank slot
 * says "not photographed yet" instead of quietly shrinking the grid.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * The entry table is the project table. A row under a series carries the same
 * columns any other door uses, so the cards are read straight from it and only
 * renamed for display: subtype is the group, portal_priority the reading order,
 * project_kind tells a video from a picture, and the award outcome rides in
 * tags as award-won / award-nominated.
 */
interface EntryRow {
  id: string;
  work_id: string | null;
  slug: string | null;
  title: string;
  title_i18n: DramaEventCard['title_i18n'];
  event_date: string | null;
  description: string | null;
  description_i18n: DramaEventCard['description_i18n'];
  watch_url: string | null;
  tags: string[] | null;
  portal_priority: number | null;
  project_kind: string | null;
  subtype: string | null;
  cover_url: string | null;
  created_at: string | null;
}

function awardResult(tags: string[] | null): string | null {
  if (!tags) return null;
  if (tags.includes('award-won')) return 'won';
  if (tags.some((tag) => tag.startsWith('award-'))) return 'nominated';
  return null;
}

function toCard(row: EntryRow) {
  return {
    id: row.id,
    project_id: row.work_id ?? '',
    group_key: row.subtype ?? '',
    slug: row.slug ?? row.id,
    title: row.title,
    title_i18n: row.title_i18n,
    event_date: row.event_date,
    description: row.description,
    description_i18n: row.description_i18n,
    source_url: row.watch_url,
    result: awardResult(row.tags),
    sort_order: row.portal_priority ?? 0,
    media_kind: row.project_kind === 'video' ? 'video' : 'picture',
    cover_url: row.cover_url,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = getSupabasePublic();
  const drama = await getDramaSeriesByKey(db, slug);

  if (!drama || !isPublicProject(drama)) {
    return { title: 'Series Not Found' };
  }

  // The layout already appends "| LMSY Official Fan Site"; pageMetadata sets
  // the bare name plus the canonical path, so a series never carries the site
  // name twice and never competes with its own redirect target.
  const title = getLocalizedText(drama.title_i18n, 'en', drama.title);
  const description =
    getLocalizedText(drama.description_i18n, 'en', drama.description) ||
    `Everything archived under ${title}.`;

  return pageMetadata({
    title,
    description,
    path: `/dramas/${drama.slug || drama.id}`,
  });
}

export default async function DramaPage({ params }: PageProps) {
  const { slug } = await params;
  const db = getSupabasePublic();
  const drama = await getDramaSeriesByKey(db, slug);

  if (!drama || !isPublicProject(drama)) {
    notFound();
  }

  const seriesWorkId = (drama as { work_id?: string | null }).work_id ?? null;

  const events = await listDramaEntries(db, seriesWorkId ?? drama.id);
  const allSeries = await listDramaSeriesSiblings(db);

  const entryRows = (events as unknown as EntryRow[]).map(toCard);

  // Pictures are filed on the entry row itself, so one read over the entry ids
  // is enough to fill every card's first frame and every image count.
  const assets = await listDramaEntryAssets(db, entryRows.map((entry) => entry.id));

  const assetsByEvent: Record<string, DramaAssetRow[]> = {};
  for (const asset of (assets ?? []) as Array<DramaAssetRow & { project_id: string | null }>) {
    if (!asset.project_id) continue;
    (assetsByEvent[asset.project_id] ??= []).push(asset);
  }

  const cards: DramaEventCard[] = entryRows.map((event) => {
    const own = assetsByEvent[event.id] ?? [];
    return {
      ...event,
      imageCount: own.length,
      cover: event.cover_url || own[0]?.image_url || null,
    };
  });

  const siblings = (allSeries ?? []) as unknown as DramaSeriesRow[];

  return (
    <DramaDetailClient
      drama={drama as unknown as DramaSeriesRow}
      siblings={siblings}
      events={cards}
    />
  );
}
