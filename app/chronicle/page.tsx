import { ChronicleTimeline } from '@/components/chronicle-timeline';
import { ChronicleChrome } from '@/components/chronicle-chrome';
import { getChronicleEvents, extractYears } from '@/lib/timeline';

export const metadata = {
  title: 'Chronicle Timeline | LMSY Archive',
  description: 'A chronological journey through Lookmhee & Sonya\'s works, photoshoots, and archive moments.',
};

// Server-rendered from the archive; cache and refresh every 5 minutes.
// The ?year= filter comes from homepage milestone cards; Next renders this
// dynamically per searchParams while the underlying data stays cached.
export const revalidate = 300;

/** Only a clean 4-digit year is accepted; anything else means "all years". */
function parseYearParam(raw: string | undefined): string | null {
  if (!raw || !/^\d{4}$/.test(raw)) return null;
  return raw;
}

export default async function ChroniclePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const activeYear = parseYearParam(yearParam);

  const allEvents = await getChronicleEvents();
  const availableYears = extractYears(allEvents);
  const events = activeYear
    ? allEvents.filter((e) => e.date.slice(0, 4) === activeYear)
    : allEvents;
  // A year param that parses but has no events (or was never a real year)
  // still renders a normal empty state - no error, no crash.

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 pt-14 pb-24 sm:px-6 md:pt-20 md:pb-32 lg:px-10 xl:px-14">
        <div className="relative xl:min-h-[calc(100vh-7rem)]">
          <ChronicleChrome
            eventCount={events.length}
            imageCount={events.reduce((n, e) => n + (e.kind === 'images' ? e.images.length : 0), 0)}
            availableYears={availableYears}
            activeYear={activeYear}
          />

          <section className="xl:pl-[260px]">
            <ChronicleTimeline events={events} activeYear={activeYear} />
          </section>
        </div>
      </div>
    </div>
  );
}
