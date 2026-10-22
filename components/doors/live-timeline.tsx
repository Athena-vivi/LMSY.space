'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/language-provider';
import { t, type TranslationKey } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';
import { formatDisplayDate } from '@/lib/display-date';
import { getLocalizedText } from '@/lib/localized-content';
import type { DoorEntryGroup, DoorEntryRow } from '@/lib/door-data';
import { ArrowLeft } from 'lucide-react';

/**
 * Level 2 of the live-events door: a vertical timeline.
 *
 * One node per entry, newest first (the rows arrive sorted). The line runs
 * down the middle; each node hangs its picture classes off it as boxes - the
 * classes the curator filed (airport official / airport fan / rehearsal /
 * show ...), or a single "all photos" box while nothing is classified yet.
 * Clicking a box opens the entry's detail page filtered to that class, so
 * pictures are one more click away instead of all spread out on the shelf.
 */

export function LiveTimelinePage({
  titleKey,
  doorTitleKey,
  doorHref,
  entries,
  groups,
}: {
  titleKey: TranslationKey | null;
  doorTitleKey: TranslationKey;
  doorHref: string;
  entries: DoorEntryRow[];
  /** entry id -> its picture classes, from loadSegmentEntryGroups. */
  groups: Map<string, DoorEntryGroup[]>;
}) {
  const { language } = useLanguage();
  const title = titleKey ? t(language, titleKey) : t(language, 'door.unfiled');

  return (
    <div className="min-h-screen">
      <section className="pt-12 pb-10 md:pt-16 md:pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href={doorHref}
            className="mb-8 inline-flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-lmsy-blue"
          >
            <ArrowLeft className="h-4 w-4" />
            {t(language, doorTitleKey)}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
              {t(language, 'dramas.eventCount', { count: entries.length })}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {entries.length > 0 ? (
            <div className="relative">
              {/* The spine. Runs through every node's dot. */}
              <div
                className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-lmsy-yellow/40 via-border to-transparent"
                style={{ left: '1.25rem' }}
                aria-hidden
              />

              <div className="space-y-14">
                {entries.map((entry, index) => (
                  <TimelineNode
                    key={entry.id}
                    entry={entry}
                    index={index}
                    entryGroups={groups.get(entry.id) ?? []}
                  />
                ))}
              </div>
            </div>
          ) : (
            <EmptyShelf />
          )}
        </div>
      </section>
    </div>
  );
}

function TimelineNode({
  entry,
  index,
  entryGroups,
}: {
  entry: DoorEntryRow;
  index: number;
  entryGroups: DoorEntryGroup[];
}) {
  const { language } = useLanguage();
  const title = getLocalizedText(entry.title_i18n, language, entry.title);
  const dateLabel = formatDisplayDate(entry.event_date ?? entry.release_date, language, {
    month: 'long',
    day: true,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.25) }}
      className="relative pl-12 md:pl-16"
    >
      {/* Node dot, sitting on the spine. */}
      <span
        className="absolute top-2 flex h-4 w-4 items-center justify-center"
        style={{ left: '1.25rem', transform: 'translateX(-50%)' }}
        aria-hidden
      >
        <span className="absolute h-4 w-4 rounded-full border border-lmsy-yellow/50 bg-background" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-lmsy-yellow" />
      </span>

      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-2">
        {dateLabel ?? '—'}
      </p>
      <h2 className="mt-1.5 font-serif text-2xl font-bold leading-snug text-ink md:text-3xl">
        <Link href={entry.href} className="transition-colors hover:text-lmsy-blue">
          {title}
        </Link>
      </h2>

      {entryGroups.length > 0 ? (
        // Mobile: one full-width portrait box per class (the line already
        // eats ~3rem). From sm up: 2 columns, xl: 3 - bigger on desktop too.
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entryGroups.map((group) => (
            <GroupBox key={group.key ?? 'all'} entry={entry} group={group} />
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}

function GroupBox({ entry, group }: { entry: DoorEntryRow; group: DoorEntryGroup }) {
  const { language } = useLanguage();
  const label = group.key ?? t(language, 'live.allPhotos');
  const cover = group.cover ? getImageUrl(group.cover) : null;
  // A class box answers on the entry's detail page, filtered to the class.
  const href = group.key
    ? `${entry.href}?group=${encodeURIComponent(group.key)}`
    : entry.href;

  return (
    <Link
      href={href}
      className="group relative block w-full overflow-hidden rounded-xl border border-border bg-card/40 transition-colors hover:border-lmsy-blue/50"
    >
      {/* Portrait box: vertical pictures are the archive's dominant shape, so
          heads and feet survive. Mobile fills the available width; sm+ gets
          a fixed column from the grid above. */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt={label}
            fill
            unoptimized
            sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        {/* Name + count float on the picture instead of a reserved strip. */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2.5 pt-8">
          <p className="truncate font-serif text-sm font-bold text-white transition-colors group-hover:text-lmsy-yellow">
            {label}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
            {t(language, 'drama.eventImages', { count: group.count })}
          </p>
        </div>
      </div>
    </Link>
  );
}

function EmptyShelf() {
  const { language } = useLanguage();
  return (
    <div className="rounded-xl border border-dashed border-border/70 px-6 py-24 text-center">
      <p className="font-serif text-xl text-ink">{t(language, 'home.collecting')}</p>
      <p className="mt-3 text-sm text-ink-2">{t(language, 'project.emptyDesc')}</p>
    </div>
  );
}
