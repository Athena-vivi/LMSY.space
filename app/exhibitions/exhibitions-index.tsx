'use client';

// Category index for /exhibitions (phase-4 batch 1).
// Replaces the temporary hard-coded "exhibitions" (indigo-dawn etc.): those
// slugs had no data behind them and two of the three linked to a fake detail
// page. The only real exhibition surface is /exhibitions/category/[type],
// which queries visible projects - so the index is a real entry page into
// those five categories, with live counts passed from the server component.

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { BackButton } from '@/components/back-button';
import { EXHIBITION_CATEGORIES } from '@/lib/exhibition-categories';

export default function ExhibitionsIndex({ counts }: { counts: Record<string, number> }) {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Ambient Background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-lmsy-yellow/10 via-transparent to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-lmsy-blue/10 via-transparent to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Back Button */}
          <div className="mb-8">
            <BackButton />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Exhibition Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-lmsy-yellow/10 to-lmsy-blue/10 border border-lmsy-yellow/30 mb-8"
            >
              <div className="w-2 h-2 rounded-full bg-lmsy-yellow animate-pulse" />
              <span className="text-xs font-medium tracking-widest uppercase">
                Curated Collections
              </span>
            </motion.div>

            {/* Title */}
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                {t(language, 'exhibitions.title')}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-ink-2 font-light leading-relaxed max-w-2xl mx-auto">
              {t(language, 'exhibitions.subtitle')}
            </p>

            {/* Decorative Line */}
            <motion.div
              className="mx-auto w-24 h-1 bg-gradient-to-r from-lmsy-yellow via-lmsy-blue to-lmsy-yellow rounded-full mt-8"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            />
          </motion.div>
        </div>
      </section>

      {/* Category Entry Grid */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {EXHIBITION_CATEGORIES.map((category, index) => {
              const count = counts[category.type] ?? 0;
              const label =
                language === 'zh'
                  ? category.label.zh
                  : language === 'th'
                    ? category.label.th
                    : category.label.en;

              return (
                <motion.div
                  key={category.type}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group relative"
                >
                  <Link
                    href={`/exhibitions/category/${category.type}`}
                    className="block"
                    aria-label={label}
                  >
                    <div
                      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-lmsy-yellow/20 via-lmsy-blue/20 to-lmsy-yellow/20 ${
                        index % 3 === 0 ? 'aspect-[3/4]' : index % 3 === 1 ? 'aspect-square' : 'aspect-[4/3]'
                      }`}
                    >
                      {/* Background Pattern */}
                      <div className="absolute inset-0 opacity-[0.03]">
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
                            backgroundSize: '30px 30px',
                          }}
                        />
                      </div>

                      {/* Animated Gradient Background */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-lmsy-yellow/30 to-lmsy-blue/30"
                        initial={false}
                        whileHover={{ scale: 1.05, opacity: 0.8 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        style={{ opacity: 0.5 }}
                      />

                      {/* Content Overlay */}
                      <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8">
                        {/* Top: live work count for this category */}
                        <div className="flex items-center gap-2">
                          <div className="h-px w-8 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue" />
                          <span className="text-xs md:text-sm font-mono text-ink-2 tracking-wider">
                            {count} {count === 1 ? 'WORK' : 'WORKS'}
                          </span>
                        </div>

                        {/* Bottom: title + description */}
                        <div className="space-y-3">
                          <motion.h3
                            className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold text-foreground"
                            initial={false}
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.3 }}
                          >
                            {label}
                          </motion.h3>
                          <p className="text-xs md:text-sm text-ink-2 leading-relaxed line-clamp-2">
                            {category.description}
                          </p>
                          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-ink-2 group-hover:text-lmsy-blue transition-colors">
                            Explore
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </div>

                      {/* Hover Glow Effect */}
                      <div className="absolute inset-0 pointer-events-none rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div
                          className="absolute inset-0"
                          style={{
                            background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.1) 0%, rgba(56, 189, 248, 0.1) 100%)',
                          }}
                        />
                      </div>

                      {/* Decorative Border */}
                      <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-br from-lmsy-yellow/30 via-lmsy-blue/30 to-lmsy-yellow/30 p-[2px]">
                        <div className="absolute inset-0 rounded-2xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0)' }} />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
