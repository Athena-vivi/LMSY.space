import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getLocalizedText } from '@/lib/localized-content';
import { loadFeatureTopic } from '@/lib/editorial-issues';
import { EditorialDetailContent } from '@/app/editorial/[id]/editorial-detail-content';

/**
 * /features/<slug> - one special topic: its cover and every image in it.
 *
 * Level 2 of the features door. Same reading layout as an editorial issue
 * for now; the topic is the entry and the entry owns a URL.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await loadFeatureTopic(slug);
  if (!topic) return { title: 'Topic Not Found' };

  const title = getLocalizedText(topic.title_i18n, 'en', topic.title);

  return pageMetadata({
    title: `${title} · Features`,
    description:
      getLocalizedText(topic.description_i18n, 'en', topic.description) ||
      `${title} — a curated special topic, kept with every image in it.`,
    path: `/features/${topic.slug || topic.id}`,
  });
}

export default async function FeatureTopicPage({ params }: PageProps) {
  const { slug } = await params;
  const topic = await loadFeatureTopic(slug);
  if (!topic) notFound();

  return (
    <EditorialDetailContent
      magazine={topic}
      galleryImages={topic.gallery_images}
      backHref="/features"
      ns="features"
    />
  );
}
