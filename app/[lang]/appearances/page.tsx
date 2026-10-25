import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';
import { t } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';

/**
 * /<lang>/appearances — the same door as /appearances, re-exported from the
 * root route; the provider seeds the language from the URL prefix. Metadata
 * is per-language: self-canonical on the prefixed URL, localized title.
 */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  return langPageMetadata(language, {
    title: t(language, 'category.publicAppearance'),
    description:
      'Awards, fashion weeks, brand stages, company events — every time Lookmhee & Sonya stepped out and were seen.',
    path: '/appearances',
  });
}

export { default } from '../../appearances/page';
