'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { NebulaBackground } from '@/components/nebula-background';
import { WhisperDoor } from '@/components/whisper-door';

/**
 * Front-end-only chrome: immersive background, global header/footer and the
 * door to /whispers pinned to the bottom-LEFT corner. Admin routes (/admin/*)
 * render their own shell (admin layout) and must not load any of these -
 * fixes P6 where the admin login page and workspace leaked front-end
 * decorations.
 *
 * The bottom-left corner is the slot the curator pointed at. It held the
 * vinyl player; it now holds the same two rings, wired to the whispers inbox
 * instead of a playlist. The bottom-right corner stays empty on purpose.
 *
 * The door is hidden on /whispers itself: that page already carries its own
 * "write" button, and two floating controls on top of each other is a bug,
 * not a feature.
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
      {pathname !== '/whispers' && <WhisperDoor />}
    </>
  );
}
