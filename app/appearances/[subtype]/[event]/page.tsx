import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { getLocalizedText } from '@/lib/localized-content';
import { loadEntry } from '@/lib/door-data';
import { DoorEntryPage } from '@/components/doors/door-views';
import { subtypeLabelKey } from '@/lib/category-registry';

/**
 * /appearances/[subtype]/<entry> - level 3: one appearance and its pictures.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ subtype: string; event: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subtype, event } = await params;
  const found = await loadEntry('public_appearance', event, subtype);
  if (!found) return { title: 'Entry Not Found' };

  const title = getLocalizedText(found.entry.title_i18n, 'en', found.entry.title);
  const labelKey = subtypeLabelKey('public_appearance', subtype);
  const shelf = labelKey ? getTranslation('en', labelKey) : 'Public Appearances';

  return pageMetadata({
    title: `${title} · ${shelf}`,
    description:
      getLocalizedText(found.entry.description_i18n, 'en', found.entry.description) ||
      `${title} — ${shelf}, kept as pictures.`,
    path: `/appearances/${subtype}/${found.entry.slug || found.entry.id}`,
  });
}

export default async function AppearanceEntryPage({ params }: PageProps) {
  const { subtype, event } = await params;
  const found = await loadEntry('public_appearance', event, subtype);
  if (!found) notFound();

  return (
    <DoorEntryPage
      entry={found.entry}
      assets={found.assets}
      doorTitleKey="category.publicAppearance"
      doorHref="/appearances"
      shelfTitleKey={subtypeLabelKey('public_appearance', subtype)}
      shelfHref={`/appearances/${subtype}`}
    />
  );
}
