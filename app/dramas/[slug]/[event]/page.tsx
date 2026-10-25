import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabasePublic } from '@/lib/data/client';
import { isPublicProject } from '@/lib/project-visibility';
import { pageMetadata } from '@/lib/seo';
import { getLocalizedText } from '@/lib/localized-content';
import { routeLanguage } from '@/lib/i18n-path';
import { getDramaEntryByKey, getDramaEventSeries } from '@/lib/data/projects';
import { listEventPageAssets } from '@/lib/data/gallery-assets';
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
  params: Promise<{ lang?: string; slug: string; event: string }>;
}

async function resolve(slug: string, eventSlug: string) {
  const db = getSupabasePublic();

  const series = await getDramaEventSeries(db, slug);

  if (!series || !isPublicProject(series)) return null;

  // The entry is a project row too: same table, addressed by the work it
  // belongs to plus its own slug.
  const entry = await getDramaEntryByKey(db, series.work_id ?? series.id, eventSlug);

  if (!entry) return null;

  const event = {
    id: entry.id,
    group_key: entry.subtype ?? '',
    slug: entry.slug ?? entry.id,
    title: entry.title,
    title_i18n: entry.title_i18n,
    event_date: entry.event_date,
    description: entry.description,
    description_i18n: entry.description_i18n,
    source_url: entry.watch_url,
    result: awardResult(entry.tags as string[] | null),
    media_kind: entry.project_kind === 'video' ? 'video' : 'picture',
  };

  const assets = await listEventPageAssets(db, entry.id);

  return { series, event, assets };
}

function awardResult(tags: string[] | null): string | null {
  if (!tags) return null;
  if (tags.includes('award-won')) return 'won';
  if (tags.some((tag) => tag.startsWith('award-'))) return 'nominated';
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang: rawLang, slug, event: eventSlug } = await params;
  const lang = routeLanguage(rawLang);
  const found = await resolve(slug, eventSlug);

  if (!found) return { title: 'Entry Not Found' };

  const episode = getLocalizedText(found.event.title_i18n, lang, found.event.title);
  const seriesName = getLocalizedText(found.series.title_i18n, lang, found.series.title);

  return pageMetadata({
    title: `${episode} · ${seriesName}`,
    description:
      getLocalizedText(found.event.description_i18n, lang, found.event.description) ||
      (lang === 'en'
        ? `${episode}, filed under ${seriesName}.`
        : `${episode} · ${seriesName}`),
    path: `/dramas/${found.series.slug || found.series.id}/${found.event.slug}`,
    lang,
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
