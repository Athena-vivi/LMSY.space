import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';
import { t } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';

/**
 * /<lang>/editorial — the same issue rack as /editorial, seeded by the URL
 * language. The page body is re-exported from the root route (one component,
 * one data path); the provider picks the language up from the pathname, so no
 * prop drilling is needed. Only the metadata differs (self-canonical on the
 * prefixed URL, localized title).
 */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  return langPageMetadata(language, {
    title: t(language, 'editorial.title'),
    description:
      'Every magazine issue and publication Lookmhee & Sonya have appeared in, kept with its covers and catalog plates.',
    path: '/editorial',
  });
}

export { default } from '../../editorial/page';
