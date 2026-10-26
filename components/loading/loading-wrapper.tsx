'use client';

import { AnimatePresence } from 'framer-motion';
import { useEffect, useState, ReactNode } from 'react';
import ImmersiveLoading from './immersive-loading';

interface LoadingWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * The splash photo, read on the server. Passing it down means the letterforms
   * are painted with the curator's photo on the first frame instead of opening
   * on a placeholder and swapping.
   */
  splashImageUrl?: string;
  /**
   * How long the intro splash stays on screen (ms). This is a deliberate brand
   * moment, so keep it short — it directly delays the first meaningful paint.
   * It used to be 1500ms + max(minDuration, elapsed) + 1200ms, i.e. the home
   * page waited ~3.7s before rendering anything.
   */
  minDuration?: number;
}

const MAX_SPLASH_MS = 1200;

/**
 * Intro splash over the homepage.
 *
 * The children are always rendered — on the server too. They used to sit
 * behind a `showContent` flag that only flipped after mount, so the page's
 * first HTML (the hero, the preface, the five halls, the timeline) contained
 * none of the page. Every word of the introduction only existed after
 * hydration, which is the worst possible shape for a page whose whole job is
 * to be found. The splash is a fixed, opaque, z-9999 layer, so painting under
 * it costs nothing visually: it covers the content while it animates, then
 * fades away and reveals a page that was there all along.
 */
export function LoadingWrapper({
  children,
  minDuration = 500,
  splashImageUrl = '',
}: LoadingWrapperProps) {
  const [loading, setLoading] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    const delay = Math.min(Math.max(minDuration, 0), MAX_SPLASH_MS);
    const timer = setTimeout(() => {
      setLoading(false);
      setSplashVisible(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [minDuration]);

  return (
    <>
      <AnimatePresence>
        {splashVisible && (
          <ImmersiveLoading
            loading={loading}
            initialImageUrl={splashImageUrl}
            onComplete={() => {}}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen">{children}</div>
    </>
  );
}
