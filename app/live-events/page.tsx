import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { loadDoorCategories } from '@/lib/door-data';
import { DoorCategoriesPage } from '@/components/doors/door-views';

/**
 * /live-events - homepage entry 3.
 *
 * Three levels, same as door 1: this page (one card per sub-class), a shelf
 * page per sub-class, and one page per entry. Server-rendered, because the
 * entries underneath are the crawl surface for this hall.
 */
export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Live Events',
  description:
    'Fan meetings, brand nights and birthdays — every room Lookmhee & Sonya stood in, kept as pictures.',
  path: '/live-events',
});

export default async function LiveEventsPage() {
  const cards = await loadDoorCategories('live_event');
  const total = cards.reduce((sum, card) => sum + card.count, 0);

  return (
    <DoorCategoriesPage
      titleKey="category.liveEvent"
      descriptionKey="door.description.liveEvents"
      cards={cards}
      total={total}
    />
  );
}
