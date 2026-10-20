import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isPublicProject, applyPublicProjectFilter } from '@/lib/project-visibility';
import { pageMetadata } from '@/lib/seo';
import { getLocalizedText } from '@/lib/localized-content';
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SERIES_COLUMNS =
  'id, slug, title, title_i18n, description, description_i18n, subtype, event_date, release_date, cover_url, curation_status, portal_visible';

async function resolveSeries(slug: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select(SERIES_COLUMNS)
    .eq('category', 'drama_work')
    .eq('slug', slug)
    .maybeSingle();

  if (data) return data;
  if (!UUID_PATTERN.test(slug)) return null;

  const { data: byId } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select(SERIES_COLUMNS)
    .eq('category', 'drama_work')
    .eq('id', slug)
    .maybeSingle();

  return byId ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const drama = await resolveSeries(slug);

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
  const supabaseAdmin = getSupabaseAdmin();
  const drama = await resolveSeries(slug);

  if (!drama || !isPublicProject(drama)) {
    notFound();
  }

  const [{ data: events }, { data: assets }, { data: allSeries }] = await Promise.all([
    supabaseAdmin
      .schema('lmsy_archive')
      .from('drama_events')
      .select(
        'id, project_id, group_key, slug, title, title_i18n, event_date, description, description_i18n, source_url, result, sort_order, media_kind, cover_url'
      )
      .eq('project_id', drama.id),
    supabaseAdmin
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id, image_url, caption, catalog_id, rotation, event_id')
      .eq('project_id', drama.id)
      .order('created_at', { ascending: true }),
    applyPublicProjectFilter(
      supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select('id, slug, title, title_i18n, subtype, event_date, release_date, cover_url')
    )
      .eq('category', 'drama_work')
      .order('event_date', { ascending: true, nullsFirst: false }),
  ]);

  const assetsByEvent: Record<string, DramaAssetRow[]> = {};
  for (const asset of (assets ?? []) as DramaAssetRow[]) {
    if (!asset.event_id) continue;
    (assetsByEvent[asset.event_id] ??= []).push(asset);
  }

  const cards: DramaEventCard[] = ((events ?? []) as Array<
    Omit<DramaEventCard, 'cover' | 'imageCount'>
  >).map((event) => {
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
