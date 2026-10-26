import type { Metadata } from 'next';
import { getTranslation } from '@/lib/languages';
import { pageMetadata } from '@/lib/seo';
import { loadDoorCategories } from '@/lib/door-data';
import { DoorCategoriesPage } from '@/components/doors/door-views';

/**
 * /live - the door with no third party in the middle.
 *
 * Every other hall holds something that was filmed, edited and released by
 * somebody else. This one holds the streams they opened themselves: no cut, no
 * running time, no interviewer.
 *
 * Three levels since 2026-10-21: who held the phone splits the shelf - both of
 * them, or one of the two by name - so a stream is read at
 * /live/<duo|lookmhee|sonya>/<entry> instead of having no page at all.
 */
export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Live',
  description: getTranslation('en', 'meta.live'),
  path: '/live',
});

export default async function LivePage() {
  const cards = await loadDoorCategories('live_stream');
  const total = cards.reduce((sum, card) => sum + card.count, 0);

  return (
    <DoorCategoriesPage
      titleKey="live.title"
      descriptionKey="live.description"
      cards={cards}
      total={total}
    />
  );
}
