import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isPublicProject } from '@/lib/project-visibility';
import { pageMetadata } from '@/lib/seo';
import { getLocalizedText } from '@/lib/localized-content';
import {
  DramaEventPageClient,
  type DramaEventPageAsset,
  type DramaEventPageEvent,
  type DramaEventPageSeries,
} from './event-client';

/**
 * /dramas/[slug]/[event] - one dated entry, and the pictures filed under it.
 *
 * The third level of door 1, and the reason the entry cards exist: a search for
 * "Affair OST" or "Hub Awards Affair" should be able to land on the entry
 * itself, not only on the series. So each entry owns a URL, a title and a
 * canonical.
 *
 * The page is a picture wall first. When an entry has no photograph yet it
 * still shows the frames it will fill - an empty frame is information, a
 * missing section is not.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string; event: string }>;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolve(slug: string, eventSlug: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: series } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select(
      'id, slug, title, title_i18n, subtype, event_date, release_date, cover_url, curation_status, portal_visible'
    )
    .eq('category', 'drama_work')
    .eq(UUID_PATTERN.test(slug) ? 'id' : 'slug', slug)
    .maybeSingle();

  if (!series || !isPublicProject(series)) return null;

  const { data: event } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('drama_events')
    .select(
      'id, project_id, group_key, slug, title, title_i18n, event_date, description, description_i18n, source_url, result, sort_order, media_kind, cover_url'
    )
    .eq('project_id', series.id)
    .eq('slug', eventSlug)
    .maybeSingle();

  if (!event) return null;

  const { data: assets } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, caption, catalog_id, rotation, event_id')
    .eq('event_id', event.id)
    .order('created_at', { ascending: true });

  return { series, event, assets: assets ?? [] };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, event: eventSlug } = await params;
  const found = await resolve(slug, eventSlug);

  if (!found) return { title: 'Entry Not Found' };

  const episode = getLocalizedText(found.event.title_i18n, 'en', found.event.title);
  const seriesName = getLocalizedText(found.series.title_i18n, 'en', found.series.title);

  return pageMetadata({
    title: `${episode} · ${seriesName}`,
    description:
      getLocalizedText(found.event.description_i18n, 'en', found.event.description) ||
      `${episode}, filed under ${seriesName}.`,
    path: `/dramas/${found.series.slug || found.series.id}/${found.event.slug}`,
  });
}

export default async function DramaEventPage({ params }: PageProps) {
  const { slug, event: eventSlug } = await params;
  const found = await resolve(slug, eventSlug);

  if (!found) notFound();

  return (
    <DramaEventPageClient
      series={found.series as unknown as DramaEventPageSeries}
      event={found.event as unknown as DramaEventPageEvent}
      assets={found.assets as unknown as DramaEventPageAsset[]}
    />
  );
}
