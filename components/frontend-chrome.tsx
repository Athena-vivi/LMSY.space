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
 *
 * Route content (children) is rendered between the header and the footer
 * inside the shared flex column, so the footer stays at the bottom of the
 * page. (Regression fixed: stage D moved the footer into this component
 * while the layout rendered the component before the page content, which
 * put the footer above every page - most visibly on the homepage, where
 * SiteHeader renders null.)
 */
export function FrontendChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Admin area has its own layout shell (sidebar, mobile nav, containers).
  if (pathname.startsWith('/admin')) {
    return <div className="flex min-h-screen flex-col">{children}</div>;
  }

  return (
    <>
      <NebulaBackground />
      <ScrollProgress />
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </div>
      {/* Global Vinyl Player */}
      <div key="vinyl-player">
        <VinylPlayer />
      </div>
      <WhisperFloatingButton />
    </>
  );
}
