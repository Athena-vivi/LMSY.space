import type { Metadata } from 'next';
import { defaultLanguage } from '@/lib/languages';
import { pageMetadata } from '@/lib/seo';
import { PeopleIndex } from './people-index';

export const metadata: Metadata = pageMetadata({
  title: 'People',
  description: 'The two people this archive is built around.',
  path: '/people',
});

export const revalidate = 300;

/**
 * People index. One data source (`profiles` + `project_people`) for the
 * homepage cards, this page and the person detail page - the archive no
 * longer keeps a static profile page and a database profile page that can
 * disagree with each other. Rendering lives in people-index.tsx so the
 * language-prefixed shell (/zh/people etc.) can reuse it with a lang param.
 */
export default async function PeoplePage() {
  return <PeopleIndex language={defaultLanguage} />;
}
