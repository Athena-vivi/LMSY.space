import { notFound } from 'next/navigation';
import { ChronicleTimeline } from '@/components/chronicle-timeline';
import { ChronicleChrome } from '@/components/chronicle-chrome';
import { getChronicleEvents, extractYears } from '@/lib/timeline';

export const revalidate = 300;

export function generateStaticParams() {
  // Years are generated at build time; a year with no records still works
  // (empty state), so there is no need to enumerate them from data.
  return [];
}

export default async function TimelineYearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  // A malformed year is a bad URL, not an empty year.
  if (!/^\d{4}$/.test(year)) notFound();

  const allEvents = await getChronicleEvents();
  const availableYears = extractYears(allEvents);
  const events = allEvents.filter((event) => event.date.slice(0, 4) === year);

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
