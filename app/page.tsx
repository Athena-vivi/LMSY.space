'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section - Digital Cover Style */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background Text Decoration */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <motion.h1
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
            {/* Asymmetric Image Layout */}
            <div className="relative h-full">
              {/* Lookmhee - Left Bottom */}
              <motion.div
                className="absolute bottom-20 left-0 z-20 w-[65%] max-w-md"
                initial={{ opacity: 0, x: -100, y: 100 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-sm magazine-shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent z-10" />
                  {/* Placeholder for Lookmhee's image */}
                  <div className="h-full w-full bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-950/30" />
                  <div className="absolute bottom-4 left-4 z-20">
                    <p className="text-white text-sm font-medium">LOOKMHEE</p>
                  </div>
                </div>
              </motion.div>

              {/* Sonya - Right Top */}
              <motion.div
                className="absolute top-20 right-0 z-10 w-[55%] max-w-sm"
                initial={{ opacity: 0, x: 100, y: -100 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-sm magazine-shadow">
                  {/* Placeholder for Sonya's image */}
                  <div className="h-full w-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-950/30" />
                </div>
                <div className="absolute -bottom-6 -right-6">
                  <p className="text-6xl font-serif text-primary/20">S</p>
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
                  LMSY
                </h2>
                <p className="text-sm md:text-base text-muted-foreground tracking-[0.3em] uppercase">
                  Lookmhee & Sonya
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
                  <span className="text-xs text-muted-foreground tracking-widest">SCROLL</span>
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
              &quot;Some feelings are impossible to hide, no matter how hard you try...&quot;
            </blockquote>
            <cite className="mt-8 block text-sm text-muted-foreground tracking-widest not-italic">
              — AFFAIR SERIES
            </cite>
          </motion.div>
        </div>
      </section>

      {/* Latest News / Updates */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="flex items-center justify-between mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="font-serif text-3xl md:text-4xl">Latest Updates</h3>
            <Link href="/schedule">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'New Photoshoot', category: 'Gallery', date: 'Dec 2024' },
              { title: 'Affair Season 2', category: 'Series', date: 'Coming Soon' },
              { title: 'Fan Meet Event', category: 'Schedule', date: 'Jan 2025' },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="group relative aspect-[4/3] overflow-hidden rounded-sm bg-card magazine-shadow hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <span className="text-xs text-champagne font-medium tracking-widest">
                    {item.category.toUpperCase()}
                  </span>
                  <h4 className="mt-2 font-serif text-xl text-card-foreground group-hover:text-white transition-colors">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground group-hover:text-white/80 transition-colors">
                    {item.date}
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
            <h3 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-6">
              Explore Their Story
            </h3>
            <p className="text-lg text-muted-foreground mb-8">
              Discover the journey of Lookmhee and Sonya through their projects, gallery, and upcoming events.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/profiles">
                <Button size="lg" className="w-full sm:w-auto min-w-[160px]">
                  Meet The Duo
                </Button>
              </Link>
              <Link href="/gallery">
                <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[160px]">
                  View Gallery
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
