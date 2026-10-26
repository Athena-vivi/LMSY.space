import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChronicleTimeline } from '@/components/chronicle-timeline';
import { ChronicleChrome } from '@/components/chronicle-chrome';
import { getTranslation } from '@/lib/languages';
import { routeLanguage } from '@/lib/i18n-path';
import { getChronicleEvents, getChronicleYears } from '@/lib/timeline';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang?: string; year: string }>;
}): Promise<Metadata> {
  const { lang: rawLang, year } = await params;
  const lang = routeLanguage(rawLang);
  const door = getTranslation(lang, 'timeline.title');

  // A malformed year is a bad URL, not an empty year.
  if (!/^\d{4}$/.test(year)) {
    return pageMetadata({
      title: door,
      description:
        lang === 'en'
          ? 'Every dated record in the archive, ordered by when it actually happened.'
          : getTranslation(lang, 'timeline.description'),
      path: '/timeline',
      lang,
    });
  }

  return pageMetadata({
    title: `${door} ${year}`,
    description:
      lang === 'en'
        ? `Every dated record from ${year} in the archive, ordered by when it actually happened.`
        : `${year} · ${getTranslation(lang, 'timeline.description')}`,
    path: `/timeline/${year}`,
    lang,
  });
}

export function generateStaticParams() {
  // Years are generated at build time; a year with no records still works
  // (empty state), so there is no need to enumerate them from data.
  return [];
}

/**
 * One year of the timeline.
 *
 * This route reads a single year, so its query carries an event_date range and
 * cannot run into PostgREST's 1000-row ceiling on a busy year. It stays the
 * addressable form of the archive - /timeline?year=YYYY renders the same view
 * dynamically for the sidebar links.
 */
export default async function TimelineYearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  // A malformed year is a bad URL, not an empty year.
  if (!/^\d{4}$/.test(year)) notFound();

  const availableYears = await getChronicleYears();
  const events = await getChronicleEvents(year);

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 pt-14 pb-24 sm:px-6 md:pt-20 md:pb-32 lg:px-10 xl:px-14">
        <div className="relative xl:min-h-[calc(100vh-7rem)]">
          <ChronicleChrome
            eventCount={events.length}
            imageCount={events.reduce((total, event) => total + event.images.length, 0)}
            availableYears={availableYears}
            activeYear={year}
          />

          <section className="xl:pl-[260px]">
            <ChronicleTimeline
              events={events}
              activeYear={year}
              availableYears={availableYears}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
