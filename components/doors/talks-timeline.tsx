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
import { ArrowLeft, Play, FileText, Images } from 'lucide-react';

/**
 * Level 2 of the talks door: a vertical timeline like the live-events door,
 * but each interview node hangs FOUR resource boxes off the line instead of
 * picture classes:
 *
 *   1. Bilibili  - cover image, click opens the platform in a new tab
 *   2. YouTube   - same, for the mirror upload
 *   3. 图片      - the archived pictures, into the entry's detail page
 *   4. 文字实录  - the transcript (interview_md), into the detail page body
 *
 * A box whose resource does not exist (no link pasted yet, no transcript,
 * no pictures) is simply not rendered - an interview grows boxes as the
 * curator fills them in.
 */
export function TalksTimelinePage({
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
  /** entry id -> its picture bucket (talks keeps one unfiled bucket). */
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
                  <TalkNode
                    key={entry.id}
                    entry={entry}
                    index={index}
                    cover={firstCover(entry, groups)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 px-6 py-24 text-center">
              <p className="font-serif text-xl text-ink">{t(language, 'home.collecting')}</p>
              <p className="mt-3 text-sm text-ink-2">{t(language, 'project.emptyDesc')}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** Thumbnail for the video / transcript boxes: first picture, else cover. */
function firstCover(entry: DoorEntryRow, groups: Map<string, DoorEntryGroup[]>) {
  const bucket = groups.get(entry.id) ?? [];
  return bucket.find((group) => group.cover)?.cover ?? entry.cover_url ?? null;
}

function TalkNode({
  entry,
  index,
  cover,
}: {
  entry: DoorEntryRow;
  index: number;
  cover: string | null;
}) {
  const { language } = useLanguage();
  const title = getLocalizedText(entry.title_i18n, language, entry.title);
  const dateLabel = formatDisplayDate(entry.event_date ?? entry.release_date, language, {
    month: 'long',
    day: true,
  });

  const boxes: React.ReactNode[] = [];
  if (entry.video_url_bilibili) {
    boxes.push(
      <ResourceBox
        key="bilibili"
        href={entry.video_url_bilibili}
        external
        cover={cover}
        label={t(language, 'talks.bilibili')}
        hint={t(language, 'talks.watch')}
        icon={<Play className="h-3.5 w-3.5" />}
      />
    );
  }
  if (entry.video_url_youtube) {
    boxes.push(
      <ResourceBox
        key="youtube"
        href={entry.video_url_youtube}
        external
        cover={cover}
        label={t(language, 'talks.youtube')}
        hint={t(language, 'talks.watch')}
        icon={<Play className="h-3.5 w-3.5" />}
      />
    );
  }
  if (entry.imageCount > 0) {
    boxes.push(
      <ResourceBox
        key="photos"
        href={entry.href}
        cover={cover}
        label={t(language, 'talks.photos')}
        hint={t(language, 'drama.eventImages', { count: entry.imageCount })}
        icon={<Images className="h-3.5 w-3.5" />}
      />
    );
  }
  if (entry.interview_md) {
    boxes.push(
      <ResourceBox
        key="transcript"
        href={`${entry.href}#transcript`}
        cover={cover}
        label={t(language, 'talks.transcript')}
        hint={t(language, 'talks.read')}
        icon={<FileText className="h-3.5 w-3.5" />}
      />
    );
  }

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

      {boxes.length > 0 ? (
        // Small: 2 columns, sm: 3, xl: 4 - mirrors the live-events grid.
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {boxes}
        </div>
      ) : null}
    </motion.div>
  );
}

/**
 * One resource box: portrait, floating label, same shape as the live-events
 * class box so the two timelines read as siblings. External links open in a
 * new tab; everything else routes inside the archive.
 */
function ResourceBox({
  href,
  external,
  cover,
  label,
  hint,
  icon,
}: {
  href: string;
  external?: boolean;
  cover: string | null;
  label: string;
  hint: string;
  icon: React.ReactNode;
}) {
  const coverUrl = cover ? getImageUrl(cover) : null;
  const inner = (
    <>
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={label}
            fill
            unoptimized
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2.5 pt-8">
          <p className="flex items-center gap-1.5 truncate font-serif text-sm font-bold text-white transition-colors group-hover:text-lmsy-yellow">
            {icon}
            {label}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
            {hint}
          </p>
        </div>
      </div>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block w-full overflow-hidden rounded-xl border border-border bg-card/40 transition-colors hover:border-lmsy-yellow/60"
      >
        {inner}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="group relative block w-full overflow-hidden rounded-xl border border-border bg-card/40 transition-colors hover:border-lmsy-blue/50"
    >
      {inner}
    </Link>
  );
}
