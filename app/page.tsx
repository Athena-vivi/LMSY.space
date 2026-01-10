'use client';

import { HeroSection } from '@/components/sections/hero-section';
import { PortalsSection } from '@/components/sections/portals-section';
import { LongformSection } from '@/components/sections/longform-section';
import { ChronicleSection } from '@/components/sections/chronicle-section';
import { MuseumPreface } from '@/components/museum-preface';
import { HomeHeader } from '@/components/home-header';
import { LoadingWrapper } from '@/components/loading/loading-wrapper';

export default function HomePage() {
  return (
    <LoadingWrapper minDuration={2500}>
      <div className="relative">
        {/* Home Navigation - Only on Homepage */}
        <HomeHeader />

        {/* Section 1: Hero - Logo, Preface, Astra Signature */}
        <HeroSection />

        {/* Museum Preface - About Section */}
        <MuseumPreface />

        {/* Section 2: Portals - Four Large Cards (Drama, Live, Journey, Daily) */}
        <PortalsSection />

        {/* Section 3: Longform - Featured Interview Excerpt with Paper Texture */}
        <LongformSection />

        {/* Section 4: Micro-Chronicle - Minimal Horizontal Timeline */}
        <ChronicleSection />
      </div>
    </LoadingWrapper>
  );
}
