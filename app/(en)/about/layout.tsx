import type { Metadata } from 'next';
import { getTranslation } from '@/lib/languages';
import { pageMetadata } from '@/lib/seo';

/**
 * About is a client page ('use client' page.tsx), so it cannot export
 * metadata itself - same arrangement as /copyright and /gallery: a nested
 * layout carries it, reading the same `about.*` keys the page renders.
 */
export const metadata: Metadata = pageMetadata({
  title: getTranslation('en', 'about.title'),
  description: getTranslation('en', 'meta.about'),
  path: '/about',
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
