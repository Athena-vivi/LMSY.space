'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { useRef } from 'react';
import Image from 'next/image';
import { MuseumPreface } from '@/components/museum-preface';

export default function HomePage() {
  const ref = useRef(null);
  const { language } = useLanguage();

  const updatesData = [
    { titleKey: 'updates.photoshoot', categoryKey: 'updates.gallery', dateKey: 'updates.dec2024', color: 'lmsy-blue', gradient: 'from-lmsy-blue/20 to-lmsy-blue/5 dark:from-lmsy-blue/30 dark:to-lmsy-blue/10' },
    { titleKey: 'updates.season2', categoryKey: 'updates.series', dateKey: 'updates.comingSoon', color: 'lmsy-yellow', gradient: 'from-lmsy-yellow/20 to-lmsy-yellow/5 dark:from-lmsy-yellow/30 dark:to-lmsy-yellow/10' },
    { titleKey: 'updates.fanmeet', categoryKey: 'updates.schedule', dateKey: 'updates.jan2025', color: 'lmsy-blue', gradient: 'from-lmsy-blue/20 to-lmsy-blue/5 dark:from-lmsy-blue/30 dark:to-lmsy-blue/10' },
  ];

  return (
    <div className="relative">
      {/* Hero Section - Clean White Background */}
      <section ref={ref} className="relative min-h-screen overflow-hidden bg-background">
        {/* Ambient Lighting Effects - Radial Gradients */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Left ambient glow - Yellow tint */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[50vw] h-[80vw] bg-gradient-radial from-lmsy-yellow/5 via-lmsy-yellow/0 to-transparent rounded-full blur-3xl" />
          {/* Right ambient glow - Blue tint */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[50vw] h-[80vw] bg-gradient-radial from-lmsy-blue/5 via-lmsy-blue/0 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative min-h-screen py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center h-full">
              {/* Left - Title and Text */}
              <motion.div
                className="order-2 lg:order-1 text-center lg:text-left"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-foreground mb-6">
                  {t(language, 'hero.lmsy')}
                </h2>
                <p className="text-base md:text-lg text-muted-foreground tracking-[0.2em] uppercase mb-4">
                  {t(language, 'hero.subtitle')}
                </p>
                <p className="text-sm md:text-base bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent font-medium mb-8">
                  {t(language, 'hero.besties')}
                </p>

                {/* Universe Expansion Message - Breathing Animation */}
                <motion.div
                  className="mt-12 mb-8 space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 4, // 4 seconds for full breathing cycle
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1.5, // Start after initial animations
                  }}
                >
                  <h3 className="font-serif font-light text-2xl md:text-3xl text-foreground/80 tracking-wide">
                    {t(language, 'hero.universeTitle')}
                  </h3>
                  <p className="font-serif text-sm md:text-base text-foreground/70 leading-relaxed max-w-md mx-auto lg:mx-0 italic">
                    {t(language, 'hero.universeSubtitle')}
                  </p>
                </motion.div>

                <p className="text-sm md:text-base text-muted-foreground/70 leading-relaxed max-w-md mx-auto lg:mx-0">
                  {t(language, 'quote.text')}
                </p>
              </motion.div>

              {/* Right - Photo Container for Lookmhee & Sonya */}
              <div className="order-1 lg:order-2 relative">
                <motion.div
                  className="relative"
                  // Initial state and entrance animation
                  initial={{ opacity: 0, scale: 0.9, filter: 'blur(8px)', y: 20 }}
                  // Entrance: fade in, scale up, remove blur, then float
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter: 'blur(0px)',
                    // Floating animation - very slow and subtle space-like drift
                    y: [20, 10, 20],
                  }}
                  transition={{
                    opacity: { duration: 1, ease: [0.25, 0.46, 0.45, 0.94] },
                    scale: { duration: 1, ease: [0.25, 0.46, 0.45, 0.94] },
                    filter: { duration: 1 },
                    y: {
                      duration: 6, // Very slow - 6 seconds for full cycle
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: 1, // Start floating after entrance animation
                    },
                  }}
                >
                  {/* Photo Container - 3:4 Aspect Ratio */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-gradient-to-br from-muted/50 to-muted border border-border">
                    {/* Main photo of Lookmhee & Sonya */}
                    <Image
                      src="/lmsy-001.jpg"
                      alt="Lookmhee & Sonya"
                      fill
                      className="object-cover"
                      priority
                    />

                    {/* Subtle inner glow */}
                    <div className="absolute inset-0 bg-gradient-radial from-lmsy-blue/10 via-transparent to-transparent" />

                    {/* Fade mask on left side - seamless blend with text area */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
                    </div>
                  </div>

                  {/* Ambient glow behind photo */}
                  <motion.div
                    className="absolute inset-4 -z-10 rounded-full blur-3xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 180, 67, 0.1) 0%, rgba(70, 207, 255, 0.1) 100%)',
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
              </div>
            </div>

            {/* Scroll Indicator with gradient */}
            <motion.div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.5 }}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground tracking-widest">{t(language, 'hero.scroll')}</span>
                <motion.div
                  className="w-px h-12 bg-gradient-to-b from-lmsy-yellow via-lmsy-blue to-transparent"
                  animate={{ scaleY: [1, 1.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Museum Preface - About Section */}
      <MuseumPreface />

      {/* Interactive Quote Section */}
      <section className="relative py-32 md:py-48 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <blockquote className="font-serif text-3xl md:text-5xl lg:text-6xl leading-tight text-foreground">
              {t(language, 'quote.text')}
            </blockquote>
            <cite className="mt-8 block text-sm text-muted-foreground tracking-widest not-italic">
              {t(language, 'quote.source')}
            </cite>
          </motion.div>
        </div>
      </section>

      {/* Latest News / Updates - Enhanced with Duo Colors */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="flex items-center justify-between mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="font-serif text-3xl md:text-4xl tracking-tight">{t(language, 'updates.title')}</h3>
            <Link href="/schedule">
              <Button variant="ghost" className="gap-2">
                {t(language, 'nav.viewAll')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {updatesData.map((item, index) => (
              <motion.div
                key={index}
                className="group relative aspect-[4/3] overflow-hidden rounded-sm bg-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                {/* Image placeholder with duo colors */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} transition-transform duration-500 group-hover:scale-105`} />
                <div className={`absolute inset-0 bg-gradient-to-t from-${item.color}/10 to-transparent`} />

                {/* Glassmorphism border effect with duo colors */}
                <div className={`absolute inset-0 rounded-sm border-2 border-${item.color}/30 group-hover:border-${item.color}/60 transition-colors duration-300`} />
                <div className="absolute inset-0 rounded-sm bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <span className={`text-xs font-medium tracking-widest text-${item.color}`}>
                    {t(language, item.categoryKey as any).toUpperCase()}
                  </span>
                  <h4 className="mt-2 font-serif text-xl text-card-foreground group-hover:text-white transition-colors">
                    {t(language, item.titleKey as any)}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground group-hover:text-white/80 transition-colors">
                    {t(language, item.dateKey as any)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with Duo Color Buttons */}
      <section className="py-32 md:py-48">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            {/* Decorative gradient line */}
            <div className="mx-auto mb-8 h-1 w-24 bg-gradient-to-r from-lmsy-yellow via-lmsy-blue to-lmsy-yellow rounded-full" />

            <h3 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-6 tracking-tight">
              {t(language, 'cta.title')}
            </h3>
            <p className="text-lg text-muted-foreground mb-8">
              {t(language, 'cta.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/profiles">
                <Button
                  size="lg"
                  className="w-full sm:w-auto min-w-[160px] bg-lmsy-yellow hover:bg-lmsy-yellow-dark text-black font-medium"
                >
                  {t(language, 'cta.meetDuo')}
                </Button>
              </Link>
              <Link href="/gallery">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto min-w-[160px] border-lmsy-blue text-lmsy-blue hover:bg-lmsy-blue hover:text-white"
                >
                  {t(language, 'cta.viewGallery')}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
