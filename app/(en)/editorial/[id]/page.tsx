import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { getLocalizedText } from '@/lib/localized-content';
import { routeLanguage } from '@/lib/i18n-path';
import { loadEditorialIssue } from '@/lib/editorial-issues';
import { EditorialDetailContent } from './editorial-detail-content';

/**
 * /editorial/<slug> - one issue: its cover, its writing and every page in it.
 *
 * Level 2 of door 2, and the address a search result for the issue itself
 * lands on. This route was a 308 to /projects/<id> until 2026-10-21; it is a
 * real page again, because the issue is the entry and the entry owns a URL.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ lang?: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang: rawLang, id } = await params;
  const lang = routeLanguage(rawLang);
  const issue = await loadEditorialIssue(id);
  if (!issue) return { title: 'Issue Not Found' };

  const title = getLocalizedText(issue.title_i18n, lang, issue.title);
  const door = getTranslation(lang, 'editorial.title');

  return pageMetadata({
    title: `${title} · ${door}`,
    description:
      getLocalizedText(issue.description_i18n, lang, issue.description) ||
      (lang === 'en'
        ? `${title} — one magazine issue, kept with every page that was printed.`
        : `${title} · ${door}`),
    path: `/editorial/${issue.slug || issue.id}`,
    lang,
  });
}

export default async function EditorialIssuePage({ params }: PageProps) {
  const { id } = await params;
  const issue = await loadEditorialIssue(id);
  if (!issue) notFound();

  return (
    <EditorialDetailContent magazine={issue} galleryImages={issue.gallery_images} />
  );
}
