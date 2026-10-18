'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

interface YearEntry {
  year: number;
  count: number;
}

/**
 * Timeline preview. The years are the real distribution of `event_date`
 * across public projects. The archive starts in 2022, and the API trims the
 * empty leading-edge years (keeping at least three tiles) so this block only
 * spends space on periods that actually hold records. A year kept in the row
 * but still empty is labelled as such; it is never invented.
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

  // Up to five years, most recent first. Empty years stay in the row so the
  // visitor sees the shape of the archive rather than a false density.
  const visible = years.slice(0, 5);

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 md:mb-16 flex flex-wrap items-end justify-between gap-6"
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {visible.map((entry, index) => (
            <motion.div
              key={entry.year}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.07 }}
            >
              <Link
                href={`/timeline/${entry.year}`}
                className="group relative flex flex-col items-center justify-center rounded-xl border border-border bg-card/30 px-4 py-10 transition-colors hover:border-lmsy-yellow/40 hover:bg-card/60"
              >
                <span className="font-serif text-4xl md:text-5xl font-bold text-foreground/90 transition-colors group-hover:text-lmsy-yellow">
                  {entry.year}
                </span>
                <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2">
                  {entry.count > 0
                    ? t(language, 'timeline.records', { count: entry.count })
                    : t(language, 'timeline.emptyYear')}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
