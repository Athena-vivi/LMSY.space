'use client';

import { useMemo } from 'react';
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
import type { ProjectSubtype } from '@/lib/supabase/types';

/**
 * /dramas/[slug] - one series, every dated entry under it.
 *
 * This is the SEO surface of door 1: each series owns one URL with its own
 * title and description, so "Lookmhee Sonya Affair OST" style queries land on
 * the series rather than on a filtered list.
 *
 * Vertical groups run in the order the owner approved:
 *   剧集本体 / 音乐作品 / 原著小说 / 宣传节点 / 影像物料 / 奖项
 * The footage group is fed by gallery_assets linked to this project, so stills
 * and clips live next to the dated entries instead of in a separate page.
 */

export interface DramaDetailEvent {
  project_id: string;
  group_key: string;
  slug: string;
  title: string;
  event_date: string | null;
  description: string | null;
  source_url: string | null;
  result: string | null;
  sort_order: number;
}

export interface DramaDetailAsset {
  id: string;
  image_url: string;
  caption: string | null;
  catalog_id: string | null;
  rotation: number | null;
  event_date: string | null;
}

export interface DramaDetailClientProps {
  drama: {
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
  };
  events: DramaDetailEvent[];
  assets: DramaDetailAsset[];
}

const GROUP_ORDER: Array<{ key: string; labelKey: TranslationKey }> = [
  { key: 'series_body', labelKey: 'drama.group.seriesBody' },
  { key: 'music', labelKey: 'drama.group.music' },
  { key: 'novel', labelKey: 'drama.group.novel' },
  { key: 'promo', labelKey: 'drama.group.promo' },
  { key: 'footage', labelKey: 'drama.group.footage' },
  { key: 'award', labelKey: 'drama.group.award' },
];

export function DramaDetailClient({ drama, events, assets }: DramaDetailClientProps) {
  const { language } = useLanguage();
  const title = getLocalizedText(drama.title_i18n, language, drama.title);
  const description = getLocalizedText(drama.description_i18n, language, drama.description);
  const cover = drama.cover_url ? getImageUrl(drama.cover_url) : null;
  const year =
    drama.event_date?.slice(0, 4) ?? drama.release_date?.slice(0, 4) ?? null;

  const rows = useMemo(
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
      <section className="pt-14 pb-10 md:pt-20 md:pb-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href="/dramas"
              className="mb-6 inline-flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-lmsy-blue"
            >
              <ArrowLeft className="h-4 w-4" />
              {t(language, 'drama.back')}
            </Link>

            <div className="flex flex-col gap-8 md:flex-row md:items-end">
              {cover ? (
                <div className="relative w-full max-w-[260px] shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={cover}
                      alt={title}
                      fill
                      sizes="260px"
                      unoptimized
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <h1 className="font-serif text-4xl font-bold tracking-tight text-ink md:text-5xl lg:text-6xl">
                  {title}
                </h1>
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
                  {year ?? '—'}
                  <span className="mx-2">·</span>
                  {t(language, 'dramas.eventCount', { count: events.length })}
                </p>
                {description ? (
                  <p className="mt-4 max-w-2xl text-lg text-ink-2">{description}</p>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-14">
            {GROUP_ORDER.map((group) => (
              <GroupSection
                key={group.key}
                group={group}
                rows={rows}
                assets={assets}
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
}: {
  group: { key: string; labelKey: TranslationKey };
  rows: DramaDetailEvent[];
  assets: DramaDetailAsset[];
}) {
  const { language } = useLanguage();

  const list = useMemo(
    () => rows.filter((row) => row.group_key === group.key),
    [rows, group.key]
  );

  if (group.key === 'footage') {
    if (assets.length === 0) {
      return (
        <GroupShell group={group}>
          <p className="text-ink-2">{t(language, 'home.collecting')}</p>
        </GroupShell>
      );
    }
    return (
      <GroupShell group={group}>
        <div className="columns-2 gap-4 md:columns-3">
          {assets.map((asset, index) => (
            <AssetCard key={asset.id} asset={asset} index={index} />
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-2">
          <Link href="/gallery" className="text-lmsy-blue hover:text-lmsy-yellow">
            {t(language, 'drama.footageCount', { count: assets.length })}
          </Link>
        </p>
      </GroupShell>
    );
  }

  if (group.key === 'award') {
    const won = list.filter((row) => row.result === 'won');
    const nominated = list.filter((row) => row.result !== 'won');
    const sections: Array<{ labelKey: TranslationKey; items: DramaDetailEvent[] }> = [
      { labelKey: 'drama.awardWon', items: won },
      { labelKey: 'drama.awardNominated', items: nominated },
    ];

    return (
      <GroupShell group={group}>
        {list.length === 0 ? (
          <p className="text-ink-2">{t(language, 'home.collecting')}</p>
        ) : (
          <div className="space-y-8">
            {sections
              .filter((section) => section.items.length > 0)
              .map((section) => (
                <div key={section.labelKey}>
                  <p className="mb-3 text-sm text-ink-2">
                    {t(language, section.labelKey)}
                  </p>
                  <EventList items={section.items} />
                </div>
              ))}
          </div>
        )}
      </GroupShell>
    );
  }

  return (
    <GroupShell group={group}>
      {list.length === 0 ? (
        <p className="text-ink-2">{t(language, 'home.collecting')}</p>
      ) : (
        <EventList items={list} />
      )}
    </GroupShell>
  );
}

function GroupShell({
  group,
  children,
}: {
  group: { key: string; labelKey: TranslationKey };
  children: React.ReactNode;
}) {
  const { language } = useLanguage();
  return (
    <div id={group.key}>
      <h2 className="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
        {t(language, group.labelKey)}
      </h2>
      {children}
    </div>
  );
}

function EventList({ items }: { items: DramaDetailEvent[] }) {
  return (
    <ul className="divide-y divide-border/70 border-t border-border/70">
      {items.map((row) => (
        <EventRow key={row.slug} row={row} />
      ))}
    </ul>
  );
}

function EventRow({ row }: { row: DramaDetailEvent }) {
  const { language } = useLanguage();
  const dateLabel = formatDisplayDate(row.event_date, language, {
    month: 'short',
    day: true,
  });

  return (
    <li className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-28 shrink-0 font-mono text-xs text-ink-2">
        {dateLabel ?? '—'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-ink">{row.title}</span>
          {row.source_url ? (
            <a
              href={row.source_url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-ink-2 transition-colors hover:text-lmsy-blue"
              aria-label={row.title}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
        {row.description ? (
          <p className="mt-1 text-sm text-ink-2">{row.description}</p>
        ) : null}
      </div>
    </li>
  );
}

function AssetCard({ asset, index }: { asset: DramaDetailAsset; index: number }) {
  const imageUrl = getImageUrl(asset.image_url);
  const dimensions = getImageDimensions(asset.image_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.4) }}
      className="mb-4 break-inside-avoid"
    >
      <Link href={`/gallery#${asset.id}`} className="group block">
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
          <Image
            src={imageUrl || ''}
            alt={asset.caption || `Still ${index + 1}`}
            width={dimensions?.width ?? 1200}
            height={dimensions?.height ?? 1600}
            sizes="(max-width: 768px) 50vw, 33vw"
            className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
            placeholder="empty"
          />
          {asset.catalog_id ? (
            <div className="absolute bottom-2 right-2 opacity-70 transition-opacity group-hover:opacity-100">
              <span className="font-mono text-[10px] text-lmsy-yellow/80 bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
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
