'use client';

import { AnimatePresence } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, ReactNode } from 'react';
import ImmersiveLoading from './immersive-loading';
import { hasPlayedSplash, markSplashPlayed } from '@/lib/splash-intro';

interface LoadingWrapperProps {
  children: ReactNode;
  /**
   * The splash photo, read on the server. Passing it down means the letterforms
   * are painted with the curator's photo on the first frame instead of opening
   * on a placeholder and swapping.
   */
  splashImageUrl?: string;
  /** The two numbers on the door plaque, read on the server. */
  archiveCounts?: { events: number; images: number };
  /**
   * How long the door stays fully shut before it starts to open (ms).
   *
   * This is not a loading delay and not a performance budget - it is the length
   * of the wordmark's own choreography (see immersive-loading): 1.5s blur-in,
   * hairline drawn by 2.5s, plaque settled at 2.0s. Anything shorter cuts the
   * animation in half.
   */
  minDuration?: number;
}

/** The curtain's hold. Matches the choreography, not a target paint time. */
const SPLASH_HOLD_MS = 2600;
/** Fade/blur out. Mirrors the exit transition in immersive-loading. */
export const SPLASH_EXIT_MS = 1200;
/** The room starts rising a beat AFTER the curtain begins to go transparent. */
const CONTENT_REVEAL_DELAY_MS = 300;
const CONTENT_FADE_MS = 700;
/** Users who asked the system for less motion get a blink, not a sequence. */
const REDUCED_HOLD_MS = 300;

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * The front door.
 *
 * Children are always rendered - on the server too. They used to sit behind a
 * `showContent` flag that only flipped after mount, so the page's first HTML
 * (the hero, the preface, the five halls, the timeline) contained none of the
 * page. The curtain is a fixed, opaque, z-9999 layer: painting the page under it
 * costs nothing visually, and it keeps the archived content in the HTML for
 * crawlers and for the first paint.
 *
 * One door per visit, not one door per mount. The curtain is in the server
 * markup, so it re-renders on every client-side return to the homepage; a
 * layout effect hides it before paint when this tab has already played. Two
 * mechanisms, two different failure modes (see lib/splash-intro.ts):
 *   - <html data-splash>, set by the pre-paint script, handles full document
 *     loads (language switches, reloads);
 *   - the layout effect here handles client-side returns, where the attribute
 *     was never set because at first load there was nothing in storage yet.
 */
export function LoadingWrapper({
  children,
  minDuration = SPLASH_HOLD_MS,
  splashImageUrl = '',
  archiveCounts,
}: LoadingWrapperProps) {
  const [curtainMounted, setCurtainMounted] = useState(true);
  const curtainRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const doorAlreadyOpen = useRef(false);

  useIsomorphicLayoutEffect(() => {
    doorAlreadyOpen.current = hasPlayedSplash();
    if (curtainRef.current && doorAlreadyOpen.current) {
      curtainRef.current.style.display = 'none';
    }
  }, []);

  useEffect(() => {
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced && curtainRef.current) curtainRef.current.style.display = 'none';

    const hold = reduced ? REDUCED_HOLD_MS : Math.min(Math.max(minDuration, 0), SPLASH_HOLD_MS);

    later(() => {
      // Written at the moment the door starts to open, so a return to the
      // homepage later in this visit finds the door already open.
      markSplashPlayed();
      setCurtainMounted(false);

      const content = contentRef.current;
      if (doorAlreadyOpen.current || reduced || !content) return;

      // The curtain is still opaque black right now: dropping the page to zero
      // here is invisible, and it is what lets the room rise into view instead
      // of being already settled when the curtain lifts.
      content.style.opacity = '0';
      later(() => {
        content.style.transition = `opacity ${CONTENT_FADE_MS}ms ease-out`;
        content.style.opacity = '1';
      }, CONTENT_REVEAL_DELAY_MS);
    }, hold);

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [minDuration]);

  return (
    <>
      <AnimatePresence>
        {curtainMounted && (
          <ImmersiveLoading
            initialImageUrl={splashImageUrl}
            archiveCounts={archiveCounts}
            curtainRef={curtainRef}
          />
        )}
      </AnimatePresence>

      <div ref={contentRef} className="min-h-screen">
        {children}
      </div>
    </>
  );
}
