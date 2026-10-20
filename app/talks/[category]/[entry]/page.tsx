import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { getLocalizedText } from '@/lib/localized-content';
import { loadEntry } from '@/lib/door-data';
import { DoorEntryPage } from '@/components/doors/door-views';
import { TALK_CATEGORIES, categoryDefinition, normalizeCategory } from '@/lib/category-registry';

/**
 * /talks/[category]/<entry> - level 3: one conversation.
 *
 * This is the address a search result lands on: "Lookmhee Sonya interview 2025"
 * should open the conversation itself, not the shelf above it. The page carries
 * the introduction and the way out to the platform that hosts the video - the
 * archive does not host video (see app/talks on the door).
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ category: string; entry: string }>;
}

function talksCategoryOf(segment: string) {
  const category = normalizeCategory(segment);
  if (!category) return null;
  return (TALK_CATEGORIES as readonly string[]).includes(category) ? category : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: segment, entry } = await params;
  const category = talksCategoryOf(segment);
  if (!category) return { title: 'Entry Not Found' };

  const found = await loadEntry(category, entry);
  if (!found) return { title: 'Entry Not Found' };

  const title = getLocalizedText(found.entry.title_i18n, 'en', found.entry.title);
  const shelf = getTranslation('en', categoryDefinition(category)!.labelKey);

  return pageMetadata({
    title: `${title} · ${shelf}`,
    description:
      getLocalizedText(found.entry.description_i18n, 'en', found.entry.description) ||
      `${title} — ${shelf}, with Lookmhee & Sonya.`,
    path: `/talks/${category}/${found.entry.slug || found.entry.id}`,
  });
}

export default async function TalksEntryPage({ params }: PageProps) {
  const { category: segment, entry } = await params;
  const category = talksCategoryOf(segment);
  if (!category) notFound();

  const found = await loadEntry(category, entry);
  if (!found) notFound();

  const definition = categoryDefinition(category);

  return (
    <DoorEntryPage
      entry={found.entry}
      assets={found.assets}
      doorTitleKey="talks.title"
      doorHref="/talks"
      shelfTitleKey={definition?.labelKey ?? null}
      shelfHref={`/talks/${category}`}
    />
  );
}
