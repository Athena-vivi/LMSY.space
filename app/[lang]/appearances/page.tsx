import type { Metadata } from 'next';
import { t } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';
import { routeLanguage } from '@/lib/i18n-path';

/**
 * /<lang>/appearances — the same door as /appearances, re-exported from the root route;
 * the provider seeds the language from the URL prefix, so the body is already
 * in that language.
 *
 * Metadata is per-language too: the title and the description come from the
 * translation keys (never a hardcoded English sentence), and langPageMetadata
 * makes the prefixed URL self-canonical while the whole five-language hreflang
 * cluster still points at the bare path.
 */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = routeLanguage(lang);
  return langPageMetadata(language, {
    title: t(language, 'category.publicAppearance'),
    description: t(language, 'meta.appearances'),
    path: '/appearances',
  });
}

export { default } from '../../(en)/appearances/page';
