import type { Metadata } from 'next';
import { getTranslation } from '@/lib/languages';
import { pageMetadata } from '@/lib/seo';
import { loadFeatureTopics } from '@/lib/editorial-issues';
import { EditorialClient } from '@/app/(en)/editorial/editorial-client';

/**
 * /features - the special-topics rack.
 *
 * Same shelf layout as /editorial by design (temporary, until the topic door
 * gets its own layout): one card per theme project, cover on top, count
 * plate. The list is read on the server so the door is crawlable, exactly
 * like the magazine rack.
 */
export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Features',
  description: getTranslation('en', 'meta.features'),
  path: '/features',
});

export default async function FeaturesPage() {
  const topics = await loadFeatureTopics();

  return <EditorialClient issues={topics} ns="features" basePath="/features" />;
}
