'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface PortalCardProps {
  titleKey: string;
  descKey: string;
  image: string;
  href: string;
  index: number;
  gradient: string;
  isFeatured?: boolean;
}

function PortalCard({ titleKey, descKey, image, href, index, gradient, isFeatured }: PortalCardProps) {
  const { language } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

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
          {/* Background Gradient */}
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-transform duration-700 group-hover:scale-110`} />

          {/* Image with Fade-in Effect */}
          {!imageError && image && (
            <div className={`absolute inset-0 transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}>
              <Image
                src={image}
                alt={t(language, titleKey as any)}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(false);
                }}
              />
            </div>
          )}

          {/* Loading Placeholder or Error Fallback */}
          {(!imageLoaded || imageError) && (
            <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/70">
              {/* Animated gradient pattern for missing images */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} animate-pulse opacity-50`} />
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

          {/* Duo Color Border */}
          <div className={`absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r p-[2px] ${isCommercial ? 'from-amber-400/40 via-yellow-500/30 to-amber-600/40' : 'from-lmsy-yellow/30 via-lmsy-blue/30 to-lmsy-yellow/30'}`}>
            <div className="absolute inset-0 rounded-2xl bg-background/0" />
          </div>

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

  const portals = [
    {
      titleKey: 'portal.drama',
      descKey: 'portal.dramaDesc',
      image: '', // Temporarily disabled - using gradient background instead
      href: '/exhibitions/category/drama',
      gradient: 'from-lmsy-yellow/20 to-lmsy-blue/20',
    },
    {
      titleKey: 'portal.live',
      descKey: 'portal.liveDesc',
      image: '', // Temporarily disabled - using gradient background instead
      href: '/exhibitions/category/stage',
      gradient: 'from-lmsy-blue/20 to-lmsy-yellow/20',
    },
    {
      titleKey: 'portal.journey',
      descKey: 'portal.journeyDesc',
      image: '', // Temporarily disabled - using gradient background instead
      href: '/exhibitions/category/travel',
      gradient: 'from-lmsy-yellow/20 to-lmsy-blue/20',
    },
    {
      titleKey: 'portal.daily',
      descKey: 'portal.dailyDesc',
      image: '', // Temporarily disabled - using gradient background instead
      href: '/exhibitions/category/daily',
      gradient: 'from-lmsy-blue/20 to-lmsy-yellow/20',
    },
    {
      titleKey: 'portal.commercial',
      descKey: 'portal.commercialDesc',
      image: '',
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
