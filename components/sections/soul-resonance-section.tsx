'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Camera, Play } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';

interface InterviewDoor {
  count: number;
  cover: string | null;
}

interface InterviewSummary {
  photo: InterviewDoor;
  video: InterviewDoor;
}

const EMPTY: InterviewSummary = {
  photo: { count: 0, cover: null },
  video: { count: 0, cover: null },
};

/**
 * Soul Resonance.
 *
 * This block used to repeat the portal row with a second grid of covers - the
 * same photos, sorted differently. It is now the reading entrance: two
 * landscape doors, one for interviews that came from a magazine shoot (text
 * only) and one for interviews that came from a video (text stays here, the
 * video opens elsewhere).
 *
 * Both doors open the magazine index (/editorial) - the issue rack that
 * already holds covers, catalog ids and the per-issue reading entry. That page
 * is deliberately left unfiltered: the door only says which kind of interview
 * you are looking for, the rack stays one rack.
 *
 * The subtitle is empty until the curator writes one; an empty string renders
 * nothing rather than an empty paragraph.
 */
export function SoulResonanceSection() {
  const { language } = useLanguage();
  const [interviews, setInterviews] = useState<InterviewSummary>(EMPTY);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/home/summary');
        if (!response.ok) return;
        const data = await response.json();
        if (data.interviews) setInterviews(data.interviews as InterviewSummary);
      } catch (error) {
        console.error('[SOUL_RESONANCE] failed to load:', error);
      }
    }
    load();
  }, []);

  const subtitle = t(language, 'home.featuredSubtitle');

  const doors = [
    {
      key: 'photo' as const,
      href: '/editorial',
      label: t(language, 'home.interviewPhoto'),
      icon: Camera,
      data: interviews.photo,
    },
    {
      key: 'video' as const,
      href: '/editorial',
      label: t(language, 'home.interviewVideo'),
      icon: Play,
      data: interviews.video,
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
                          ? t(language, 'home.interviewEntries', { count: door.data.count })
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
