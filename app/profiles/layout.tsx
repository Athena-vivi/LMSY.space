import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Profiles',
  description: 'Profiles of the LMSY archive — Lookmhee and Sonya: biography, works and milestones.',
  path: '/profiles',
});

export default function ProfilesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
