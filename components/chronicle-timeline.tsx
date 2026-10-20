'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, ZoomIn, Calendar, Film, Images, ArrowRight } from 'lucide-react';
import type { ChronicleEvent, TimelineImageRef } from '@/lib/timeline';
import { formatChronicleDate } from '@/lib/timeline';
import { useLanguage } from '@/components/language-provider';
import { getLocalizedText } from '@/lib/localized-content';
import { getImageUrl } from '@/lib/image-url';
import { getImageDimensions } from '@/lib/image-dimensions';
import { t } from '@/lib/languages';
import { categoryMeta } from '@/lib/category-meta';

interface ChronicleTimelineProps {
  events: ChronicleEvent[];
  activeYear: string | null;
  /** Years that actually contain events - offered from the empty state. */
  availableYears?: string[];
}

interface LightboxState {
  images: TimelineImageRef[];
  projectTitle: string;
  href: string;
  date: string;
}

export function ChronicleTimeline({
  events,
  activeYear,
  availableYears = [],
}: ChronicleTimelineProps) {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { language } = useLanguage();

  const openLightbox = useCallback(
    (event: ChronicleEvent, startIndex: number) => {
      if (event.kind !== 'images' || event.images.length === 0) return;
      setLightbox({
        images: event.images,
        projectTitle: getLocalizedText(event.projectTitleI18n, language, event.projectTitle),
        href: event.href,
        date: event.date,
      });
      setLightboxIndex(startIndex);
    },
    [language]
  );

  const closeLightbox = useCallback(() => setLightbox(null), []);

  const stepLightbox = useCallback(
    (delta: number) => {
      if (!lightbox) return;
      const total = lightbox.images.length;
      if (total === 0) return;
      setLightboxIndex((prev) => (prev + delta + total) % total);
    },
    [lightbox]
  );

  // Keyboard + scroll lock while the group lightbox is open. The gallery
  // lightbox already behaves this way; the chronicle one used to be
  // mouse-only and let the page scroll behind the overlay.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightbox, closeLightbox, stepLightbox]);

  const currentImage = lightbox?.images[lightboxIndex];

  return (
    <div className="relative min-h-[60vh]">
      {/* Center timeline line - desktop only. On narrow screens the list is a
          single column, so a line down the middle of the cards was just noise. */}
      {events.length > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 hidden w-[2px] -translate-x-1/2 bg-gradient-to-b from-lmsy-yellow via-lmsy-blue to-transparent opacity-25 md:block" />
      )}

      <div className="relative mx-auto max-w-6xl">
        {/* One grid in DOM order. Previously events were split into two arrays
            (even indices left, odd right), which stacked as 0,2,4…,1,3,5… on
            mobile - the timeline was not chronological below md. Explicit
            column placement keeps a single chronological order on mobile and
            an alternating two-column reading order on desktop. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10 md:gap-y-8">
          {events.map((event, index) => (
            <div
              key={event.id}
              className={index % 2 === 0 ? 'md:col-start-1' : 'md:col-start-2'}
            >
              <TimelineItem
                event={event}
                language={language}
                isHovered={hoveredId === event.id}
                onHover={() => setHoveredId(event.id)}
                onHoverEnd={() => setHoveredId(null)}
                onOpenImages={(startIndex) => openLightbox(event, startIndex)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && currentImage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
              onClick={closeLightbox}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={closeLightbox}
              role="dialog"
              aria-modal="true"
              aria-label={lightbox.projectTitle}
            >
              <div
                className="relative max-h-[90vh] w-full max-w-5xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={closeLightbox}
                  className="absolute -top-12 right-0 p-2 text-ink-2 transition-colors hover:text-ink"
                  aria-label={t(language, 'common.close')}
                >
                  <X className="h-6 w-6" strokeWidth={1.5} />
                </button>

                <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
                  <Image
                    src={getImageUrl(currentImage.image_url) || currentImage.image_url}
                    alt={
                      getLocalizedText(currentImage.caption_i18n, language, currentImage.caption) ||
                      lightbox.projectTitle
                    }
                    width={1200}
                    height={800}
                    className="max-h-[80vh] w-full object-contain"
                    unoptimized
                  />

                  {lightbox.images.length > 1 && (
                    <>
                      <button
                        onClick={() => stepLightbox(-1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80"
                        aria-label={t(language, 'common.previous')}
                      >
                        ←
                      </button>
                      <button
                        onClick={() => stepLightbox(1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80"
                        aria-label={t(language, 'common.next')}
                      >
                        →
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 font-mono text-xs text-white/80 backdrop-blur-sm">
                        {lightboxIndex + 1} / {lightbox.images.length}
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-4 text-center">
                  <h3 className="mb-1 font-serif text-xl text-ink">{lightbox.projectTitle}</h3>
                  <p className="mb-3 font-mono text-xs text-ink-2">
                    {formatChronicleDate(lightbox.date)}
                  </p>
                  <Link
                    href={lightbox.href}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-5 py-2 text-xs font-medium uppercase tracking-widest text-ink-2 transition-colors hover:border-lmsy-blue hover:text-lmsy-blue"
                  >
                    {t(language, 'chronicle.viewProject')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {events.length === 0 && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="max-w-md text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-ink-2" strokeWidth={1} />
            <p className="font-mono text-sm text-ink-2">
              {activeYear
                ? t(language, 'chronicle.emptyYear').replace('{year}', activeYear)
                : t(language, 'chronicle.emptyAll')}
            </p>
            {activeYear && availableYears.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
                  {t(language, 'chronicle.tryAnotherYear')}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {availableYears.map((year) => (
                    <Link
                      key={year}
                      href={`/timeline?year=${year}`}
                      className="rounded-full border border-border bg-muted px-4 py-1.5 text-xs text-ink-2 transition-colors hover:border-lmsy-blue hover:text-lmsy-blue"
                    >
                      {year}
                    </Link>
                  ))}
                  <Link
                    href="/timeline"
                    className="rounded-full border border-transparent bg-gradient-to-r from-lmsy-yellow to-lmsy-blue px-4 py-1.5 text-xs font-medium text-black"
                  >
                    {t(language, 'chronicle.clearYear')}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TimelineItemProps {
  event: ChronicleEvent;
  language: 'en' | 'zh' | 'th';
  isHovered: boolean;
  onHover: () => void;
  onHoverEnd: () => void;
  onOpenImages: (startIndex: number) => void;
}

/** Max thumbnails rendered on an image-group card before the "+N" tile. */
const GROUP_THUMBNAILS = 4;

function TimelineItem({ event, language, isHovered, onHover, onHoverEnd, onOpenImages }: TimelineItemProps) {
  const dateLabel = formatChronicleDate(event.date);
  const categoryLabel =
    event.kind === 'project'
      ? t(language, categoryMeta(event.category).labelKey)
      : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      className="relative w-full"
    >
      {event.kind === 'project' ? (
        /* ---------- Project event: links to its canonical detail page ---------- */
        <Link
          href={event.href}
          className={`block overflow-hidden rounded-lg border bg-card p-4 transition-all duration-300 ${
            isHovered
              ? '-translate-y-0.5 border-lmsy-blue/50 shadow-xl'
              : 'border-border shadow-lg hover:shadow-xl'
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lmsy-blue/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-lmsy-blue">
              <Film className="h-3 w-3" />
              {t(language, 'chronicle.eventProject')}
            </span>
            <time dateTime={event.date} className="font-mono text-xs text-ink-2">
              {dateLabel}
            </time>
          </div>
          <h3
            className={`font-serif text-base font-semibold transition-colors duration-300 ${
              isHovered ? 'text-lmsy-blue' : 'text-foreground'
            }`}
          >
            {getLocalizedText(event.titleI18n, language, event.title)}
          </h3>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
            {categoryLabel}
          </p>
        </Link>
      ) : (
        /* ---------- Image-group event: opens the group lightbox ---------- */
        <div
          className={`cursor-pointer overflow-hidden rounded-lg border bg-card transition-all duration-300 ${
            isHovered
              ? '-translate-y-0.5 border-lmsy-yellow/50 shadow-xl'
              : 'border-border shadow-lg hover:shadow-xl'
          }`}
          onClick={() => onOpenImages(0)}
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-4 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lmsy-yellow/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-lmsy-yellow">
              <Images className="h-3 w-3" />
              {t(language, 'chronicle.eventImages')}
            </span>
            <time dateTime={event.date} className="font-mono text-xs text-ink-2">
              {dateLabel}
            </time>
          </div>

          {/* Thumbnail set: up to 4 square tiles, then a "+N" tile. A fixed
              square crop keeps groups of 1 and 38 images equally scannable. */}
          <div className="grid grid-cols-2 gap-1.5 p-4 pt-3">
            {event.images.slice(0, GROUP_THUMBNAILS).map((img, i) => {
              const dimensions = getImageDimensions(img.image_url);
              const captionText = getLocalizedText(img.caption_i18n, language, img.caption);
              return (
                <div
                  key={img.id}
                  className="group/thumb relative aspect-square overflow-hidden rounded-md bg-black/40"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenImages(i);
                  }}
                >
                  <Image
                    src={getImageUrl(img.image_url) || img.image_url}
                    alt={captionText || event.projectTitle}
                    width={dimensions?.width ?? 600}
                    height={dimensions?.height ?? 600}
                    sizes="(max-width: 768px) 45vw, 220px"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover/thumb:opacity-100">
                    <ZoomIn className="h-5 w-5 text-white" strokeWidth={1.5} />
                  </div>
                </div>
              );
            })}
            {event.images.length > GROUP_THUMBNAILS && (
              <div className="flex aspect-square items-center justify-center rounded-md bg-muted font-mono text-sm text-ink-2">
                +{event.images.length - GROUP_THUMBNAILS}
              </div>
            )}
          </div>

          <div className="px-4 pb-4">
            <h3
              className={`font-serif text-base font-semibold transition-colors duration-300 ${
                isHovered ? 'text-lmsy-yellow' : 'text-foreground'
              }`}
            >
              {getLocalizedText(event.projectTitleI18n, language, event.projectTitle)}
            </h3>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
              {event.images.length}{' '}
              {event.images.length === 1
                ? t(language, 'common.imagesOne')
                : t(language, 'common.imagesMany')}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
