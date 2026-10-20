import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
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
  params: Promise<{ subtype: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subtype } = await params;
  const key = subtypeLabelKey('live_stream', subtype);
  const name = key ? getTranslation('en', key) : 'Not filed yet';

  return pageMetadata({
    title: `${name} · Live`,
    description: `${name} — the streams Lookmhee & Sonya opened themselves, each with its own page.`,
    path: `/live/${subtype}`,
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
