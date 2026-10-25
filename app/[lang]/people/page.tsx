import type { Metadata } from 'next';
import type { Language } from '@/lib/languages';
import { t } from '@/lib/languages';
import { langPageMetadata } from '@/lib/seo';
import { PeopleIndex } from '../../people/people-index';

/**
 * /<lang>/people — same index as /people, localized in the SSR HTML: the
 * server component receives the route language and renders the strings before
 * paint (server components cannot read the provider, hence the explicit prop).
 */
export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const language = lang as Language;
  return langPageMetadata(language, {
    title: t(language, 'people.title'),
    description: 'The two people this archive is built around.',
    path: '/people',
  });
}

export default async function LangPeoplePage({ params }: Props) {
  const { lang } = await params;
  return <PeopleIndex language={lang as Language} />;
}
