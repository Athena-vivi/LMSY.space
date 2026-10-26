import type { Metadata } from 'next';
import { t } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';
import { routeLanguage } from '@/lib/i18n-path';
import { PeopleIndex } from '../../(en)/people/people-index';

/**
 * /<lang>/people — the index is a server component, so instead of re-exporting
 * the root page this shell renders the shared PeopleIndex with the language
 * from its own param. Metadata reads the same keys as the root route.
 */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = routeLanguage(lang);
  return langPageMetadata(language, {
    title: t(language, 'people.title'),
    description: t(language, 'meta.people'),
    path: '/people',
  });
}

export default async function LangPeoplePage({ params }: Props) {
  const { lang } = await params;
  return <PeopleIndex language={routeLanguage(lang)} />;
}
