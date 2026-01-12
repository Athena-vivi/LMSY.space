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

  const borderColor = isCommercial
    ? 'from-amber-400/40 via-yellow-500/30 to-amber-600/40'
    : 'from-lmsy-yellow/30 via-lmsy-blue/30 to-lmsy-yellow/30';

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
        <div
          className="relative aspect-[4/5] overflow-hidden rounded-2xl border"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderColor: 'rgba(255, 255, 255, 0.05)',
          }}
        >
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
              className="font-serif text-3xl md:text-4xl font-bold text-white mb-3"
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
            <p className="text-white/90 text-base md:text-lg font-light leading-relaxed mb-4">
              {t(language, descKey as any)}
            </p>

            {/* Arrow Indicator */}
            <motion.div
              className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors"
              initial={{ x: 0 }}
              whileHover={{ x: 5 }}
            >
              <span className="text-sm tracking-wider">EXPLORE</span>
              <ArrowRight className="w-4 h-4" />
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
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH FEATURED IMAGES: Load latest featured images for each portal
  useEffect(() => {
    async function fetchPortalImages() {
      try {
        const response = await fetch('/api/home/portals');
        if (response.ok) {
          const data = await response.json();
          setPortalImages(data);
        }
      } catch (error) {
        console.error('[PORTALS] Failed to fetch portal images:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPortalImages();
  }, []);

  const portals = [
    {
      titleKey: 'portal.drama',
      descKey: 'portal.dramaDesc',
      image: portalImages.series || null,
      href: '/exhibitions/category/drama',
      gradient: 'from-lmsy-yellow/20 to-lmsy-blue/20',
    },
    {
      titleKey: 'portal.live',
      descKey: 'portal.liveDesc',
      image: portalImages.appearance || null,
      href: '/exhibitions/category/stage',
      gradient: 'from-lmsy-blue/20 to-lmsy-yellow/20',
    },
    {
      titleKey: 'portal.journey',
      descKey: 'portal.journeyDesc',
      image: portalImages.travel || null,
      href: '/exhibitions/category/travel',
      gradient: 'from-lmsy-yellow/20 to-lmsy-blue/20',
    },
    {
      titleKey: 'portal.daily',
      descKey: 'portal.dailyDesc',
      image: portalImages.daily || null,
      href: '/exhibitions/category/daily',
      gradient: 'from-lmsy-blue/20 to-lmsy-yellow/20',
    },
    {
      titleKey: 'portal.commercial',
      descKey: 'portal.commercialDesc',
      image: portalImages.commercial || null,
      href: '/exhibitions/category/commercial',
      gradient: 'from-amber-400/30 via-yellow-500/20 to-amber-600/30',
      isFeatured: true, // Commercial gets special treatment
    },
  ];

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
          <p className="text-muted-foreground text-lg md:text-xl font-light">
            {t(language, 'hero.portalsSubtitle')}
          </p>
        </motion.div>

        {/* 🔥 ASYMMETRIC LAYOUT: Non-traditional grid with visual tension */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 md:gap-8">
          {/* First row: Drama (large) + Live (medium) */}
          <div className="lg:col-span-7">
            <PortalCard {...portals[0]} index={0} />
          </div>
          <div className="lg:col-span-5">
            <PortalCard {...portals[1]} index={1} />
          </div>

          {/* Second row: Journey (medium) + Daily (medium) + Commercial (featured, wide) */}
          <div className="lg:col-span-4">
            <PortalCard {...portals[2]} index={2} />
          </div>
          <div className="lg:col-span-3">
            <PortalCard {...portals[3]} index={3} />
          </div>
          <div className="lg:col-span-5">
            <PortalCard {...portals[4]} index={4} />
          </div>
        </div>
      </div>
    </section>
  );
}
