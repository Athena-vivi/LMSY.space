import { ChronicleTimeline } from '@/components/chronicle-timeline';
import { ChronicleChrome } from '@/components/chronicle-chrome';
import { getAllTimelineEvents } from '@/lib/timeline';

export const metadata = {
  title: 'Chronicle Timeline | LMSY Archive',
  description: 'A chronological journey through Lookmhee & Sonya\'s milestones, photoshoots, projects, and special moments.',
};

// Server-rendered from the archive; cache and refresh every 5 minutes.
export const revalidate = 300;

export default async function ChroniclePage() {
  const events = await getAllTimelineEvents();
  const eventCount = events.length;

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 pt-14 pb-24 sm:px-6 md:pt-20 md:pb-32 lg:px-10 xl:px-14">
        <div className="relative xl:min-h-[calc(100vh-7rem)]">
          <ChronicleChrome eventCount={eventCount} />

          <section className="xl:pl-[260px]">
            <ChronicleTimeline events={events} />
          </section>
        </div>
      </div>
    </div>
  );
}
