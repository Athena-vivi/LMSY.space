'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { PageIntro } from '@/components/page-intro';
import { t, type TranslationKey } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';
import { getLocalizedText, type LocalizedText } from '@/lib/localized-content';
import { formatDisplayDate } from '@/lib/display-date';
import { SUBTYPES_BY_CATEGORY } from '@/lib/category-registry';
import type { ProjectSubtype } from '@/lib/supabase/types';

/**
 * /dramas - the interactive shell of door 1.
 *
 * Three tabs, one per series, in broadcast order; a fourth series is a new
 * subtype value in the registry, not a new page. Under the active series the
 * entries run vertically in the groups the owner approved:
 *   剧集本体 / 音乐作品 / 原著小说 / 宣传节点 / 影像物料 / 奖项
 * (官方周边 has no per-series breakdown yet and stays out until it has one.)
 *
 * Every tab stays clickable even while its series is still being filled: a
 * missing tab would read as "this series never happened".
 */

export interface DramaRow {
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

export interface DramaEventRow {
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

const GROUP_ORDER: Array<{ key: string; labelKey: TranslationKey }> = [
  { key: 'series_body', labelKey: 'drama.group.seriesBody' },
  { key: 'music', labelKey: 'drama.group.music' },
  { key: 'novel', labelKey: 'drama.group.novel' },
  { key: 'promo', labelKey: 'drama.group.promo' },
  { key: 'footage', labelKey: 'drama.group.footage' },
  { key: 'award', labelKey: 'drama.group.award' },
];

export function DramasClient({
  dramas,
  events,
  assetCounts,
}: {
  dramas: DramaRow[];
  events: DramaEventRow[];
  assetCounts: Record<string, number>;
}) {
  const { language } = useLanguage();
  const tabs = SUBTYPES_BY_CATEGORY.drama_work ?? [];
  const [active, setActive] = useState<ProjectSubtype>(tabs[0]?.value ?? 'affair');

  const drama = useMemo(
    () => dramas.find((row) => row.subtype === active) ?? null,
    [dramas, active]
  );

  const rows = useMemo(
    () => (drama ? events.filter((event) => event.project_id === drama.id) : []),
    [events, drama]
  );

  const entryCount = rows.length;

  return (
    <div className="min-h-screen">
      <PageIntro
        title={t(language, 'dramas.title')}
        description={t(language, 'dramas.description')}
      />

      <section className="pb-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => {
              const activeTab = tab.value === active;
              const series = dramas.find((row) => row.subtype === tab.value);
              const count = series
                ? events.filter((event) => event.project_id === series.id).length
                : 0;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActive(tab.value)}
                  aria-pressed={activeTab}
                  className={`px-5 py-2 text-sm font-medium transition-all duration-300 rounded-full border ${
                    activeTab
                      ? 'bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-black border-transparent shadow-lg shadow-lmsy-yellow/20'
                      : 'bg-muted text-ink-2 border-border hover:border-lmsy-blue hover:text-lmsy-blue'
                  }`}
                >
                  {t(language, tab.labelKey)}
                  <span
                    className={`ml-2 font-mono text-xs ${
                      activeTab ? 'text-black/60' : 'text-ink-2/70'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {!drama ? (
            <p className="py-20 text-center text-lg text-ink-2">
              {t(language, 'home.collecting')}
            </p>
          ) : (
            <motion.div
              key={drama.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-14"
            >
              <SeriesHeader drama={drama} entryCount={entryCount} />

              {GROUP_ORDER.map((group) => (
                <GroupBlock
                  key={group.key}
                  group={group}
                  rows={rows}
                  drama={drama}
                  assetCount={assetCounts[drama.id] ?? 0}
                />
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

function SeriesHeader({ drama, entryCount }: { drama: DramaRow; entryCount: number }) {
  const { language } = useLanguage();
  const title = getLocalizedText(drama.title_i18n, language, drama.title);
  const cover = drama.cover_url ? getImageUrl(drama.cover_url) : null;
  const year =
    drama.event_date?.slice(0, 4) ?? drama.release_date?.slice(0, 4) ?? null;
  const href = `/dramas/${drama.slug || drama.id}`;

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center">
      <Link
        href={href}
        className="relative block w-full max-w-[210px] shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
      >
        <div className="relative aspect-[3/4]">
          {cover ? (
            <Image
              src={cover}
              alt={title}
              fill
              sizes="210px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-center text-sm text-ink-2">
              {t(language, 'home.collecting')}
            </div>
          )}
        </div>
      </Link>

      <div>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-ink">{title}</h2>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
          {year ?? '—'}
          <span className="mx-2">·</span>
          {t(language, 'dramas.eventCount', { count: entryCount })}
        </p>
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-2 text-sm text-lmsy-blue transition-colors hover:text-lmsy-yellow"
        >
          {t(language, 'dramas.viewSeries')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function GroupBlock({
  group,
  rows,
  drama,
  assetCount,
}: {
  group: { key: string; labelKey: TranslationKey };
  rows: DramaEventRow[];
  drama: DramaRow;
  assetCount: number;
}) {
  const { language } = useLanguage();
  const list = useMemo(
    () =>
      rows
        .filter((row) => row.group_key === group.key)
        .sort((a, b) => {
          if (a.event_date && b.event_date && a.event_date !== b.event_date) {
            return a.event_date < b.event_date ? -1 : 1;
          }
          if (a.event_date && !b.event_date) return -1;
          if (!a.event_date && b.event_date) return 1;
          return a.sort_order - b.sort_order;
        }),
    [rows, group.key]
  );

  const href = `/dramas/${drama.slug || drama.id}#${group.key}`;
  const isFootage = group.key === 'footage';
  const isAward = group.key === 'award';

  return (
    <div>
      <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
        {t(language, group.labelKey)}
      </h3>

      {isAward ? (
        <AwardList rows={list} href={href} />
      ) : list.length === 0 && !(isFootage && assetCount > 0) ? (
        <p className="text-ink-2">{t(language, 'home.collecting')}</p>
      ) : (
        <ul className="divide-y divide-border/70 border-t border-border/70">
          {isFootage && assetCount > 0 && (
            <li>
              <Link
                href={href}
                className="flex items-center gap-4 py-3 text-sm text-lmsy-blue transition-colors hover:text-lmsy-yellow"
              >
                {t(language, 'drama.footageCount', { count: assetCount })}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          )}
          {list.map((row) => (
            <EventRow key={row.slug} row={row} href={href} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AwardList({ rows, href }: { rows: DramaEventRow[]; href: string }) {
  const { language } = useLanguage();
  const won = rows.filter((row) => row.result === 'won');
  const nominated = rows.filter((row) => row.result !== 'won');

  if (rows.length === 0) {
    return <p className="text-ink-2">{t(language, 'home.collecting')}</p>;
  }

  const sections: Array<{ labelKey: TranslationKey; items: DramaEventRow[] }> = [
    { labelKey: 'drama.awardWon', items: won },
    { labelKey: 'drama.awardNominated', items: nominated },
  ];

  return (
    <div className="space-y-6">
      {sections
        .filter((section) => section.items.length > 0)
        .map((section) => (
          <div key={section.labelKey}>
            <p className="mb-2 text-sm text-ink-2">{t(language, section.labelKey)}</p>
            <ul className="divide-y divide-border/70 border-t border-border/70">
              {section.items.map((row) => (
                <EventRow key={row.slug} row={row} href={href} />
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

function EventRow({ row, href }: { row: DramaEventRow; href: string }) {
  const { language } = useLanguage();
  const dateLabel = formatDisplayDate(row.event_date, language, {
    month: 'short',
    day: true,
  });

  return (
    <li className="flex items-baseline gap-4 py-3">
      <span className="w-24 shrink-0 font-mono text-xs text-ink-2">
        {dateLabel ?? '—'}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className="text-ink transition-colors hover:text-lmsy-blue"
        >
          {row.title}
        </Link>
        {row.description ? (
          <p className="mt-0.5 text-sm text-ink-2">{row.description}</p>
        ) : null}
      </div>
      {row.source_url ? (
        <a
          href={row.source_url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-ink-2 transition-colors hover:text-lmsy-blue"
          aria-label={row.title}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : null}
    </li>
  );
}
