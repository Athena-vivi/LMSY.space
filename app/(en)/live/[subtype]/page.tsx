import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { routeLanguage } from '@/lib/i18n-path';
import { loadResourceCovers, loadSegmentEntries, loadSegmentEntryGroups } from '@/lib/door-data';
import { LiveTimelinePage } from '@/components/doors/live-timeline';
import { subtypeLabelKey } from '@/lib/category-registry';

/**
 * /live/[subtype] - level 2: the streams one person held, or both.
 *
 * `duo` / `lookmhee` / `sonya` are the shelves of this hall; `unfiled` appears
 * only when a stream has not been filed yet. Any other segment is a 404, never
 * a filtered copy of another shelf.
 *
 * Rendered as a vertical timeline like the talks door (2026-10-26): one node
 * per stream, newest first, hanging its picture classes off the line, plus a
 * Bilibili / YouTube box for every link saved in Settings > Live Video Links.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ lang?: string; subtype: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang: rawLang, subtype } = await params;
  const lang = routeLanguage(rawLang);
  const key = subtypeLabelKey('live_stream', subtype);
  const name = key ? getTranslation(lang, key) : 'Not filed yet';
  const door = getTranslation(lang, 'live.title');

  return pageMetadata({
    title: `${name} · ${door}`,
    description:
      lang === 'en'
        ? `${name} — the streams Lookmhee & Sonya opened themselves, each with its own page.`
        : `${name} · ${door} · ${getTranslation(lang, 'live.description')}`,
    path: `/live/${subtype}`,
    lang,
  });
}

export default async function LiveShelfPage({ params }: PageProps) {
  const { subtype } = await params;
  const entries = await loadSegmentEntries('live_stream', subtype);
  if (!entries) notFound();

  // Picture classes for the timeline boxes (a single "all photos" bucket while
  // a stream's pictures are not filed yet).
  const groups = await loadSegmentEntryGroups('live_stream', subtype);
  const resourceCovers = await loadResourceCovers(entries);

  return (
    <LiveTimelinePage
      titleKey={subtypeLabelKey('live_stream', subtype)}
      doorTitleKey="live.title"
      doorHref="/live"
      entries={entries}
      groups={groups}
      resourceCovers={resourceCovers}
    />
  );
}
