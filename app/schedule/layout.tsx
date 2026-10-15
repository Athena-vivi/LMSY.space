import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Schedule',
  description: 'Upcoming and past schedule for Lookmhee & Sonya — events, broadcasts and appearances.',
  path: '/schedule',
});

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
