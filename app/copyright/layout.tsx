import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

/**
 * Copyright is a client page ('use client' page.tsx), so it cannot export
 * metadata itself - same pattern as gallery: a nested layout carries it.
 * Title reuses the page's own heading string; description reuses the
 * existing `copyright.intro` translation (no new copy).
 */
export const metadata: Metadata = pageMetadata({
  title: 'Copyright Policy',
  description:
    'lmsy.space is a non-profit fan project dedicated to preserving and sharing the beautiful moments of Lookmhee & Sonya with their fans worldwide.',
  path: '/copyright',
});

export default function CopyrightLayout({ children }: { children: React.ReactNode }) {
  return children;
}
