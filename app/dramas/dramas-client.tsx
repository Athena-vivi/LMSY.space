'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { PageIntro } from '@/components/page-intro';
import { t } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';
import { getLocalizedText, type LocalizedText } from '@/lib/localized-content';
import type { ProjectSubtype } from '@/lib/supabase/types';

/**
 * /dramas - the three series, as three pictures.
 *
 * This is a picture archive, so the door is pictures, not a filter row: three
 * large covers side by side, every one of them clickable straight through to
 * its series. A series that has no cover yet keeps its frame and says so - a
 * missing card would read as "this series never happened".
 *
 * The tab row moved to the series page: once you are inside one series you can
 * jump to another without walking back out to the door.
 */

export interface DramaCardRow {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  description: string | null;
  description_i18n: LocalizedText | null;
  subtype: ProjectSubtype | null;
  event_date: string | null;
  release_date: string | null;
  cover_url: string | null;
  entryCount: number;
}

export function DramasClient({ series }: { series: DramaCardRow[] }) {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen">
      <PageIntro
        title={t(language, 'dramas.title')}
        description={t(language, 'dramas.description')}
      />

      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            {series.map((drama, index) => (
              <SeriesCard key={drama.id} drama={drama} index={index} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SeriesCard({ drama, index }: { drama: DramaCardRow; index: number }) {
  const { language } = useLanguage();
  const title = getLocalizedText(drama.title_i18n, language, drama.title);
  const cover = drama.cover_url ? getImageUrl(drama.cover_url) : null;
  const href = `/dramas/${drama.slug || drama.id}`;
  const year =
    drama.event_date?.slice(0, 4) ?? drama.release_date?.slice(0, 4) ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.12 }}
      className="group relative"
    >
      <Link href={href} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-card/40">
          {cover ? (
            <Image
              src={cover}
              alt={title}
              fill
              unoptimized
              priority={index < 2}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-[900ms] group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-lmsy-yellow/15 via-card to-lmsy-blue/15" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent opacity-85 transition-opacity duration-500 group-hover:opacity-95" />

          {!cover && (
            <div className="absolute right-4 top-4">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-black/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink backdrop-blur">
                {t(language, 'home.collecting')}
              </span>
            </div>
          )}

          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
            <h2 className="mb-3 font-serif text-3xl font-bold leading-tight text-ink md:text-4xl">
              {title}
            </h2>

            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/70">
              {year ?? '—'}
              <span className="mx-2">·</span>
              {t(language, 'dramas.eventCount', { count: drama.entryCount })}
            </p>

            <div className="flex items-center gap-2 text-ink transition-transform duration-300 group-hover:translate-x-1">
              <span className="text-xs uppercase tracking-[0.2em] md:text-sm">
                {t(language, 'dramas.viewSeries')}
              </span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
