'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { useRef } from 'react';

export default function HomePage() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start']
  });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const { language } = useLanguage();

  const updatesData = [
    { titleKey: 'updates.photoshoot', categoryKey: 'updates.gallery', dateKey: 'updates.dec2024', gradient: 'from-rose-200 to-pink-100 dark:from-rose-900/30 dark:to-pink-950/20' },
    { titleKey: 'updates.season2', categoryKey: 'updates.series', dateKey: 'updates.comingSoon', gradient: 'from-amber-200 to-orange-100 dark:from-amber-900/30 dark:to-orange-950/20' },
    { titleKey: 'updates.fanmeet', categoryKey: 'updates.schedule', dateKey: 'updates.jan2025', gradient: 'from-purple-200 to-violet-100 dark:from-purple-900/30 dark:to-violet-950/20' },
  ];

  return (
    <div className="relative">
      {/* Hero Section - Digital Cover Style */}
      <section ref={ref} className="relative min-h-screen overflow-hidden">
        {/* Background Text Decoration with Parallax */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <motion.h1
            style={{ y, opacity }}
            className="font-serif text-[20vw] leading-none text-primary/5 select-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            AFFAIR
          </motion.h1>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative min-h-screen py-20">
            {/* Asymmetric Image Layout - Enhanced Overlapping */}
            <div className="relative h-full">
              {/* Lookmhee - Left Bottom (Larger) */}
              <motion.div
                className="absolute bottom-16 left-0 z-20 w-[70%] max-w-md md:max-w-lg lg:max-w-xl"
                initial={{ opacity: 0, x: -120, y: 120 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-sm magazine-shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
                  {/* Placeholder for Lookmhee's image */}
                  <div className="h-full w-full bg-gradient-to-br from-rose-200 via-rose-100 to-pink-50 dark:from-rose-900/40 dark:via-rose-800/30 dark:to-rose-950/20" />
                  {/* Decorative border */}
                  <div className="absolute inset-0 border-2 border-white/20 rounded-sm" />
                  <div className="absolute bottom-5 left-5 z-20">
                    <p className="text-white text-sm font-medium tracking-wider drop-shadow-lg">{t(language, 'hero.lookmhee')}</p>
                    <p className="text-white/70 text-xs tracking-widest mt-1">AFFAIR</p>
                  </div>
                </div>
              </motion.div>

              {/* Sonya - Right Top (Smaller, Overlapping) */}
              <motion.div
                className="absolute top-24 right-0 z-10 w-[50%] max-w-xs md:max-w-sm lg:max-w-md"
                initial={{ opacity: 0, x: 120, y: -120 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 1.2, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ scale: 1.03 }}
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-sm magazine-shadow">
                  {/* Placeholder for Sonya's image */}
                  <div className="h-full w-full bg-gradient-to-br from-amber-200 via-amber-100 to-yellow-50 dark:from-amber-900/40 dark:via-amber-800/30 dark:to-amber-950/20" />
                  {/* Decorative border */}
                  <div className="absolute inset-0 border-2 border-white/20 rounded-sm" />
                  <div className="absolute -bottom-8 -right-8 z-20">
                    <p className="text-7xl md:text-8xl font-serif text-primary/10">S</p>
                  </div>
                </div>
              </motion.div>

              {/* Center Title */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 text-center"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground mb-4">
                  {t(language, 'hero.lmsy')}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground tracking-[0.3em] uppercase">
                  {t(language, 'hero.subtitle')}
                </p>
              </motion.div>

              {/* Scroll Indicator */}
              <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1.5 }}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs text-muted-foreground tracking-widest">{t(language, 'hero.scroll')}</span>
                  <motion.div
                    className="w-px h-12 bg-gradient-to-b from-primary to-transparent"
                    animate={{ scaleY: [1, 1.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

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

      {/* Latest News / Updates - Enhanced with Glassmorphism */}
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
                {/* Image placeholder */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} transition-transform duration-500 group-hover:scale-105`} />

                {/* Glassmorphism border effect */}
                <div className="absolute inset-0 rounded-sm border border-white/20 group-hover:border-white/40 transition-colors duration-300" />
                <div className="absolute inset-0 rounded-sm bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <span className="text-xs text-champagne font-medium tracking-widest">
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

      {/* CTA Section */}
      <section className="py-32 md:py-48">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <h3 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-6 tracking-tight">
              {t(language, 'cta.title')}
            </h3>
            <p className="text-lg text-muted-foreground mb-8">
              {t(language, 'cta.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/profiles">
                <Button size="lg" className="w-full sm:w-auto min-w-[160px]">
                  {t(language, 'cta.meetDuo')}
                </Button>
              </Link>
              <Link href="/gallery">
                <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[160px]">
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
