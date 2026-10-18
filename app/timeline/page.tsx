import { ChronicleTimeline } from '@/components/chronicle-timeline';
import { ChronicleChrome } from '@/components/chronicle-chrome';
import { getChronicleEvents, extractYears } from '@/lib/timeline';

export const metadata = {
  title: 'Timeline | LMSY Archive',
  description:
    'Every dated record in the archive, ordered by when it actually happened.',
};

export const revalidate = 300;

/** Only a clean 4-digit year is accepted; anything else means "all years". */
function parseYearParam(raw: string | undefined): string | null {
  if (!raw || !/^\d{4}$/.test(raw)) return null;
  return raw;
}

/**
 * Timeline. The same derived view the Chronicle used to own, now under the
 * name the navigation uses. Records come from projects.event_date and
 * gallery_assets.event_date - never from created_at or the collection date.
 */
export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const activeYear = parseYearParam(yearParam);

  const allEvents = await getChronicleEvents();
  const availableYears = extractYears(allEvents);
  const events = activeYear
    ? allEvents.filter((event) => event.date.slice(0, 4) === activeYear)
    : allEvents;

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
