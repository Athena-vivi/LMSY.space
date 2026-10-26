'use client';

import { motion } from 'framer-motion';
import { LocalizedLink as Link } from '@/components/localized-link';
import Image from 'next/image';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { ArrowDown, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  DEFAULT_HERO_CONTENT,
  getHeroSectionImageUrl,
  normalizeHeroContent,
  pickContentBlock,
} from '@/app/(en)/admin/settings/content-blocks';
import { resolveImageUrl } from '@/lib/image-url';

export function HeroSection({ initialImageUrl = '' }: { initialImageUrl?: string }) {
  const { language } = useLanguage();
  const [heroContent, setHeroContent] = useState(DEFAULT_HERO_CONTENT);
  // The photo arrives from the server already resolved, so the first paint is
  // the real one. There is no bundled placeholder and nothing to swap in
  // afterwards; when the curator has not set a photo the card stays a skeleton.
  const [heroImageUrl, setHeroImageUrl] = useState(initialImageUrl);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    async function fetchHeroContent() {
      try {
        const response = await fetch('/api/site-content?key=homepage_hero', { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        if (!data.success || !data.block?.content_i18n) return;

        setHeroContent(normalizeHeroContent(data.block.content_i18n));
        // The copy always comes from the API. The photo only needs replacing
        // when the server did not already provide one.
        if (!initialImageUrl) {
          setHeroImageUrl(getHeroSectionImageUrl(data.block.content_i18n));
        }
      } catch (error) {
        console.error('[SITE_CONTENT] Failed to fetch homepage_hero:', error);
      }
    }

    fetchHeroContent();
  }, []);

  // Timeout fallback: onError cannot be trusted here (a single failed srcset
  // variant fires it even when the main image renders), so the failure state
  // only kicks in when nothing has decoded after 8s.
  useEffect(() => {
    if (imageLoaded) return;
    const timer = setTimeout(() => setImageFailed(true), 8000);
    return () => clearTimeout(timer);
  }, [imageLoaded, heroImageUrl]);

  const currentHeroContent = pickContentBlock(heroContent, language);
  const heroSrc = heroImageUrl ? resolveImageUrl(heroImageUrl) : '';

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Ambient Lighting Effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Left ambient glow - Yellow */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[50vw] h-[80vw] bg-gradient-radial from-lmsy-yellow/5 via-lmsy-yellow/0 to-transparent rounded-full blur-3xl" />
        {/* Right ambient glow - Blue */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[50vw] h-[80vw] bg-gradient-radial from-lmsy-blue/5 via-lmsy-blue/0 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Content */}
          <motion.div
            className="order-2 lg:order-1 text-center lg:text-left space-y-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Preface */}
            <motion.p
              className="text-sm md:text-base text-ink-2 italic font-serif"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {currentHeroContent.preface}
            </motion.p>

            {/* Main Title */}
            <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                LMSY
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-ink-2 tracking-[0.2em] uppercase">
              {t(language, 'hero.subtitle')}
            </p>

            {/* Universe Message - Breathing Animation */}
            <motion.div
              className="pt-8 space-y-4"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1.5,
              }}
            >
              <h3 className="font-serif font-light text-2xl md:text-3xl text-ink tracking-wide">
                {currentHeroContent.universeTitle}
              </h3>
              <p className="font-serif text-sm md:text-base text-ink-2 leading-relaxed max-w-md mx-auto lg:mx-0 italic">
                {currentHeroContent.universeSubtitle}
              </p>
            </motion.div>
          </motion.div>

          {/* Right - Hero Image */}
          <Link href="/features" className="order-1 lg:order-2 relative block">
            {/*
              No filter/blur on this wrapper. A CSS filter makes the browser
              rasterise the whole subtree into one texture, and on mobile GPUs
              the animated texture came back partially painted: a hard-edged
              black block of page background sitting over the top-left of the
              photo, right across one of their faces. Opacity and scale give
              the same entrance without the extra layer.
            */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [20, 10, 20],
              }}
              transition={{
                opacity: { duration: 1, ease: [0.25, 0.46, 0.45, 0.94] },
                scale: { duration: 1, ease: [0.25, 0.46, 0.45, 0.94] },
                y: {
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1,
                },
              }}
              className="relative"
            >
              {/* Main Photo Container */}
              <div
                className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-2xl group cursor-pointer border"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* Loading skeleton - shown until the hero image decodes */}
                {!imageLoaded && !imageFailed && (
                  <motion.div
                    className="absolute inset-0 z-10"
                    style={{
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.06) 0%, rgba(56, 189, 248, 0.06) 100%)',
                    }}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {/* Failure fallback - keeps the card meaningful if the image cannot load */}
                {imageFailed && (
                  <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
                    style={{
                      background: 'linear-gradient(160deg, rgba(251, 191, 36, 0.10) 0%, rgba(56, 189, 248, 0.10) 100%)',
                    }}
                  >
                    <span className="font-serif text-2xl font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                      LMSY
                    </span>
                    <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-ink-2">
                      {t(language, 'err.label')}
                    </span>
                  </div>
                )}

                {heroSrc && (
                  <Image
                    src={heroSrc}
                    alt="Lookmhee & Sonya"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                    onLoad={() => setImageLoaded(true)}
                  />
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-radial from-lmsy-blue/10 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-tr from-background/40 via-transparent to-transparent" />

                {/* Editorial Badge - Shown on Hover */}
                <motion.div
                  className="absolute top-4 right-4 px-4 py-2 backdrop-blur-sm rounded-full border flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    borderColor: 'rgba(251, 191, 36, 0.3)',
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <ExternalLink className="w-4 h-4 text-lmsy-yellow" />
                  <span className="text-xs font-medium text-ink">
                    {t(language, 'features.title')}
                  </span>
                </motion.div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-lmsy-blue/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Ambient Glow Behind */}
              <motion.div
                className="absolute inset-4 -z-10 rounded-full blur-3xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
                }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          </Link>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
      >
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs text-ink-2 tracking-widest">{t(language, 'hero.scroll')}</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowDown className="w-5 h-5 text-gradient-to-r from-lmsy-yellow to-lmsy-blue" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
