import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';
import { t } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';

/**
 * /<lang>/about — the same page as /about, re-exported from the root route;
 * the provider seeds the language from the URL prefix. Metadata is
 * per-language: self-canonical on the prefixed URL, localized title.
 */
type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  return langPageMetadata(language, {
    title: t(language, 'nav.about'),
    description:
      'About LMSY Fan Archive — an unofficial fan-run archive for Thai GL duo LMSY (Lookmhee & Sonya).',
    path: '/about',
  });
}

export { default } from '../../about/page';
