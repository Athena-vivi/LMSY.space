import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/seo';
import { getTranslation } from '@/lib/languages';
import { routeLanguage } from '@/lib/i18n-path';
import { loadCategoryEntryGroups, loadResourceCovers, loadRows } from '@/lib/door-data';
import { TalksTimelinePage } from '@/components/doors/talks-timeline';
import { TALK_CATEGORIES, categoryDefinition, normalizeCategory } from '@/lib/category-registry';

/**
 * /talks/[category] - level 2: one shelf of the conversations door, rendered
 * as a vertical timeline (2026-10-22). One node per interview, newest first;
 * each node hangs its resources off the line - Bilibili / YouTube links out,
 * the archived pictures and the transcript route into the entry's page.
 *
 * The segment is the category itself (`interview`, `variety`, `radio`), which
 * is the shelf a visitor picks on the door. Anything else is a 404: the three
 * categories are the whole vocabulary of this door, so an unknown segment must
 * not render a filtered copy of the others.
 */
export const revalidate = 300;

interface PageProps {
  params: Promise<{ lang?: string; category: string }>;
}

function talksCategoryOf(segment: string) {
  const category = normalizeCategory(segment);
  if (!category) return null;
  return (TALK_CATEGORIES as readonly string[]).includes(category) ? category : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang: rawLang, category: segment } = await params;
  const lang = routeLanguage(rawLang);
  const category = talksCategoryOf(segment);
  const definition = category ? categoryDefinition(category) : null;
  const name = definition
    ? getTranslation(lang, definition.labelKey)
    : getTranslation(lang, 'talks.title');
  const door = getTranslation(lang, 'talks.title');

  return pageMetadata({
    title: `${name} · ${door}`,
    description:
      lang === 'en'
        ? `${name} — every conversation Lookmhee & Sonya had in this shelf, each with its own page.`
        : `${name} · ${door} · ${getTranslation(lang, 'talks.description')}`,
    path: `/talks/${segment}`,
    lang,
  });
}

export default async function TalksShelfPage({ params }: PageProps) {
  const { category: segment } = await params;
  const category = talksCategoryOf(segment);
  if (!category) notFound();

  // The shelf IS the category, so there is no sub-class segment to filter by.
  const entries = await loadRows([category]);
  const groups = await loadCategoryEntryGroups(category);
  const resourceCovers = await loadResourceCovers(entries);

  return (
    <TalksTimelinePage
      titleKey={categoryDefinition(category)?.labelKey ?? null}
      doorTitleKey="talks.title"
      doorHref="/talks"
      entries={entries}
      groups={groups}
      resourceCovers={resourceCovers}
    />
  );
}
