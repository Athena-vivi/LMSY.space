import { HeroSection } from '@/components/sections/hero-section';
import { PortalsSection } from '@/components/sections/portals-section';
import { SoulResonanceSection } from '@/components/sections/soul-resonance-section';
import { TimelinePreviewSection } from '@/components/sections/timeline-preview-section';
import { PeopleSection } from '@/components/sections/people-section';
import { MuseumPreface } from '@/components/museum-preface';
import { HomeHeader } from '@/components/home-header';
import { LoadingWrapper } from '@/components/loading/loading-wrapper';
import { getHomepageHeroMedia } from '@/lib/homepage-hero';

/**
 * Reading the hero photos on the server is what keeps the page from painting
 * one image and then swapping it: the first HTML already names the curator's
 * photo, so there is no empty frame to fill. It also means the block is
 * rendered per request — a saved photo shows up on the next load, not on the
 * next deploy.
 */
export const dynamic = 'force-dynamic';

/**
 * Homepage. Six content blocks, each with one job:
 *
 *   1. Hero            - what this place is
 *   2. MuseumPreface   - the archive story (homepage_preface content block)
 *   3. Portals         - the five fixed halls, with real covers
 *   4. Soul resonance  - the two interview doors
 *   5. Timeline        - a few years, linking into the full timeline
 *   6. People          - the two people, linking into /people
 *
 * The preface is the "story" half of People & Archive Story: it sits right
 * after the hero because that is where an opening statement belongs. Nothing
 * here keeps its own copy of project data - every block reads the same
 * database through /api/home/summary or /api/home/portals.
 */
export default async function HomePage() {
  const { splashImageUrl, heroImageUrl } = await getHomepageHeroMedia();

  return (
    <LoadingWrapper splashImageUrl={splashImageUrl}>
      <div className="relative">
        <HomeHeader />

        <HeroSection initialImageUrl={heroImageUrl} />
        <MuseumPreface />
        <PortalsSection />
        <SoulResonanceSection />
        <TimelinePreviewSection />
        <PeopleSection />
      </div>
    </LoadingWrapper>
  );
}
