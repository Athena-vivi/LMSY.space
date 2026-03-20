'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import Image from 'next/image';
import { X, ZoomIn, Calendar } from 'lucide-react';
import type { TimelineEvent } from '@/lib/timeline';
import { useLanguage } from '@/components/language-provider';
import { getLocalizedText } from '@/lib/localized-content';

interface ChronicleTimelineProps {
  events: TimelineEvent[];
}

interface LightboxImage {
  url: string;
  title: string;
  description?: string;
  type: 'image' | 'video';
}

export function ChronicleTimeline({ events }: ChronicleTimelineProps) {
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { language } = useLanguage();

  const openLightbox = useCallback((event: TimelineEvent) => {
    if (event.imageUrl) {
      setLightboxImage({
        url: event.imageUrl,
        title: getLocalizedText(event.titleI18n, language, event.title),
        description: getLocalizedText(event.descriptionI18n, language, event.description),
        type: event.mediaType || 'image',
      });
    }
  }, [language]);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

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
                  onClick={() => openLightbox(event)}
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
                  onClick={() => openLightbox(event)}
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
        {lightboxImage && (
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
                  className="absolute -top-12 right-0 p-2 text-white/60 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" strokeWidth={1.5} />
                </button>

                {/* Image/Video Container */}
                <div className="relative bg-black rounded-lg overflow-hidden border border-white/10">
                  {lightboxImage.type === 'video' ? (
                    <video
                      src={lightboxImage.url}
                      controls
                      autoPlay
                      className="w-full max-h-[80vh] object-contain"
                    />
                  ) : (
                    <Image
                      src={lightboxImage.url}
                      alt={lightboxImage.title}
                      width={1200}
                      height={800}
                      className="w-full max-h-[80vh] object-contain"
                      unoptimized
                    />
                  )}
                </div>

                {/* Info */}
                <div className="mt-4 text-center">
                  <h3 className="font-serif text-xl text-white/90 mb-2">
                    {lightboxImage.title}
                  </h3>
                  {lightboxImage.description && (
                    <p className="text-sm text-white/60">
                      {lightboxImage.description}
                    </p>
                  )}
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
            <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" strokeWidth={1} />
            <p className="text-white/40 text-sm font-mono">
              NO_EVENTS_RECORDED
            </p>
            <p className="text-white/20 text-xs font-mono mt-2">
              Published items will appear here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface TimelineItemProps {
  event: TimelineEvent;
  language: 'en' | 'zh' | 'th';
  position: 'left' | 'right';
  isHovered: boolean;
  onHover: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
}

function TimelineItem({ event, language, position, isHovered, onHover, onHoverEnd, onClick }: TimelineItemProps) {
  const displayTitle = getLocalizedText(event.titleI18n, language, event.title);
  const displayDescription = getLocalizedText(event.descriptionI18n, language, event.description);

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
          position === 'left'
            ? 'right-0 translate-x-1/2 md:right-auto md:left-auto md:right-0 md:translate-x-1/2'
            : 'left-0 -translate-x-1/2 md:left-auto md:right-auto md:left-0 md:-translate-x-1/2'
        }`}
      />

      <motion.div
        className={`relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 ${
          isHovered
            ? 'shadow-xl border-lmsy-yellow/50 -translate-y-1'
            : 'shadow-lg hover:shadow-xl'
        }`}
        whileHover={{ y: -4 }}
        onClick={onClick}
      >
        {/* Image */}
        {event.imageUrl && (
          <div className="group relative w-full overflow-hidden bg-black/50">
            {event.mediaType === 'video' ? (
              <video
                src={event.imageUrl}
                className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
                muted
              />
            ) : (
              <Image
                src={event.imageUrl}
                alt={displayTitle}
                width={0}
                height={0}
                sizes="100vw"
                className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-105"
                unoptimized
              />
            )}

            {/* Overlay on Hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="rounded-full border border-white/20 bg-black/60 p-3 backdrop-blur-sm">
                <ZoomIn className="h-6 w-6 text-white" strokeWidth={1.5} />
              </div>
            </div>

            {/* Video Indicator */}
            {event.mediaType === 'video' && (
              <div className="absolute top-3 right-3 rounded-full border border-white/20 bg-black/60 p-2 backdrop-blur-sm">
                <div className="h-0 w-0 border-l-8 border-t-5 border-b-5 border-l-white border-t-transparent border-b-transparent" />
              </div>
            )}

            {/* Date Badge */}
            <div className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
              <span className="text-xs font-mono text-white/90">
                {event.eventDate}
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4">
              <div className="mb-2">
                <span className="text-[10px] font-mono tracking-widest uppercase text-lmsy-blue/80">
                  {event.archiveNumber}
                </span>
              </div>

              <h3 className={`mb-1 font-serif text-base font-semibold transition-colors duration-300 ${
                isHovered ? 'text-lmsy-yellow' : 'text-white'
              }`}>
                {displayTitle}
              </h3>

              {displayDescription && (
                <p className="line-clamp-2 text-xs text-white/75">
                  {displayDescription}
                </p>
              )}
            </div>
          </div>
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
    </motion.div>
  );
}
