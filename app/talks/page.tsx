import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { loadGroupCategories } from '@/lib/door-data';
import { DoorCategoriesPage } from '@/components/doors/door-views';
import { TALK_CATEGORIES } from '@/lib/category-registry';

/**
 * /talks - the first soul-resonance door.
 *
 * Three levels, like every other door: this page (one card per category), a
 * shelf page per category (`/talks/interview`), and one page per conversation.
 *
 * 2026-10-21: the three categories used to be client-side tabs on one page.
 * A tab has no address, so nothing underneath it could be found by a search
 * engine or linked to from anywhere. They are categories of this door now, and
 * each owns a page.
 */
export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Conversations',
  description:
    'Interviews, variety spots and radio — every time somebody else asked Lookmhee & Sonya, and cut the answer.',
  path: '/talks',
});

export default async function TalksPage() {
  const cards = await loadGroupCategories(TALK_CATEGORIES);
  const total = cards.reduce((sum, card) => sum + card.count, 0);

  return (
    <DoorCategoriesPage
      titleKey="talks.title"
      descriptionKey="talks.description"
      cards={cards}
      total={total}
    />
  );
}
