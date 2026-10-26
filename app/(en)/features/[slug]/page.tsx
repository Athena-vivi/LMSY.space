import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { getLocalizedText } from '@/lib/localized-content';
import { routeLanguage } from '@/lib/i18n-path';
import { loadFeatureTopic } from '@/lib/editorial-issues';
import { EditorialDetailContent } from '@/app/(en)/editorial/[id]/editorial-detail-content';

/**
 * /features/<slug> - one special topic: its cover and every image in it.
 *
 * Level 2 of the features door. Same reading layout as an editorial issue
 * for now; the topic is the entry and the entry owns a URL.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ lang?: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const lang = routeLanguage(rawLang);
  const topic = await loadFeatureTopic(slug);
  if (!topic) return { title: 'Topic Not Found' };

  const title = getLocalizedText(topic.title_i18n, lang, topic.title);
  const door = getTranslation(lang, 'features.title');

  return pageMetadata({
    title: `${title} · ${door}`,
    description:
      getLocalizedText(topic.description_i18n, lang, topic.description) ||
      (lang === 'en'
        ? `${title} — a curated special topic, kept with every image in it.`
        : `${title} · ${door}`),
    path: `/features/${topic.slug || topic.id}`,
    lang,
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
