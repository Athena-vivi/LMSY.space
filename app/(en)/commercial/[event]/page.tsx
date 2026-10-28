import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { getLocalizedText } from '@/lib/localized-content';
import { routeLanguage } from '@/lib/i18n-path';
import { loadEntry } from '@/lib/door-data';
import { DoorEntryPage } from '@/components/doors/door-views';

/**
 * /commercial/<entry> - one collaboration and the pictures behind it.
 *
 * No shelf level: this hall's rows are the entries themselves.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ lang?: string; event: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang: rawLang, event } = await params;
  const lang = routeLanguage(rawLang);
  const found = await loadEntry('commercial', event);
  if (!found) return { title: 'Entry Not Found' };

  const title = getLocalizedText(found.entry.title_i18n, lang, found.entry.title);
  const hall = getTranslation(lang, 'category.commercial');

  return pageMetadata({
    title: `${title} · ${hall}`,
    description:
      getLocalizedText(found.entry.description_i18n, lang, found.entry.description) ||
      (lang === 'en'
        ? `${title} — a brand collaboration, kept as pictures.`
        : `${title} · ${hall}`),
    path: `/commercial/${found.entry.slug || found.entry.id}`,
    lang,
  });
}

export default async function CommercialEntryPage({ params }: PageProps) {
  const { event } = await params;
  const found = await loadEntry('commercial', event);
  if (!found) notFound();

  return (
    <DoorEntryPage
      entry={found.entry}
      assets={found.assets}
      resourceCovers={found.resourceCovers}
      doorTitleKey="category.commercial"
      doorHref="/commercial"
      shelfTitleKey={null}
      shelfHref={null}
    />
  );
}
