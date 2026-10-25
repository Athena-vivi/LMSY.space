import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { getLocalizedText } from '@/lib/localized-content';
import { routeLanguage } from '@/lib/i18n-path';
import { loadEntry } from '@/lib/door-data';
import { DoorEntryPage } from '@/components/doors/door-views';
import { subtypeLabelKey } from '@/lib/category-registry';

/**
 * /live/<duo|lookmhee|sonya>/<entry> - level 3: one stream.
 *
 * The archive does not host video, so the page is the record plus the way out
 * to the platform that does. A stream with no link yet keeps the page: it is
 * dated, titled and described, and the watch button says the link is being
 * confirmed rather than pretending to play something.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ lang?: string; subtype: string; entry: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang: rawLang, subtype, entry } = await params;
  const lang = routeLanguage(rawLang);
  const found = await loadEntry('live_stream', entry, subtype);
  if (!found) return { title: 'Entry Not Found' };

  const title = getLocalizedText(found.entry.title_i18n, lang, found.entry.title);
  const labelKey = subtypeLabelKey('live_stream', subtype);
  const shelf = labelKey ? getTranslation(lang, labelKey) : 'Live';

  return pageMetadata({
    title: `${title} · ${shelf}`,
    description:
      getLocalizedText(found.entry.description_i18n, lang, found.entry.description) ||
      (lang === 'en'
        ? `${title} — a ${shelf.toLowerCase()} stream from Lookmhee & Sonya.`
        : `${title} · ${shelf}`),
    path: `/live/${subtype}/${found.entry.slug || found.entry.id}`,
    lang,
  });
}

export default async function LiveEntryPage({ params }: PageProps) {
  const { subtype, entry } = await params;
  const found = await loadEntry('live_stream', entry, subtype);
  if (!found) notFound();

  return (
    <DoorEntryPage
      entry={found.entry}
      assets={found.assets}
      doorTitleKey="live.title"
      doorHref="/live"
      shelfTitleKey={subtypeLabelKey('live_stream', subtype)}
      shelfHref={`/live/${subtype}`}
    />
  );
}
