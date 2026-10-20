'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t, type TranslationKey } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';
import { getImageDimensions } from '@/lib/image-dimensions';
import { getLocalizedText, type LocalizedText } from '@/lib/localized-content';
import { formatDisplayDate } from '@/lib/display-date';

/**
 * One entry, and the pictures under it.
 *
 * The third level of door 1. Pictures first: the wall comes straight after the
 * title, and when an entry has no photograph yet the wall shows the frames it
 * will hold instead of disappearing.
 *
 * Nothing here is hard-coded - the back label, the group name and the counts
 * all come from the translation table; the entry name comes from the row's own
 * i18n object with the stored title as fallback.
 */

export interface DramaEventPageSeries {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: LocalizedText | null;
  cover_url: string | null;
}

export interface DramaEventPageEvent {
  id: string;
  group_key: string;
  slug: string;
  title: string;
  title_i18n: LocalizedText | null;
  event_date: string | null;
  description: string | null;
  description_i18n: LocalizedText | null;
  source_url: string | null;
  result: string | null;
}

export interface DramaEventPageAsset {
  id: string;
  image_url: string;
  caption: string | null;
  catalog_id: string | null;
  rotation: number | null;
}

const GROUP_LABEL: Record<string, TranslationKey> = {
  series_body: 'drama.group.seriesBody',
  music: 'drama.group.music',
  novel: 'drama.group.novel',
  promo: 'drama.group.promo',
  footage: 'drama.group.footage',
  award: 'drama.group.award',
};

export function DramaEventPageClient({
  series,
  event,
  assets,
}: {
  series: DramaEventPageSeries;
  event: DramaEventPageEvent;
  assets: DramaEventPageAsset[];
}) {
  const { language } = useLanguage();
  const title = getLocalizedText(event.title_i18n, language, event.title);
  const description = getLocalizedText(
    event.description_i18n,
    language,
    event.description
  );
  const seriesName = getLocalizedText(series.title_i18n, language, series.title);
  const dateLabel = formatDisplayDate(event.event_date, language, {
    month: 'long',
    day: true,
  });
  const groupKey = GROUP_LABEL[event.group_key];

  return (
    <div className="min-h-screen">
      <section className="pt-10 md:pt-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href={`/dramas/${series.slug || series.id}`}
            className="mb-8 inline-flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-lmsy-blue"
          >
            <ArrowLeft className="h-4 w-4" />
            {t(language, 'drama.backToEvent')}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-2">
              {seriesName}
              {groupKey ? (
                <>
                  <span className="mx-2">·</span>
                  {t(language, groupKey)}
                </>
              ) : null}
              {dateLabel ? (
                <>
                  <span className="mx-2">·</span>
                  {dateLabel}
                </>
              ) : null}
            </p>

            <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
              {title}
            </h1>

            {description ? (
              <p className="mt-5 max-w-2xl text-lg text-ink-2">{description}</p>
            ) : null}

            {event.source_url ? (
              <a
                href={event.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm text-lmsy-blue transition-colors hover:text-lmsy-yellow"
              >
                {t(language, 'home.explore')}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </motion.div>
        </div>
      </section>

      <section className="pt-12 pb-24 md:pt-16 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-baseline gap-4">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
              {t(language, 'drama.eventImages', { count: assets.length })}
            </span>
            <span className="h-px flex-1 bg-border/70" />
          </div>

          {assets.length > 0 ? (
            <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
              {assets.map((asset, index) => (
                <WallImage key={asset.id} asset={asset} index={index} />
              ))}
            </div>
          ) : (
            <EmptyWall />
          )}
        </div>
      </section>
    </div>
  );
}

function WallImage({ asset, index }: { asset: DramaEventPageAsset; index: number }) {
  const imageUrl = getImageUrl(asset.image_url);
  const dimensions = getImageDimensions(asset.image_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.3) }}
      className="mb-4 break-inside-avoid"
    >
      <Link href={`/gallery#${asset.id}`} className="group block">
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
          <Image
            src={imageUrl || ''}
            alt={asset.caption || `Image ${index + 1}`}
            width={dimensions?.width ?? 1200}
            height={dimensions?.height ?? 1600}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="h-auto w-full transition-transform duration-700 group-hover:scale-105"
            placeholder="empty"
          />
          {asset.catalog_id ? (
            <div className="absolute bottom-2 right-2 opacity-70 transition-opacity group-hover:opacity-100">
              <span className="rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-lmsy-yellow/80 backdrop-blur-sm">
                {asset.catalog_id}
              </span>
            </div>
          ) : null}
        </div>
        {asset.caption ? (
          <p className="mt-2 text-sm text-ink-2 line-clamp-2">{asset.caption}</p>
        ) : null}
      </Link>
    </motion.div>
  );
}

/**
 * The frames this entry will fill. Three of them, sized like the photographs
 * they are waiting for, so the page reads as "not photographed yet" rather
 * than "this entry has nothing".
 */
function EmptyWall() {
  const { language } = useLanguage();

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((slot) => (
          <div
            key={slot}
            className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/20"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2/70">
              {t(language, 'drama.noImages')}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">
        {t(language, 'home.collecting')}
      </p>
    </div>
  );
}
