'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LocalizedLink as Link } from '@/components/localized-link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { resolveImageUrl } from '@/lib/image-url';

interface YearEntry {
  year: number;
  count: number;
  cover: string | null;
}

/**
 * Timeline preview as a row of picture doors.
 *
 * Each tile is the year's representative photo - the picture *is* the entry
 * point, which is the whole point of a picture archive. The photo comes from
 * `gallery_assets.milestone_priority` (the per-year photo picked in the
 * admin) or, for years without one, the newest public project of that year.
 * A year with no photo keeps the same tile geometry with its year set large,
 * so the row never collapses into empty boxes of a different size.
 */
export function TimelinePreviewSection() {
  const { language } = useLanguage();
  const [years, setYears] = useState<YearEntry[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/home/summary');
        if (!response.ok) return;
        const data = await response.json();
        setYears(data.years ?? []);
      } catch (error) {
        console.error('[TIMELINE_PREVIEW] failed to load:', error);
      }
    }
    load();
  }, []);

  if (years.length === 0) return null;

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-10 md:mb-14 flex flex-wrap items-end justify-between gap-6"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                {t(language, 'home.timelineTitle')}
              </span>
            </h2>
            <p className="text-ink-2 text-base md:text-lg font-light">
              {t(language, 'home.timelineSubtitle')}
            </p>
          </div>
          <Link
            href="/timeline"
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-2 transition-colors hover:text-ink"
          >
            {t(language, 'nav.timeline')}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
          {years.slice(0, 5).map((entry, index) => {
            const cover = resolveImageUrl(entry.cover);
            return (
              <motion.div
                key={entry.year}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.07 }}
              >
                <Link href={`/timeline/${entry.year}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-white/10 bg-card/40">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={String(entry.year)}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-lmsy-yellow/10 to-lmsy-blue/10">
                        <span className="font-serif text-6xl font-bold text-ink-2/30">
                          {String(entry.year).slice(2)}
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <span className="hover-gradient-text block font-serif text-3xl font-bold leading-none text-white/95 md:text-4xl">
                        {entry.year}
                      </span>
                      <span className="mt-2 block font-mono text-[9px] uppercase tracking-[0.18em] text-white/55">
                        {entry.count > 0
                          ? t(language, 'timeline.records', { count: entry.count })
                          : t(language, 'home.collecting')}
                      </span>
                    </div>

                    <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/40 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                      <ArrowRight className="h-3.5 w-3.5 text-white/90" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
