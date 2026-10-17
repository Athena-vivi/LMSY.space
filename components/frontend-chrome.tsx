'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { VinylPlayer } from '@/components/vinyl-player';
import { WhisperFloatingButton } from '@/components/whisper-floating-button';
import { ScrollProgress } from '@/components/scroll-progress';
import { NebulaBackground } from '@/components/nebula-background';

/**
 * Front-end-only chrome: immersive background, global header/footer, vinyl
 * player and the Whispers floating entry. Admin routes (/admin/*) render
 * their own shell (admin layout) and must not load any of these - fixes P6
 * where the admin login page and workspace leaked front-end decorations.
 */
export function FrontendChrome() {
  const pathname = usePathname();

  // Admin area has its own layout shell (sidebar, mobile nav, containers).
  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      <NebulaBackground />
      <ScrollProgress />
      <SiteHeader />
      <SiteFooter />
      <div key="vinyl-player">
        <VinylPlayer />
      </div>
      <WhisperFloatingButton />
    </>
  );
}
