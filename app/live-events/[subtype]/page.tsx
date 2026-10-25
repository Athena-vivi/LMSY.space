import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { routeLanguage } from '@/lib/i18n-path';
import { loadSegmentEntries, loadSegmentEntryGroups } from '@/lib/door-data';
import { LiveTimelinePage } from '@/components/doors/live-timeline';
import { subtypeLabelKey } from '@/lib/category-registry';

/**
 * /live-events/[subtype] - level 2: the entries filed under one sub-class.
 *
 * Rendered as a vertical timeline (2026-10-22): one node per entry, newest
 * first, and each node hangs its picture classes off the line as boxes that
 * open the entry filtered to that class. The segment is the URL form of the
 * stored value (`brand-event` for `brand_event`); a segment this hall does
 * not define is a 404, never a filtered copy of another shelf.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ lang?: string; subtype: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang: rawLang, subtype } = await params;
  const lang = routeLanguage(rawLang);
  const key = subtypeLabelKey('live_event', subtype);
  const name = key ? getTranslation(lang, key) : 'Not filed yet';
  const door = getTranslation(lang, 'category.liveEvent');

  return pageMetadata({
    title: `${name} · ${door}`,
    description:
      lang === 'en'
        ? `${name} — every entry Lookmhee & Sonya have in this shelf, each with its own pictures.`
        : `${name} · ${door}`,
    path: `/live-events/${subtype}`,
    lang,
  });
}

export default async function LiveEventShelfPage({ params }: PageProps) {
  const { subtype } = await params;
  const entries = await loadSegmentEntries('live_event', subtype);
  if (!entries) notFound();

  const groups = await loadSegmentEntryGroups('live_event', subtype);

  return (
    <LiveTimelinePage
      titleKey={subtypeLabelKey('live_event', subtype)}
      doorTitleKey="category.liveEvent"
      doorHref="/live-events"
      entries={entries}
      groups={groups}
    />
  );
}
