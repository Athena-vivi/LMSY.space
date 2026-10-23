import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { loadDoorCategories } from '@/lib/door-data';
import { DoorCategoriesPage } from '@/components/doors/door-views';

/**
 * /appearances - homepage entry 4.
 *
 * Same three levels as door 1 and /live-events: door, shelf, entry. The six
 * shelves mirror list types A-F in docs/20261019-lmsy-public-appearance-list.md.
 */
export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Public Appearances',
  description:
    'Awards, fashion weeks, brand stages, company events — every time Lookmhee & Sonya stepped out and were seen.',
  path: '/appearances',
});

export default async function AppearancesPage() {
  const cards = await loadDoorCategories('public_appearance');
  const total = cards.reduce((sum, card) => sum + card.count, 0);

  return (
    <DoorCategoriesPage
      titleKey="category.publicAppearance"
      descriptionKey="door.description.appearances"
      cards={cards}
      total={total}
    />
  );
}
