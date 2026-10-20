'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t, type TranslationKey } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';
import { getImageDimensions } from '@/lib/image-dimensions';
import { getLocalizedText, type LocalizedText } from '@/lib/localized-content';
import { formatDisplayDate } from '@/lib/display-date';
import type { ProjectSubtype } from '@/lib/supabase/types';

/**
 * /dramas/[slug] - one series, read as pictures.
 *
 * The door is three covers; this page is one of them opened. Layout, in the
 * order the owner fixed:
 *
 *   tab row    switch to another series without walking back to the door
 *   hero       the cover, large, plus the one-line description
 *   groups     剧集本体 / 音乐作品 / 原著小说 / 宣传节点 / 影像物料 / 奖项
 *
 * Every entry is a picture first and a line of text second: the card opens the
 * event page, and an entry with no photograph keeps the same frame holding a
 * "not photographed yet" mark. Nothing here is hard-coded - labels come from
 * the translation table, entry names from the row's own i18n object.
 */

export interface DramaSeriesRow {
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
}

export interface DramaEventCard {
  id: string;
  project_id: string;
  group_key: string;
  slug: string;
  title: string;
  title_i18n: LocalizedText | null;
  event_date: string | null;
  description: string | null;
  description_i18n: LocalizedText | null;
  source_url: string | null;
  result: string | null;
  sort_order: number;
  cover_url: string | null;
  cover: string | null;
  imageCount: number;
}

export interface DramaAssetRow {
  id: string;
  image_url: string;
  caption: string | null;
  catalog_id: string | null;
  rotation: number | null;
  event_id: string | null;
}

const GROUP_ORDER: Array<{ key: string; labelKey: TranslationKey }> = [
  { key: 'series_body', labelKey: 'drama.group.seriesBody' },
  { key: 'music', labelKey: 'drama.group.music' },
  { key: 'novel', labelKey: 'drama.group.novel' },
  { key: 'promo', labelKey: 'drama.group.promo' },
  { key: 'footage', labelKey: 'drama.group.footage' },
  { key: 'award', labelKey: 'drama.group.award' },
];

export function DramaDetailClient({
  drama,
  siblings,
  events,
  assets,
}: {
  drama: DramaSeriesRow;
  siblings: DramaSeriesRow[];
  events: DramaEventCard[];
  assets: DramaAssetRow[];
}) {
  const { language } = useLanguage();
  const title = getLocalizedText(drama.title_i18n, language, drama.title);
  const description = getLocalizedText(drama.description_i18n, language, drama.description);
  const cover = drama.cover_url ? getImageUrl(drama.cover_url) : null;
  const year =
    drama.event_date?.slice(0, 4) ?? drama.release_date?.slice(0, 4) ?? null;
  const seriesSlug = drama.slug || drama.id;

  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        if (a.event_date && b.event_date && a.event_date !== b.event_date) {
          return a.event_date < b.event_date ? -1 : 1;
        }
        if (a.event_date && !b.event_date) return -1;
        if (!a.event_date && b.event_date) return 1;
        return a.sort_order - b.sort_order;
      }),
    [events]
  );

  return (
    <div className="min-h-screen">
      <section className="pt-10 md:pt-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/dramas"
            className="mb-8 inline-flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-lmsy-blue"
          >
            <ArrowLeft className="h-4 w-4" />
            {t(language, 'drama.back')}
          </Link>

          {/* Tab row: one pill per series. A link, not local state, so the
              address stays shareable and every series keeps its own URL. */}
          <div className="mb-10 flex flex-wrap gap-3">
            {siblings.map((sibling) => {
              const siblingSlug = sibling.slug || sibling.id;
              const active = sibling.id === drama.id;
              return (
                <Link
                  key={sibling.id}
                  href={`/dramas/${siblingSlug}`}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-full border px-5 py-2 text-sm font-medium transition-all duration-300 ${
                    active
                      ? 'border-transparent bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-black shadow-lg shadow-lmsy-yellow/20'
                      : 'border-border bg-muted text-ink-2 hover:border-lmsy-blue hover:text-lmsy-blue'
                  }`}
                >
                  {getLocalizedText(sibling.title_i18n, language, sibling.title)}
                </Link>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="flex flex-col gap-8 md:flex-row md:items-end md:gap-12"
          >
            <div className="relative w-full max-w-[300px] shrink-0 overflow-hidden rounded-2xl border border-border bg-card/40 md:max-w-[340px]">
              <div className="relative aspect-[3/4]">
                {cover ? (
                  <Image
                    src={cover}
                    alt={title}
                    fill
                    unoptimized
                    priority
                    sizes="(max-width: 768px) 100vw, 340px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-lmsy-yellow/15 via-card to-lmsy-blue/15 px-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2">
                    {t(language, 'home.collecting')}
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
                {title}
              </h1>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
                {year ?? '—'}
                <span className="mx-2">·</span>
                {t(language, 'dramas.eventCount', { count: events.length })}
              </p>
              {description ? (
                <p className="mt-5 max-w-2xl text-lg text-ink-2">{description}</p>
              ) : null}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pt-16 pb-24 md:pt-20 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16 md:space-y-20">
            {GROUP_ORDER.map((group) => (
              <GroupSection
                key={group.key}
                group={group}
                rows={sorted.filter((row) => row.group_key === group.key)}
                assets={assets}
                seriesSlug={seriesSlug}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function GroupSection({
  group,
  rows,
  assets,
  seriesSlug,
}: {
  group: { key: string; labelKey: TranslationKey };
  rows: DramaEventCard[];
  assets: DramaAssetRow[];
  seriesSlug: string;
}) {
  const { language } = useLanguage();

  const body = (() => {
    if (group.key === 'footage') {
      return <FootageGrid assets={assets} />;
    }
    if (group.key === 'award') {
      return <AwardGrid rows={rows} seriesSlug={seriesSlug} />;
    }
    if (rows.length === 0) {
      return <EmptyRow />;
    }
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row, index) => (
          <EventCard key={row.id} row={row} seriesSlug={seriesSlug} index={index} />
        ))}
      </div>
    );
  })();

  return (
    <div id={group.key} className="scroll-mt-24">
      <div className="mb-5 flex items-baseline gap-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
          {t(language, group.labelKey)}
        </h2>
        <span className="h-px flex-1 bg-border/70" />
      </div>
      {body}
    </div>
  );
}

function EmptyRow() {
  const { language } = useLanguage();
  return (
    <p className="rounded-xl border border-dashed border-border/70 px-5 py-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">
      {t(language, 'home.collecting')}
    </p>
  );
}

function EventCard({
  row,
  seriesSlug,
  index,
}: {
  row: DramaEventCard;
  seriesSlug: string;
  index: number;
}) {
  const { language } = useLanguage();
  const title = getLocalizedText(row.title_i18n, language, row.title);
  const cover = row.cover ? getImageUrl(row.cover) : null;
  const dateLabel = formatDisplayDate(row.event_date, language, {
    month: 'short',
    day: true,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.36) }}
      className="group"
    >
      <Link href={`/dramas/${seriesSlug}/${row.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-card/40">
          {cover ? (
            <Image
              src={cover}
              alt={title}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-lmsy-yellow/10 via-card to-lmsy-blue/10">
              <span className="px-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2">
                {t(language, 'drama.noImages')}
              </span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-95" />

          {row.imageCount > 1 ? (
            <div className="absolute right-3 top-3">
              <span className="rounded-full border border-white/20 bg-black/50 px-2.5 py-1 font-mono text-[10px] text-ink backdrop-blur">
                {row.imageCount}
              </span>
            </div>
          ) : null}

          <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-5">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/70">
              {dateLabel ?? '—'}
            </p>
            <h3 className="font-serif text-lg font-semibold leading-snug text-ink md:text-xl">
              {title}
            </h3>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function AwardGrid({ rows, seriesSlug }: { rows: DramaEventCard[]; seriesSlug: string }) {
  const { language } = useLanguage();

  if (rows.length === 0) return <EmptyRow />;

  const won = rows.filter((row) => row.result === 'won');
  const nominated = rows.filter((row) => row.result !== 'won');

  const sections: Array<{ labelKey: TranslationKey; items: DramaEventCard[] }> = [
    { labelKey: 'drama.awardWon', items: won },
    { labelKey: 'drama.awardNominated', items: nominated },
  ];

  return (
    <div className="space-y-8">
      {sections
        .filter((section) => section.items.length > 0)
        .map((section) => (
          <div key={section.labelKey}>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">
              {t(language, section.labelKey)}
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((row, index) => (
                <EventCard key={row.id} row={row} seriesSlug={seriesSlug} index={index} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

function FootageGrid({ assets }: { assets: DramaAssetRow[] }) {
  const { language } = useLanguage();

  if (assets.length === 0) return <EmptyRow />;

  return (
    <div>
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
        {assets.map((asset, index) => (
          <AssetCard key={asset.id} asset={asset} index={index} />
        ))}
      </div>
      <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">
        <Link href="/gallery" className="hover:text-lmsy-blue">
          {t(language, 'drama.footageCount', { count: assets.length })}
        </Link>
      </p>
    </div>
  );
}

function AssetCard({ asset, index }: { asset: DramaAssetRow; index: number }) {
  const imageUrl = getImageUrl(asset.image_url);
  const dimensions = getImageDimensions(asset.image_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.32) }}
      className="mb-4 break-inside-avoid"
    >
      <Link href={`/gallery#${asset.id}`} className="group block">
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
          <Image
            src={imageUrl || ''}
            alt={asset.caption || `Still ${index + 1}`}
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
      </Link>
    </motion.div>
  );
}
