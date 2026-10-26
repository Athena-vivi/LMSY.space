import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';

/**
 * /<lang>/whispers — the same page as /whispers, re-exported from the root
 * route; the provider seeds the language from the URL prefix. Metadata is
 * per-language: self-canonical on the prefixed URL. The root page has no
 * metadata export, so the title is the page's own English heading and the
 * description stays empty.
 */
type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  return langPageMetadata(language, {
    title: 'WHISPERS',
    description: '',
    path: '/whispers',
  });
}

export { default } from '../../(en)/whispers/page';
