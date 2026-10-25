import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';
import { t } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';

/**
 * /<lang>/gallery — the same SSR first screen as /gallery, re-exported from
 * the root route; the provider seeds the language from the URL prefix.
 * Metadata is per-language: self-canonical on the prefixed URL, localized
 * title. (Localized meta descriptions land in step 4 of the routing plan.)
 */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  return langPageMetadata(language, {
    title: t(language, 'gallery.title'),
    description:
      'Every photo in the archive — magazine editorials, advertising, stage and stills — browsable and filterable by tag.',
    path: '/gallery',
  });
}

export { default } from '../../gallery/page';
