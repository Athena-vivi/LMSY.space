import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { getLocalizedText } from '@/lib/localized-content';
import { loadEntry } from '@/lib/door-data';
import { DoorEntryPage } from '@/components/doors/door-views';
import { subtypeLabelKey } from '@/lib/category-registry';

/**
 * /live-events/[subtype]/<entry> - level 3: one entry and its picture wall.
 *
 * This is the address a search result lands on, which is the whole point of
 * the third level: "Lookmhee Sonya fan meeting 2025" should open the entry
 * itself, not the shelf above it.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ subtype: string; event: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subtype, event } = await params;
  const found = await loadEntry('live_event', event, subtype);
  if (!found) return { title: 'Entry Not Found' };

  const title = getLocalizedText(found.entry.title_i18n, 'en', found.entry.title);
  const labelKey = subtypeLabelKey('live_event', subtype);
  const shelf = labelKey ? getTranslation('en', labelKey) : 'Live Events';

  return pageMetadata({
    title: `${title} · ${shelf}`,
    description:
      getLocalizedText(found.entry.description_i18n, 'en', found.entry.description) ||
      `${title} — ${shelf}, kept as pictures.`,
    path: `/live-events/${subtype}/${found.entry.slug || found.entry.id}`,
  });
}

export default async function LiveEventEntryPage({ params }: PageProps) {
  const { subtype, event } = await params;
  const found = await loadEntry('live_event', event, subtype);
  if (!found) notFound();

  return (
    <DoorEntryPage
      entry={found.entry}
      assets={found.assets}
      doorTitleKey="category.liveEvent"
      doorHref="/live-events"
      shelfTitleKey={subtypeLabelKey('live_event', subtype)}
      shelfHref={`/live-events/${subtype}`}
    />
  );
}
