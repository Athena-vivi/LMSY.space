import type { Metadata } from 'next';
import { getTranslation } from '@/lib/languages';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Schedule',
  description: getTranslation('en', 'meta.schedule'),
  path: '/schedule',
});

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
