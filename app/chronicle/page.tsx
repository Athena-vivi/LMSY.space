import { ChronicleTimeline } from '@/components/chronicle-timeline';
import { getAllTimelineEvents } from '@/lib/timeline';
import { BackButton } from '@/components/back-button';

export const metadata = {
  title: 'Chronicle Timeline | LMSY Archive',
  description: 'A chronological journey through Lookmhee & Sonya\'s milestones, photoshoots, projects, and special moments.',
};

export default async function ChroniclePage() {
  const events = await getAllTimelineEvents();
  const eventCount = events.length;

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 pt-14 pb-24 sm:px-6 md:pt-20 md:pb-32 lg:px-10 xl:px-14">
        <div className="relative xl:min-h-[calc(100vh-7rem)]">
          <aside className="mb-12 xl:fixed xl:top-28 xl:left-14 xl:w-[220px] xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pr-3">
            <div className="mb-8">
              <BackButton />
            </div>

            <div className="mb-5 max-w-[220px]">
              <span className="inline-flex items-center rounded-full border border-lmsy-yellow/25 bg-lmsy-yellow/10 px-3 py-1 text-[10px] font-mono tracking-[0.22em] uppercase text-lmsy-yellow">
                Archive Timeline
              </span>
            </div>

            <div className="mb-5 max-w-[220px]">
              <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground md:text-3xl xl:text-[2rem]">
                Chronicle
              </h1>
            </div>

            <div className="mb-6 h-0.5 w-24 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue" />

            <div className="mb-6 max-w-[220px]">
              <p className="text-sm leading-7 text-muted-foreground">
                A visual journey through time, gathering milestones, shoots, and quiet archive moments into one continuous record.
              </p>
            </div>

            <div className="mb-6 max-w-[220px] border-l border-lmsy-blue/25 pl-4">
              <p className="text-sm leading-relaxed text-white/45">
                The right column holds the image-led sequence. Each entry can be opened for a closer look.
              </p>
            </div>

            <div className="max-w-[220px] space-y-3 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">
                <span>Entries</span>
                <span className="text-white/65">{eventCount}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">
                <span>Type</span>
                <span className="text-white/65">Published</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-white/35">
                <span>View</span>
                <span className="text-white/65">Image First</span>
              </div>
            </div>
          </aside>

          <section className="xl:pl-[260px]">
            <ChronicleTimeline events={events} />
          </section>
        </div>
      </div>
    </div>
  );
}
