import { ChronicleTimeline } from '@/components/chronicle-timeline';
import { getAllTimelineEvents } from '@/lib/timeline';

export const metadata = {
  title: 'Chronicle Timeline | LMSY Archive',
  description: 'A chronological journey through Lookmhee & Sonya\'s milestones, photoshoots, projects, and special moments.',
};

export default async function ChroniclePage() {
  const events = await getAllTimelineEvents();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden border-b border-border">
        {/* Ambient background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[50vw] h-[80vw] bg-gradient-radial from-lmsy-yellow/5 via-lmsy-yellow/0 to-transparent rounded-full blur-3xl" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[50vw] h-[80vw] bg-gradient-radial from-lmsy-blue/5 via-lmsy-blue/0 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Label */}
            <div className="mb-6">
              <span className="inline-block px-4 py-2 text-sm font-medium tracking-widest uppercase bg-lmsy-yellow/20 text-lmsy-yellow rounded-full">
                Archive Timeline
              </span>
            </div>

            {/* Title */}
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6">
              Chronicle
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8">
              A visual journey through time, documenting every milestone, photoshoot, and memorable moment in the LMSY universe.
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-lmsy-yellow" />
                <span className="text-muted-foreground">Gallery</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-lmsy-blue" />
                <span className="text-muted-foreground">Projects</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-foreground" />
                <span className="text-muted-foreground">Schedule</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Timeline
              </h2>
              <p className="text-muted-foreground text-lg">
                Explore the complete archive chronologically
              </p>
            </div>

            {/* Timeline */}
            <ChronicleTimeline events={events} />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="font-mono text-xs text-muted-foreground/60 tracking-widest">
              ARCHIVE CURATED BY <span className="text-lmsy-yellow">ASTER</span> © 2025
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
