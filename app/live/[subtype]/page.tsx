import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { routeLanguage } from '@/lib/i18n-path';
import { loadSegmentEntries } from '@/lib/door-data';
import { DoorEntriesPage } from '@/components/doors/door-views';
import { subtypeLabelKey } from '@/lib/category-registry';

/**
 * /live/[subtype] - level 2: the streams one person held, or both.
 *
 * `duo` / `lookmhee` / `sonya` are the shelves of this hall; `unfiled` appears
 * only when a stream has not been filed yet. Any other segment is a 404, never
 * a filtered copy of another shelf.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ lang?: string; subtype: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang: rawLang, subtype } = await params;
  const lang = routeLanguage(rawLang);
  const key = subtypeLabelKey('live_stream', subtype);
  const name = key ? getTranslation(lang, key) : 'Not filed yet';
  const door = getTranslation(lang, 'live.title');

  return pageMetadata({
    title: `${name} · ${door}`,
    description:
      lang === 'en'
        ? `${name} — the streams Lookmhee & Sonya opened themselves, each with its own page.`
        : `${name} · ${door} · ${getTranslation(lang, 'live.description')}`,
    path: `/live/${subtype}`,
    lang,
  });
}

export default async function LiveShelfPage({ params }: PageProps) {
  const { subtype } = await params;
  const entries = await loadSegmentEntries('live_stream', subtype);
  if (!entries) notFound();

  return (
    <DoorEntriesPage
      titleKey={subtypeLabelKey('live_stream', subtype)}
      doorTitleKey="live.title"
      doorHref="/live"
      entries={entries}
    />
  );
}
