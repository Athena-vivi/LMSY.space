'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LocalizedLink as Link } from '@/components/localized-link';
import Image from 'next/image';
import { ArrowRight, MessageSquareText, Radio } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';

interface DoorData {
  count: number;
  cover: string | null;
}

interface TalkSummary {
  talk: DoorData;
  live: DoorData;
}

const EMPTY: TalkSummary = {
  talk: { count: 0, cover: null },
  live: { count: 0, cover: null },
};

/**
 * Soul Resonance.
 *
 * Two landscape doors, split by how the thing was made rather than by medium:
 *
 *   talk - somebody else asked, filmed it, and cut it. Interviews, variety
 *          spots and radio all live behind this door because 21 variety spots
 *          cannot carry a page of their own; the landing page separates them
 *          with tabs instead.
 *   live - they held the phone themselves and nobody cut anything. This is the
 *          only content on the site with no third party in the middle, which
 *          is why it gets its own door instead of drowning inside the 97 rows
 *          of the other one.
 *
 * A magazine interview is NOT a door. The written interview is a field on the
 * issue that carried it, and the project detail page already renders it - so
 * reading an interview happens inside /projects/... , where the cover, the
 * issue number and the photos are on the same screen.
 *
 * The subtitle is empty until the curator writes one; an empty string renders
 * nothing rather than an empty paragraph.
 */
export function SoulResonanceSection() {
  const { language } = useLanguage();
  const [summary, setSummary] = useState<TalkSummary>(EMPTY);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/home/summary');
        if (!response.ok) return;
        const data = await response.json();
        if (data.interviews) setSummary(data.interviews as TalkSummary);
      } catch (error) {
        console.error('[SOUL_RESONANCE] failed to load:', error);
      }
    }
    load();
  }, []);

  const subtitle = t(language, 'home.featuredSubtitle');

  const doors = [
    {
      key: 'talk' as const,
      href: '/talks',
      label: t(language, 'home.talkDoor'),
      countKey: 'home.talkEntries' as const,
      icon: MessageSquareText,
      data: summary.talk,
    },
    {
      key: 'live' as const,
      href: '/live',
      label: t(language, 'home.liveDoor'),
      countKey: 'home.liveEntries' as const,
      icon: Radio,
      data: summary.live,
    },
  ];

  return (
    <section className="relative py-20 md:py-28">
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
                {t(language, 'home.featuredTitle')}
              </span>
            </h2>
            {subtitle ? (
              <p className="text-ink-2 text-base md:text-lg font-light">{subtitle}</p>
            ) : null}
          </div>
          <Link
            href="/editorial"
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-2 transition-colors hover:text-ink"
          >
            {t(language, 'portal.editorial')}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          {doors.map((door, index) => {
            const Icon = door.icon;
            const cover = door.data.cover ? getImageUrl(door.data.cover) : null;

            return (
              <motion.div
                key={door.key}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
              >
                <Link href={door.href} className="group block">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-card/40">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={door.label}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-lmsy-yellow/15 via-transparent to-lmsy-blue/20" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                    <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                      <Icon className="mb-3 h-5 w-5 text-lmsy-yellow" />
                      <h3 className="hover-gradient-text font-serif text-2xl font-semibold text-white md:text-3xl">
                        {door.label}
                      </h3>
                      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
                        {door.data.count > 0
                          ? t(language, door.countKey, { count: door.data.count })
                          : t(language, 'home.collecting')}
                      </p>
                    </div>

                    <div className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition-all duration-300 group-hover:border-white/50 group-hover:text-white">
                      <ArrowRight className="h-4 w-4 -rotate-45 transition-transform duration-300 group-hover:rotate-0" />
                    </div>
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
