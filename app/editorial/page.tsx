import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { loadEditorialIssues } from '@/lib/editorial-issues';
import { EditorialClient } from './editorial-client';

/**
 * /editorial - door 2: the issue rack.
 *
 * Restored to the layout it had before phase 6 flattened it into a filtered
 * copy of /projects: covers on a shelf, one card per issue, catalog plates.
 *
 * The list is read on the server now. It used to arrive from /api/editorial
 * after paint, so the HTML held a loading skeleton and nothing for a crawler
 * to follow - which defeats the point of giving every issue its own address.
 */
export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Editorial',
  description:
    'Every magazine issue and publication Lookmhee & Sonya have appeared in, kept with its covers and catalog plates.',
  path: '/editorial',
});

export default async function EditorialPage() {
  const issues = await loadEditorialIssues();

  return <EditorialClient issues={issues} />;
}
