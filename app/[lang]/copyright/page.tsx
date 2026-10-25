import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';
import { t } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';

/**
 * /<lang>/copyright — the same page as /copyright, re-exported from the root
 * route; the provider seeds the language from the URL prefix. Metadata is
 * per-language: self-canonical on the prefixed URL, localized title.
 */
type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  return langPageMetadata(language, {
    title: t(language, 'copyright.title'),
    description: '',
    path: '/copyright',
  });
}

export { default } from '../../copyright/page';
