import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getLocalizedText } from '@/lib/localized-content';
import { loadEntry } from '@/lib/door-data';
import { DoorEntryPage } from '@/components/doors/door-views';

/**
 * /commercial/<entry> - one collaboration and the pictures behind it.
 *
 * No shelf level: this hall's rows are the entries themselves.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ event: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { event } = await params;
  const found = await loadEntry('commercial', event);
  if (!found) return { title: 'Entry Not Found' };

  const title = getLocalizedText(found.entry.title_i18n, 'en', found.entry.title);

  return pageMetadata({
    title: `${title} · Commercial`,
    description:
      getLocalizedText(found.entry.description_i18n, 'en', found.entry.description) ||
      `${title} — a brand collaboration, kept as pictures.`,
    path: `/commercial/${found.entry.slug || found.entry.id}`,
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
      doorTitleKey="category.commercial"
      doorHref="/commercial"
      shelfTitleKey={null}
      shelfHref={null}
    />
  );
}
