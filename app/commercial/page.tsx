import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { loadDoorEntries } from '@/lib/door-data';
import { DoorIndexPage } from '@/components/doors/door-views';

/**
 * /commercial - homepage entry 5.
 *
 * Two levels only: brand collaborations are the smallest unit, so the door
 * lists them directly. The layout follows /projects on purpose (a portrait
 * frame with its text, sides alternating) - the owner asked for that page's
 * look, not a new one.
 */
export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Commercial',
  description:
    'Campaigns, endorsements and brand films Lookmhee & Sonya made — kept here with the pictures behind them.',
  path: '/commercial',
});

export default async function CommercialPage() {
  const entries = await loadDoorEntries('commercial');

  return (
    <DoorIndexPage
      titleKey="category.commercial"
      descriptionKey="door.description.commercial"
      entries={entries}
    />
  );
}
