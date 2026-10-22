import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { loadSegmentEntries, loadSegmentEntryGroups } from '@/lib/door-data';
import { LiveTimelinePage } from '@/components/doors/live-timeline';
import { subtypeLabelKey } from '@/lib/category-registry';

/**
 * /appearances/[subtype] - level 2: one of the six appearance shelves.
 *
 * Same vertical timeline as the live-events hall (2026-10-22): one node per
 * appearance, newest first, picture classes hanging off the line as boxes.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ subtype: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subtype } = await params;
  const key = subtypeLabelKey('public_appearance', subtype);
  const name = key ? getTranslation('en', key) : 'Not filed yet';

  return pageMetadata({
    title: `${name} · Public Appearances`,
    description: `${name} — every appearance Lookmhee & Sonya have in this shelf, each with its own pictures.`,
    path: `/appearances/${subtype}`,
  });
}

export default async function AppearanceShelfPage({ params }: PageProps) {
  const { subtype } = await params;
  const entries = await loadSegmentEntries('public_appearance', subtype);
  if (!entries) notFound();

  const groups = await loadSegmentEntryGroups('public_appearance', subtype);

  return (
    <LiveTimelinePage
      titleKey={subtypeLabelKey('public_appearance', subtype)}
      doorTitleKey="category.publicAppearance"
      doorHref="/appearances"
      entries={entries}
      groups={groups}
    />
  );
}
