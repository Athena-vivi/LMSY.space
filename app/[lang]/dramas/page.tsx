import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';
import { t } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';

/**
 * /<lang>/dramas — the same door as /dramas, re-exported from the root route;
 * the provider seeds the language from the URL prefix. Metadata is
 * per-language: self-canonical on the prefixed URL, localized title.
 */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  return langPageMetadata(language, {
    title: t(language, 'dramas.title'),
    description:
      'Every story Lookmhee & Sonya have told, kept in one place - the series themselves, their music, the novels behind them, the announcements and the awards.',
    path: '/dramas',
  });
}

export { default } from '../../dramas/page';
