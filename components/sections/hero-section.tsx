'use client';

import { motion, useReducedMotion } from 'framer-motion';
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
  const reduceMotion = useReducedMotion();
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
              Nothing in this subtree animates forever except two leaf nodes:
              the photograph inside the frame and the glow behind it. Both are
              the only things whose motion is ever sent to the GPU.

              This wrapper used to carry the breathing animation itself
              (y: [20, 10, 20], endless). An endless transform on an ancestor
              of a clipped, rounded, shadowed photo is what produced the grey
              block: the wrapper stayed on the GPU as one composited layer,
              the photo inside it stopped being a normal element with its own
              place in the paint order and became pixels baked into that
              layer's tiles. When a tile failed to rasterise there was no
              "behind" or "in front" left, because the halos, the overlays and
              the photo were all the same texture; the region came back as one
              flat colour and landed on top of the picture whatever z-index
              its DOM node had.

              So the wrapper still animates once, then comes to rest and is
              de-promoted. The motion lives one level lower, on nodes that
              contain nothing needing extra rasterisation - a bitmap and a
              gradient - where compositing is just a texture sample.
            */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative"
            >
              {/* Main Photo Container */}
              <div
                className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-2xl group cursor-pointer border"
                style={{
                  // Opaque, so a tile the compositor drops shows the page's own
                  // black instead of a lighter patch over the photo.
                  backgroundColor: 'var(--background)',
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
                  /*
                    The photograph drifts 10px up and down over 10s. The card is
                    3:4 and the photo is cropped to it, so there is no room to
                    move without exposing an edge. `scale: 1.06` buys about
                    15px of bleed on every side at phone size and the drift uses
                    10 of it, which is the same 10px the whole card used to
                    travel - it reads as the same slow rise and fall, just
                    contained by the frame instead of dragging the frame along
                    with it. 10s a cycle rather than the old 6s: any slower and
                    the movement stops being readable at this amplitude.

                    Why the wrapper and not the <Image> itself: the Image keeps
                    its own hover scale, and one transform per node means they
                    cannot overwrite each other.
                  */
                  <motion.div
                    className="absolute inset-0"
                    initial={{ scale: 1.06, y: 0 }}
                    animate={
                      reduceMotion
                        ? { scale: 1.06, y: 0 }
                        : { scale: 1.06, y: [-10, 10, -10] }
                    }
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: 10, repeat: Infinity, ease: 'easeInOut' }
                    }
                  >
                    <Image
                      src={heroSrc}
                      alt="Lookmhee & Sonya"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                      onLoad={() => setImageLoaded(true)}
                    />
                  </motion.div>
                )}

                {/*
                  The vignette is the only overlay left. A second one used to
                  sit here as `bg-gradient-radial ... from-lmsy-blue/10`, but
                  Tailwind v4 has no `bg-gradient-radial` class (it is
                  `bg-radial`), so it painted nothing at all.
                */}
                <div className="absolute inset-0 bg-gradient-to-tr from-background/40 via-transparent to-transparent" />

                {/*
                  Hover affordance, desktop only. It used to carry
                  `backdrop-blur-sm` and sit in the DOM on phones too: a
                  backdrop filter whose backdrop is the photograph, on the one
                  device class that is already mispainting this subtree. It
                  never appears without a pointer anyway.
                */}
                <motion.div
                  className="absolute top-4 right-4 px-4 py-2 hidden lg:flex rounded-full border items-center gap-2"
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

              {/*
                Ambient glow behind the card.

                This used to be a solid gradient box with `blur-3xl`, sitting
                under the photo at `-z-10`. A 64px filter blur is not a paint
                the browser can skip: it rasterises the box into its own
                texture. On phone GPUs that texture came back as one flat
                rectangle of its own average colour - the soft grey block that
                covered the top of the photograph and cut both of them off at
                the waist, `-z-10` and all, because once the wrapper is a single
                composited layer the z-index inside it is already baked.

                A radial gradient needs no filter, no raster pass and no
                separate layer, so there is nothing left to flatten. It sits at
                `-inset-6`, outside the frame, so it reads as a halo around the
                card rather than a wash over it - and its own slow breathe is
                what keeps the composition from feeling frozen now that the
                frame itself no longer floats.
              */}
              <motion.div
                className="absolute -inset-6 -z-10 rounded-[50%]"
                style={{
                  background:
                    'radial-gradient(closest-side, rgba(251, 191, 36, 0.16) 0%, rgba(56, 189, 248, 0.13) 55%, rgba(56, 189, 248, 0) 100%)',
                }}
                initial={{ opacity: 0.75, scale: 1 }}
                animate={
                  reduceMotion
                    ? { opacity: 0.75, scale: 1 }
                    : { opacity: [0.6, 1, 0.6], scale: [1, 1.04, 1] }
                }
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 11, repeat: Infinity, ease: 'easeInOut' }
                }
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
