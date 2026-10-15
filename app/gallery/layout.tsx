import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Gallery',
  description:
    'Browse the LMSY archive gallery — magazine scans, official stills, behind-the-scenes and press event photographs of Lookmhee & Sonya.',
  path: '/gallery',
});

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
