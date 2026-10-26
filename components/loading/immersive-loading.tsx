'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, type Ref } from 'react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

interface ImmersiveLoadingProps {
  /** Server-provided splash photo. Empty means the curator has not set one. */
  initialImageUrl?: string;
  /**
   * The two numbers on the door plaque. Both 0 (a failed read, or genuinely
   * nothing published yet) falls back to the plain line, so the door never
   * claims "0 events".
   */
  archiveCounts?: { events: number; images: number };
  /** Lets the wrapper hide the curtain before paint on a client-side return. */
  curtainRef?: Ref<HTMLDivElement>;
}

/** 1240 -> "1,240". Locale-independent on purpose: the value is server-rendered. */
function groupThousands(value: number): string {
  return String(Math.max(0, Math.trunc(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * The door itself.
 *
 * The wordmark is the curator's design and is not to be touched: a 1.5s
 * blur-in, a hairline that takes 2.5s to draw itself, then the plaque settling
 * at 2.0s. That is a 2.5s piece of choreography, so the wrapper holds the
 * curtain for 2.6s before the exit starts - cutting it at half a second sliced
 * the wordmark mid-fade and meant the plaque never appeared at all.
 *
 * The exit (1.2s) matches SPLASH_EXIT_MS in the wrapper, and the homepage
 * content rises underneath it as the curtain goes transparent.
 */
export default function ImmersiveLoading({
  initialImageUrl = '',
  archiveCounts,
  curtainRef,
}: ImmersiveLoadingProps) {
  // Nothing local: the splash is painted with whatever photo the curator set
  // for the hero block. Starting from /hero-reveal.jpg and swapping to the
  // real photo mid-animation is what made two different images appear.
  const [splashImageUrl, setSplashImageUrl] = useState(initialImageUrl);
  const { language } = useLanguage();

  useEffect(() => {
    // The server already handed us the photo; asking again would only risk
    // repainting the letterforms with a second image.
    if (initialImageUrl) return;

    let active = true;

    async function fetchSplashImage() {
      try {
        const response = await fetch('/api/site-content?key=homepage_hero', { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        const imageUrl =
          typeof data?.block?.image_url === 'string' ? data.block.image_url.trim() : '';

        if (active) {
          setSplashImageUrl(imageUrl);
        }
      } catch (error) {
        console.error('[SITE_CONTENT] Failed to fetch homepage_hero splash image:', error);
      }
    }

    fetchSplashImage();

    return () => {
      active = false;
    };
  }, [initialImageUrl]);

  const counted = (archiveCounts?.events ?? 0) > 0;
  const plaque = counted
    ? t(language, 'splash.plaque', {
        events: groupThousands(archiveCounts?.events ?? 0),
        images: groupThousands(archiveCounts?.images ?? 0),
      })
    : t(language, 'splash.entering');

  return (
    <motion.div
      ref={curtainRef}
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.1,
        filter: 'blur(20px)',
      }}
      transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="lmsy-splash fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* 核心视觉层：LMSY 字符门户 - 纯文字渐变方案 */}
      <div className="relative flex flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="relative font-sans font-[800] select-none pointer-events-none leading-none tracking-[-0.08em]"
          style={{
            fontSize: 'clamp(8rem, 22vw, 24rem)',
            backgroundImage: splashImageUrl
              ? `url(${splashImageUrl})`
              : 'linear-gradient(135deg, #FBBF24 0%, #38BDF8 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.15)) brightness(1.08) contrast(1.04)',
          }}
        >
          LMSY
        </motion.h1>

        {/* 装饰线条：随加载进度变长 */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '60%', opacity: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="h-[1px] bg-gradient-to-r from-transparent via-lmsy-yellow/40 to-transparent mt-4"
        />

        {/* 门牌：这里是什么、从什么时候开始、已经收了多少东西。 */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.5, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="text-[11px] md:text-[13px] tracking-[0.3em] font-light text-white uppercase mt-6 text-center pl-[0.3em] tabular-nums"
        >
          {plaque}
        </motion.p>
      </div>

      {/* 氛围层：背景微弱的星云 */}
      <div className="absolute inset-0 -z-10 opacity-20">
        <div className="absolute left-1/4 top-1/2 w-[40vw] h-[40vw] bg-lmsy-yellow/10 blur-[120px] rounded-full" />
        <div className="absolute right-1/4 top-1/2 w-[40vw] h-[40vw] bg-lmsy-blue/10 blur-[120px] rounded-full" />
      </div>
    </motion.div>
  );
}
