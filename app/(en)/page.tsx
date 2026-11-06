import { HeroSection } from '@/components/sections/hero-section';
import { PortalsSection } from '@/components/sections/portals-section';
import { SoulResonanceSection } from '@/components/sections/soul-resonance-section';
import { TimelinePreviewSection } from '@/components/sections/timeline-preview-section';
import { PeopleSection } from '@/components/sections/people-section';
import { MuseumPreface } from '@/components/museum-preface';
import { HomeHeader } from '@/components/home-header';
import { LoadingWrapper } from '@/components/loading/loading-wrapper';
import { getHomepageHeroMedia } from '@/lib/homepage-hero';
import { getPublicArchiveCounts } from '@/lib/data/archive-counts';
import { pageLanguageAlternates } from '@/lib/seo';

/**
 * Reading the hero photos on the server keeps the first HTML from painting
 * one image and then swapping it: the curator's photo is already named in the
 * markup, so there is no empty frame to fill.
 *
 * Five-minute ISR, the same interval as every content door, instead of a full
 * SSR on each visit. Admin writes call revalidateContentSurfaces(), which now
 * includes '/' - a saved photo still shows up on the next load, not on the
 * next deploy, without charging a render to every visitor.
 */
export const revalidate = 300;

/**
 * Self-canonical plus the full hreflang cluster. Title and description are not
 * repeated here: the root layout writes them per language (siteMetadata), and
 * a child's metadata merges over the layout's instead of replacing it.
 */
export function generateMetadata() {
  return pageLanguageAlternates('en', '/');
}

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
  const [{ splashImageUrl, heroImageUrl }, archiveCounts] = await Promise.all([
    getHomepageHeroMedia(),
    // The door plaque's two numbers. Same visibility rule as the doors, and it
    // never throws - a failed count falls back to the plain line.
    getPublicArchiveCounts(),
  ]);

  return (
    <LoadingWrapper splashImageUrl={splashImageUrl} archiveCounts={archiveCounts}>
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
