import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getLocalizedText } from '@/lib/localized-content';
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
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const issue = await loadEditorialIssue(id);
  if (!issue) return { title: 'Issue Not Found' };

  const title = getLocalizedText(issue.title_i18n, 'en', issue.title);

  return pageMetadata({
    title: `${title} · Editorial`,
    description:
      getLocalizedText(issue.description_i18n, 'en', issue.description) ||
      `${title} — one magazine issue, kept with every page that was printed.`,
    path: `/editorial/${issue.slug || issue.id}`,
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
