'use client';

import { LocalizedLink as Link } from '@/components/localized-link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useLanguage } from '@/components/language-provider';
import { t, type TranslationKey } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';
import { formatDisplayDate } from '@/lib/display-date';
import { getLocalizedText } from '@/lib/localized-content';
import type { DoorEntryGroup, DoorEntryRow, TalkResourceCovers } from '@/lib/door-data';
import { ResourceBox } from './resource-box';
import { ArrowLeft, Play } from 'lucide-react';

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
  resourceCovers,
}: {
  titleKey: TranslationKey | null;
  doorTitleKey: TranslationKey;
  doorHref: string;
  entries: DoorEntryRow[];
  /** entry id -> its picture classes, from loadSegmentEntryGroups. */
  groups: Map<string, DoorEntryGroup[]>;
  /** entry id -> curator-pinned cover per resource box (optional). */
  resourceCovers?: Map<string, TalkResourceCovers>;
}) {
  const { language } = useLanguage();
  const title = titleKey ? t(language, titleKey) : t(language, 'door.unfiled');

  // Arriving from an entry's breadcrumb carries that row's id as a hash. A
  // client-side route change does not reliably replay a hash, and the row only
  // exists once the timeline has laid out, so put the visitor on it here.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    const frame = requestAnimationFrame(() => {
      const row = document.getElementById(id);
      if (!row) return;
      // The global `scroll-behavior: smooth` would animate a jump of several
      // thousand pixels; this is a return to where they were, not a tour.
      const root = document.documentElement;
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      row.scrollIntoView({ block: 'start' });
      root.style.scrollBehavior = previous;
    });

    return () => cancelAnimationFrame(frame);
  }, []);

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
                    pinned={resourceCovers?.get(entry.id)}
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
  pinned,
}: {
  entry: DoorEntryRow;
  index: number;
  entryGroups: DoorEntryGroup[];
  pinned?: TalkResourceCovers;
}) {
  const { language } = useLanguage();
  const title = getLocalizedText(entry.title_i18n, language, entry.title);
  const dateLabel = formatDisplayDate(entry.event_date ?? entry.release_date, language, {
    month: 'long',
    day: true,
  });

  // Video links the curator pasted in the videos workbench or the old Settings
  // panel. Same boxes as the talks door, so a live event grows them the moment
  // a URL is saved. Thumbnail: the picture pinned on the curation page for that
  // box, else the first picture class that has a cover, else the entry cover.
  const defaultVideoCover =
    entryGroups.find((group) => group.cover)?.cover ?? entry.cover_url ?? null;
  const coverOf = (slot: keyof TalkResourceCovers) => pinned?.[slot] ?? defaultVideoCover;

  const videoBoxes: React.ReactNode[] = [];
  if (entry.video_url_bilibili) {
    videoBoxes.push(
      <ResourceBox
        key="bilibili"
        href={entry.video_url_bilibili}
        external
        cover={coverOf('bilibili')}
        label={t(language, 'talks.bilibili')}
        hint={t(language, 'talks.watch')}
        icon={<Play className="h-3.5 w-3.5" />}
      />
    );
  }
  if (entry.video_url_youtube) {
    videoBoxes.push(
      <ResourceBox
        key="youtube"
        href={entry.video_url_youtube}
        external
        cover={coverOf('youtube')}
        label={t(language, 'talks.youtube')}
        hint={t(language, 'talks.watch')}
        icon={<Play className="h-3.5 w-3.5" />}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.25) }}
      // The node answers its own anchor, so the detail page can send the
      // visitor back to this exact row instead of the top of the shelf.
      // `scroll-mt-24` keeps the date from sliding under the sticky header.
      id={`entry-${entry.slug || entry.id}`}
      className="relative scroll-mt-24 pl-12 md:pl-16"
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

      {videoBoxes.length > 0 || entryGroups.length > 0 ? (
        // Small: 2 columns, sm: 3, xl: 4 - one event's boxes fit on screen.
        // Video links lead (same order as the talks door), then the picture
        // classes the curator filed for this event.
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {videoBoxes}
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
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw"
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
