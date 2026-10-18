'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/image-url';

interface PortalImage {
  imageUrl: string | null;
  blurData: string | null;
  catalogId: string | null;
}

interface PortalCardProps {
  titleKey: string;
  descKey: string;
  image: PortalImage | null;
  href: string;
  index: number;
  gradient: string;
  isFeatured?: boolean;
}

function PortalCard({ titleKey, descKey, image, href, index, gradient, isFeatured }: PortalCardProps) {
  const { language } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);

  // 🔥 AMBER GOLD theme for commercial cards
  const isCommercial = isFeatured || gradient.includes('amber');
  const titleGradient = isCommercial
    ? 'linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(217, 119, 6) 50%, rgb(180, 83, 9) 100%)'
    : 'linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(56, 189, 248) 100%)';

  const glowGradient = isCommercial
    ? 'radial-gradient(circle at center, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.1) 50%, rgba(180, 83, 9, 0.05) 100%)'
    : 'radial-gradient(circle at center, rgba(251, 191, 36, 0.1) 0%, rgba(56, 189, 248, 0.1) 100%)';

  // 🔥 GET IMAGE URL: Process through getImageUrl for CDN path
  const imageUrl = image?.imageUrl ? getImageUrl(image.imageUrl) : null;
  const blurDataUrl = image?.blurData || undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group relative"
    >
      <Link href={href} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-card/40">
          {/* 🔥 REAL IMAGE with Blur Placeholder */}
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={t(language, titleKey as any)}
              fill
              className={`object-cover transition-transform duration-700 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onLoad={() => setImageLoaded(true)}
              unoptimized
              priority={index < 2}
              placeholder="blur"
              blurDataURL={blurDataUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmNTlmMTYiIG9wYWNpdHk9IjAuMiIvPjwvc3ZnPg=='}
            />
          ) : (
            /* Fallback Gradient Background */
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-transform duration-700 group-hover:scale-110`} />
          )}

          {/* 🌌 GRADIENT OVERLAY: From bottom to top for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-8">
            {/* Title with Duo Color Gradient */}
            <motion.h3
              className="font-serif text-3xl md:text-4xl font-bold text-ink mb-3"
              style={{
                background: titleGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t(language, titleKey as any)}
            </motion.h3>

            {/* Description */}
            <p className="text-ink text-base md:text-lg font-light leading-relaxed mb-4">
              {t(language, descKey as any)}
            </p>

            {/* Arrow Indicator */}
            <motion.div
              className="flex items-center gap-2 text-ink transition-colors"
              initial={{ x: 0 }}
              whileHover={{ x: 5 }}
            >
              <span className="text-xs tracking-[0.2em] uppercase md:text-sm">
                {t(language, 'home.explore')}
              </span>
              <ArrowRight className="h-4 w-4" />
            </motion.div>
          </div>

          {/* Hover Glow Effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: glowGradient,
            }}
          />
        </div>
      </Link>
    </motion.div>
  );
}

export function PortalsSection() {
  const { language } = useLanguage();
  const [portalImages, setPortalImages] = useState<Record<string, PortalImage | null>>({});
  // Phase-4 batch 2, Task 5: categories with zero visitor-facing projects are
  // removed from the homepage (their routes stay live). Unknown state (fetch
  // failure) fail-opens to keep the homepage intact.
  const [hasWork, setHasWork] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH FEATURED IMAGES: Load latest featured images for each portal
  useEffect(() => {
    async function fetchPortalImages() {
      try {
        const response = await fetch('/api/home/portals');
        if (response.ok) {
          const data = await response.json();
          setPortalImages(data);
          if (data.hasWork) setHasWork(data.hasWork);
        }
      } catch (error) {
        console.error('[PORTALS] Failed to fetch portal images:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPortalImages();
  }, []);

  const allPortals = [
    {
      key: 'series',
      titleKey: 'portal.drama',
      descKey: 'portal.dramaDesc',
      image: portalImages.series || null,
      href: '/exhibitions/category/drama',
      gradient: 'from-lmsy-yellow/20 to-lmsy-blue/20',
    },
    {
      key: 'appearance',
      titleKey: 'portal.live',
      descKey: 'portal.liveDesc',
      image: portalImages.appearance || null,
      href: '/exhibitions/category/stage',
      gradient: 'from-lmsy-blue/20 to-lmsy-yellow/20',
    },
    {
      key: 'travel',
      titleKey: 'portal.journey',
      descKey: 'portal.journeyDesc',
      image: portalImages.travel || null,
      href: '/exhibitions/category/travel',
      gradient: 'from-lmsy-yellow/20 to-lmsy-blue/20',
    },
    {
      key: 'daily',
      titleKey: 'portal.daily',
      descKey: 'portal.dailyDesc',
      image: portalImages.daily || null,
      href: '/exhibitions/category/daily',
      gradient: 'from-lmsy-blue/20 to-lmsy-yellow/20',
    },
    {
      key: 'commercial',
      titleKey: 'portal.commercial',
      descKey: 'portal.commercialDesc',
      image: portalImages.commercial || null,
      href: '/exhibitions/category/commercial',
      gradient: 'from-amber-400/30 via-yellow-500/20 to-amber-600/30',
      isFeatured: true, // Commercial gets special treatment
    },
  ];

  // Hide cards whose category has no visible works (only when the API
  // explicitly reported so).
  const portals = allPortals.filter(
    (portal) => hasWork === null || hasWork[portal.key] !== false
  );

  // The original layout is an asymmetric 12-col grid tuned for five cards.
  // Reassign spans per visible-card count so the grid never collapses.
  const SPAN_PLANS: Record<number, string[]> = {
    5: ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-4', 'lg:col-span-3', 'lg:col-span-5'],
    4: ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-4', 'lg:col-span-8'],
    3: ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-12'],
    2: ['lg:col-span-7', 'lg:col-span-5'],
    1: ['lg:col-span-12'],
    0: [],
  };
  const spans = SPAN_PLANS[portals.length] || SPAN_PLANS[5];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16 md:mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
              {t(language, 'hero.portalsTitle')}
            </span>
          </h2>
          <p className="text-ink-2 text-lg md:text-xl font-light">
            {t(language, 'hero.portalsSubtitle')}
          </p>
        </motion.div>

        {/* 🔥 ASYMMETRIC LAYOUT: spans adapt to how many portals are visible */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-8">
          {portals.map((portal, index) => (
            <div key={portal.key} className={spans[index] || 'lg:col-span-12'}>
              <PortalCard {...portal} index={index} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
