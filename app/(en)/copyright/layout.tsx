import type { Metadata } from 'next';
import { getTranslation } from '@/lib/languages';
import { pageMetadata } from '@/lib/seo';

/**
 * Copyright is a client page ('use client' page.tsx), so it cannot export
 * metadata itself - same pattern as gallery: a nested layout carries it.
 * Title reuses the page's own heading string; description reuses the
 * existing `copyright.intro` translation (no new copy).
 */
export const metadata: Metadata = pageMetadata({
  title: 'Copyright Policy',
  description: getTranslation('en', 'meta.copyright'),
  path: '/copyright',
});

export default function CopyrightLayout({ children }: { children: React.ReactNode }) {
  return children;
}
