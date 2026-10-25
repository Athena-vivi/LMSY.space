import type { Metadata } from 'next';
import { ChronicleTimeline } from '@/components/chronicle-timeline';
import { ChronicleChrome } from '@/components/chronicle-chrome';
import { getChronicleEvents, getChronicleYears } from '@/lib/timeline';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Timeline',
  description:
    'Every dated record in the archive, ordered by when it actually happened.',
  path: '/timeline',
});

export const revalidate = 300;

/** Only a clean 4-digit year is accepted; anything else means "newest year". */
function parseYearParam(raw: string | undefined): string | null {
  if (!raw || !/^\d{4}$/.test(raw)) return null;
  return raw;
}

/**
 * Timeline. The same derived view the Chronicle used to own, now under the
 * name the navigation uses. Records come from projects.event_date and
 * gallery_assets.event_date - never from created_at or the collection date.
 *
 * One year is rendered per request. The archive is past the point where every
 * year can be sent to the browser at once (a single unbounded query was being
 * cut off at PostgREST's 1000-row ceiling, silently dropping the newest
 * months), so this page opens on the newest year that has records and the
 * sidebar switches between them. No redirect: /timeline keeps its own URL and
 * stays the canonical entry point.
 */
export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const availableYears = await getChronicleYears();

  const requested = parseYearParam(yearParam);
  // An explicit year wins even when it holds no records - asking for 2019
  // should show the empty state for 2019, not silently jump to 2026.
  const activeYear = requested ?? availableYears[0] ?? null;

  const events = await getChronicleEvents(activeYear ?? undefined);

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 pt-14 pb-24 sm:px-6 md:pt-20 md:pb-32 lg:px-10 xl:px-14">
        <div className="relative xl:min-h-[calc(100vh-7rem)]">
          <ChronicleChrome
            eventCount={events.length}
            imageCount={events.reduce(
              (total, event) => total + (event.kind === 'images' ? event.images.length : 0),
              0
            )}
            availableYears={availableYears}
            activeYear={activeYear}
          />

          <section className="xl:pl-[260px]">
            <ChronicleTimeline
              events={events}
              activeYear={activeYear}
              availableYears={availableYears}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
