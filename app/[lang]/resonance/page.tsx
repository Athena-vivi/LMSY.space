import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';
import { t } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';

/**
 * /<lang>/resonance — the same page as /resonance, re-exported from the root
 * route; the provider seeds the language from the URL prefix. Metadata is
 * per-language: self-canonical on the prefixed URL, localized title.
 */
type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  return langPageMetadata(language, {
    title: t(language, 'nav.resonance'),
    description: '',
    path: '/resonance',
  });
}

export { default } from '../../(en)/resonance/page';
