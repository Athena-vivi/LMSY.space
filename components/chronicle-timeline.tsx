'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
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

interface ChronicleTimelineProps {
  events: ChronicleEvent[];
  activeYear: string | null;
}

interface LightboxState {
  images: TimelineImageRef[];
  startIndex: number;
  projectId: string;
  projectTitle: string;
  href: string;
  date: string;
}

export function ChronicleTimeline({ events, activeYear }: ChronicleTimelineProps) {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { language } = useLanguage();

  const openLightbox = useCallback((event: ChronicleEvent, startIndex: number) => {
    if (event.kind !== 'images' || event.images.length === 0) return;
    setLightbox({
      images: event.images,
      startIndex,
      projectId: event.projectId,
      projectTitle: getLocalizedText(event.projectTitleI18n, language, event.projectTitle),
      href: event.href,
      date: event.date,
    });
    setLightboxIndex(startIndex);
  }, [language]);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  const stepLightbox = useCallback((delta: number) => {
    setLightbox((prev) => {
      if (!prev) return prev;
      const next = (lightboxIndex + delta + prev.images.length) % prev.images.length;
      setLightboxIndex(next);
      return prev;
    });
  }, [lightboxIndex]);

  // Split events into left and right sides
  const leftEvents = events.filter((_, index) => index % 2 === 0);
  const rightEvents = events.filter((_, index) => index % 2 === 1);

  return (
    <div className="relative min-h-screen">
      {/* Center Timeline Line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-lmsy-yellow via-lmsy-blue to-lmsy-yellow opacity-30 -translate-x-1/2" />

      {/* Timeline Container */}
      <div className="relative mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-8 xl:gap-10">
          {/* Left Side */}
          <div className="md:pr-3 xl:pr-4">
            <div className="grid grid-cols-1 gap-6 xl:justify-items-end">
            {leftEvents.map((event) => (
              <div key={event.id} className="w-full xl:flex xl:justify-end">
                <TimelineItem
                  event={event}
                  language={language}
                  position="left"
                  isHovered={hoveredId === event.id}
                  onHover={() => setHoveredId(event.id)}
                  onHoverEnd={() => setHoveredId(null)}
                  onOpenImages={(startIndex) => openLightbox(event, startIndex)}
                />
              </div>
            ))}
            </div>
          </div>

          {/* Right Side */}
          <div className="md:mt-16 md:pl-3 xl:pl-4">
            <div className="grid grid-cols-1 gap-6 xl:justify-items-start">
            {rightEvents.map((event) => (
              <div key={event.id} className="w-full xl:flex xl:justify-start">
                <TimelineItem
                  event={event}
                  language={language}
                  position="right"
                  isHovered={hoveredId === event.id}
                  onHover={() => setHoveredId(event.id)}
                  onHoverEnd={() => setHoveredId(null)}
                  onOpenImages={(startIndex) => openLightbox(event, startIndex)}
                />
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Dots on Center Line */}
      <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-4 -translate-x-1/2">
        {events.map((event, index) => {
          return (
            <div
              key={event.id}
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${(index / Math.max(events.length - 1, 1)) * 100}%` }}
            >
              <motion.div
                className={`h-4 w-4 rounded-full border-2 bg-background transition-all duration-300 ${
                  hoveredId === event.id
                    ? 'border-lmsy-yellow scale-125'
                    : 'border-border'
                }`}
                animate={hoveredId === event.id ? { scale: 1.25 } : { scale: 1 }}
              />
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && lightbox.images[lightboxIndex] && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
              onClick={closeLightbox}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={closeLightbox}
            >
              <div
                className="relative max-w-5xl max-h-[90vh] w-full"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={closeLightbox}
                  className="absolute -top-12 right-0 p-2 text-ink-2 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" strokeWidth={1.5} />
                </button>

                {/* Image Container */}
                <div className="relative bg-black rounded-lg overflow-hidden border border-white/10">
                  <Image
                    src={getImageUrl(lightbox.images[lightboxIndex].image_url) || lightbox.images[lightboxIndex].image_url}
                    alt={getLocalizedText(lightbox.images[lightboxIndex].caption_i18n, language, lightbox.images[lightboxIndex].caption) || lightbox.projectTitle}
                    width={1200}
                    height={800}
                    className="w-full max-h-[80vh] object-contain"
                    unoptimized
                  />

                  {/* Prev / Next */}
                  {lightbox.images.length > 1 && (
                    <>
                      <button
                        onClick={() => stepLightbox(-1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80"
                        aria-label="Previous image"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => stepLightbox(1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white backdrop-blur-sm transition hover:bg-black/80"
                        aria-label="Next image"
                      >
                        →
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-mono text-white/80 backdrop-blur-sm">
                        {lightboxIndex + 1} / {lightbox.images.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Info + project link */}
                <div className="mt-4 text-center">
                  <h3 className="font-serif text-xl text-ink mb-1">
                    {lightbox.projectTitle}
                  </h3>
                  <p className="text-xs font-mono text-ink-2 mb-3">
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
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-ink-2 mx-auto mb-4" strokeWidth={1} />
            <p className="text-ink-2 text-sm font-mono">
              {activeYear
                ? t(language, 'chronicle.emptyYear').replace('{year}', activeYear)
                : t(language, 'chronicle.emptyAll')}
            </p>
            {activeYear && (
              <Link
                href="/chronicle"
                className="mt-4 inline-block rounded-full border border-border bg-muted px-5 py-2 text-xs uppercase tracking-widest text-ink-2 transition-colors hover:border-lmsy-blue hover:text-lmsy-blue"
              >
                {t(language, 'chronicle.clearYear')}
              </Link>
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
  position: 'left' | 'right';
  isHovered: boolean;
  onHover: () => void;
  onHoverEnd: () => void;
  onOpenImages: (startIndex: number) => void;
}

/** Max thumbnails rendered on an image-group card before the "+N" tile. */
const GROUP_THUMBNAILS = 4;

function TimelineItem({ event, language, isHovered, onHover, onHoverEnd, onOpenImages }: TimelineItemProps) {
  const dateLabel = formatChronicleDate(event.date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      className="relative w-full md:w-[340px] xl:w-[260px] 2xl:w-[280px]"
    >
      {/* Connector Line to Center */}
      <div
        className={`absolute top-8 bottom-0 hidden w-[2px] bg-gradient-to-b from-lmsy-yellow/30 to-transparent md:block ${
          event.kind === 'project' ? 'md:left-auto md:right-0 md:translate-x-1/2' : 'md:left-0 md:-translate-x-1/2'
        }`}
      />

      {event.kind === 'project' ? (
        /* ---------- Project event: links to its canonical detail page ---------- */
        <Link
          href={event.href}
          className={`relative block overflow-hidden rounded-lg border border-border bg-card p-4 transition-all duration-300 ${
            isHovered ? 'shadow-xl border-lmsy-blue/50 -translate-y-1' : 'shadow-lg hover:shadow-xl'
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lmsy-blue/10 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-lmsy-blue">
              <Film className="h-3 w-3" />
              {t(language, 'chronicle.eventProject')}
            </span>
            <span className="text-xs font-mono text-ink-2">{dateLabel}</span>
          </div>
          <h3 className={`font-serif text-base font-semibold transition-colors duration-300 ${
            isHovered ? 'text-lmsy-blue' : 'text-foreground'
          }`}>
            {getLocalizedText(event.titleI18n, language, event.title)}
          </h3>
          <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-2">
            {event.category}
          </p>
        </Link>
      ) : (
        /* ---------- Image-group event: opens the group lightbox ---------- */
        <motion.div
          className={`relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 ${
            isHovered ? 'shadow-xl border-lmsy-yellow/50 -translate-y-1' : 'shadow-lg hover:shadow-xl'
          }`}
          whileHover={{ y: -4 }}
          onClick={() => onOpenImages(0)}
        >
          <div className="mb-3 flex items-center justify-between px-4 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lmsy-yellow/10 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-lmsy-yellow">
              <Images className="h-3 w-3" />
              {t(language, 'chronicle.eventImages')}
            </span>
            <span className="text-xs font-mono text-ink-2">{dateLabel}</span>
          </div>

          {/* Thumbnail set: up to 4 tiles, then a "+N" tile */}
          <div className="grid grid-cols-2 gap-1.5 p-4 pt-3">
            {event.images.slice(0, GROUP_THUMBNAILS).map((img, i) => {
              const dimensions = getImageDimensions(img.image_url);
              const captionText = getLocalizedText(img.caption_i18n, language, img.caption);
              return (
                <div
                  key={img.id}
                  className="group/thumb relative aspect-square overflow-hidden rounded-md bg-black/40"
                  onClick={(e) => {
                    // Direct click on a thumbnail opens the lightbox at it.
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
            <h3 className={`font-serif text-base font-semibold transition-colors duration-300 ${
              isHovered ? 'text-lmsy-yellow' : 'text-foreground'
            }`}>
              {getLocalizedText(event.projectTitleI18n, language, event.projectTitle)}
            </h3>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-2">
              {event.images.length} {event.images.length === 1 ? t(language, 'chronicle.imageOne') : t(language, 'chronicle.imageMany')}
            </p>
          </div>
        </motion.div>
      )}

      {isHovered && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-lmsy-yellow/5 via-lmsy-blue/5 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
}
