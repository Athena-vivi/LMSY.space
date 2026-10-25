import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';
import { t } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';

/**
 * /<lang>/live — the same door as /live, re-exported from the root route; the
 * provider seeds the language from the URL prefix. Metadata is per-language:
 * self-canonical on the prefixed URL, localized title.
 */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  return langPageMetadata(language, {
    title: t(language, 'live.title'),
    description:
      'Live streams Lookmhee & Sonya opened themselves — no cuts, no interviewer, the closest thing to them talking on their own.',
    path: '/live',
  });
}

export { default } from '../../live/page';
