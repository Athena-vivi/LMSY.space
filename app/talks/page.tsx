import { Suspense } from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { TalksClient } from './talks-client';

/**
 * /talks - the first soul-resonance door.
 *
 * Server shell only: the tabs are client state (four buttons filtering one
 * already-loaded list, no route change), so the component behind the Suspense
 * boundary holds the whole view.
 */
export const metadata: Metadata = pageMetadata({
  title: 'Conversations',
  description:
    'Interviews, variety spots and radio — every time somebody else asked Lookmhee & Sonya, and cut the answer.',
  path: '/talks',
});

export default function TalksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted border-t-foreground" />
        </div>
      }
    >
      <TalksClient />
    </Suspense>
  );
}
