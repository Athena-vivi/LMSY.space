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
}

function PortalCard({ titleKey, descKey, image, href, index, gradient }: PortalCardProps) {
  const { language } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group relative"
    >
      <Link href={href} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted/30">
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
          <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-lmsy-yellow/30 via-lmsy-blue/30 to-lmsy-yellow/30 p-[2px]">
            <div className="absolute inset-0 rounded-2xl bg-background/0" />
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-8">
            {/* Title with Duo Color Gradient */}
            <motion.h3
              className="font-serif text-3xl md:text-4xl font-bold text-white mb-3"
              style={{
                background: 'linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(56, 189, 248) 100%)',
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
              background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.1) 0%, rgba(56, 189, 248, 0.1) 100%)',
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
      href: '/gallery?tag=drama',
      gradient: 'from-lmsy-yellow/20 to-lmsy-blue/20',
    },
    {
      titleKey: 'portal.live',
      descKey: 'portal.liveDesc',
      image: '', // Temporarily disabled - using gradient background instead
      href: '/schedule',
      gradient: 'from-lmsy-blue/20 to-lmsy-yellow/20',
    },
    {
      titleKey: 'portal.journey',
      descKey: 'portal.journeyDesc',
      image: '', // Temporarily disabled - using gradient background instead
      href: '/gallery?tag=journey',
      gradient: 'from-lmsy-yellow/20 to-lmsy-blue/20',
    },
    {
      titleKey: 'portal.daily',
      descKey: 'portal.dailyDesc',
      image: '', // Temporarily disabled - using gradient background instead
      href: '/gallery?tag=daily',
      gradient: 'from-lmsy-blue/20 to-lmsy-yellow/20',
    },
  ];

  return (
    <section className="relative py-24 md:py-32 bg-muted/20 overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }} />
      </div>

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

        {/* Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {portals.map((portal, index) => (
            <PortalCard
              key={portal.titleKey}
              {...portal}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
