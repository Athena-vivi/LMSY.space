'use client';

import { HeroSection } from '@/components/sections/hero-section';
import { PortalsSection } from '@/components/sections/portals-section';
import { SoulResonanceSection } from '@/components/sections/soul-resonance-section';
import { TimelinePreviewSection } from '@/components/sections/timeline-preview-section';
import { PeopleSection } from '@/components/sections/people-section';
import { MuseumPreface } from '@/components/museum-preface';
import { HomeHeader } from '@/components/home-header';
import { LoadingWrapper } from '@/components/loading/loading-wrapper';

/**
 * Homepage. Five content blocks, each with one job:
 *
 *   1. Hero            - what this place is
 *   2. MuseumPreface   - the archive story (homepage_preface content block)
 *   3. Portals         - the five fixed halls, with real covers
 *   4. Featured        - specific projects worth opening
 *   5. Timeline        - a few years, linking into the full timeline
 *   6. People          - the two people, linking into /people
 *
 * The preface is the "story" half of People & Archive Story: it sits right
 * after the hero because that is where an opening statement belongs. Nothing
 * here keeps its own copy of project data - every block reads the same
 * database through /api/home/summary or /api/home/portals.
 */
export default function HomePage() {
  return (
    <LoadingWrapper>
      <div className="relative">
        <HomeHeader />

        <HeroSection />
        <MuseumPreface />
        <PortalsSection />
        <SoulResonanceSection />
        <TimelinePreviewSection />
        <PeopleSection />
      </div>
    </LoadingWrapper>
  );
}
