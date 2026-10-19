import { Suspense } from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { LiveClient } from './live-client';

/**
 * /live - the second soul-resonance door.
 *
 * Server shell only; the list is client-rendered like the rest of the archive
 * surfaces so switching language does not reload the page.
 */
export const metadata: Metadata = pageMetadata({
  title: 'Said Themselves',
  description:
    'Live streams Lookmhee & Sonya opened themselves — no cuts, no interviewer, the closest thing to them talking on their own.',
  path: '/live',
});

export default function LivePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted border-t-foreground" />
        </div>
      }
    >
      <LiveClient />
    </Suspense>
  );
}
