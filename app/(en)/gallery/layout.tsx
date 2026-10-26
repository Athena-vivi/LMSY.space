import type { Metadata } from 'next';
import { getTranslation } from '@/lib/languages';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Gallery',
  description: getTranslation('en', 'meta.gallery'),
  path: '/gallery',
});

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
