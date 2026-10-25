import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';
import { t } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';

/**
 * /<lang>/live-events — the same door as /live-events, re-exported from the
 * root route; the provider seeds the language from the URL prefix. Metadata
 * is per-language: self-canonical on the prefixed URL, localized title.
 */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  return langPageMetadata(language, {
    title: t(language, 'portal.live'),
    description:
      'Fan meetings, brand nights and birthdays — every room Lookmhee & Sonya stood in, kept as pictures.',
    path: '/live-events',
  });
}

export { default } from '../../live-events/page';
