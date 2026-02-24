'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import Image from 'next/image';
import { X, ZoomIn, Calendar } from 'lucide-react';
import type { TimelineEvent } from '@/lib/timeline';

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

  const openLightbox = useCallback((event: TimelineEvent) => {
    if (event.imageUrl) {
      setLightboxImage({
        url: event.imageUrl,
        title: event.title,
        description: event.description,
        type: event.mediaType || 'image',
      });
    }
  }, []);

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
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          {/* Left Side */}
          <div className="space-y-8 md:pr-8">
            {leftEvents.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                position="left"
                isHovered={hoveredId === event.id}
                onHover={() => setHoveredId(event.id)}
                onHoverEnd={() => setHoveredId(null)}
                onClick={() => openLightbox(event)}
              />
            ))}
          </div>

          {/* Right Side */}
          <div className="space-y-8 md:pl-8 md:mt-16">
            {rightEvents.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                position="right"
                isHovered={hoveredId === event.id}
                onHover={() => setHoveredId(event.id)}
                onHoverEnd={() => setHoveredId(null)}
                onClick={() => openLightbox(event)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Dots on Center Line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-4 -translate-x-1/2 pointer-events-none">
        {events.map((event, index) => {
          return (
            <div
              key={event.id}
              className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${(index / Math.max(events.length - 1, 1)) * 100}%` }}
            >
              <motion.div
                className={`w-4 h-4 rounded-full border-2 bg-background transition-all duration-300 ${
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
  position: 'left' | 'right';
  isHovered: boolean;
  onHover: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
}

function TimelineItem({ event, position, isHovered, onHover, onHoverEnd, onClick }: TimelineItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      className="relative"
    >
      {/* Connector Line to Center */}
      <div
        className={`absolute top-8 bottom-0 w-[2px] bg-gradient-to-b from-lmsy-yellow/30 to-transparent ${
          position === 'left' ? 'right-0 translate-x-1/2 md:right-auto md:left-auto md:right-0 md:translate-x-1/2' : 'left-0 -translate-x-1/2 md:left-auto md:right-auto md:left-0 md:-translate-x-1/2'
        } hidden md:block`}
      />

      {/* Card */}
      <motion.div
        className={`relative bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 cursor-pointer ${
          isHovered
            ? 'shadow-xl border-lmsy-yellow/50 -translate-y-1'
            : 'shadow-lg hover:shadow-xl'
        }`}
        whileHover={{ y: -4 }}
        onClick={onClick}
      >
        {/* Image */}
        {event.imageUrl && (
          <div className="relative w-full bg-black/50 overflow-hidden group">
            {event.mediaType === 'video' ? (
              <video
                src={event.imageUrl}
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                muted
              />
            ) : (
              <Image
                src={event.imageUrl}
                alt={event.title}
                width={0}
                height={0}
                sizes="100vw"
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                unoptimized
              />
            )}

            {/* Overlay on Hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="p-3 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
                <ZoomIn className="h-6 w-6 text-white" strokeWidth={1.5} />
              </div>
            </div>

            {/* Video Indicator */}
            {event.mediaType === 'video' && (
              <div className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
                <div className="w-0 h-0 border-l-8 border-l-white border-t-5 border-t-transparent border-b-5 border-b-transparent" />
              </div>
            )}

            {/* Date Badge */}
            <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
              <span className="text-xs font-mono text-white/90">
                {event.eventDate}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {/* Archive Number */}
          <div className="mb-2">
            <span className="text-[10px] font-mono text-lmsy-blue/80 tracking-widest uppercase">
              {event.archiveNumber}
            </span>
          </div>

          {/* Title */}
          <h3 className={`font-serif text-base font-semibold mb-2 transition-colors duration-300 ${
            isHovered ? 'text-lmsy-yellow' : 'text-foreground'
          }`}>
            {event.title}
          </h3>

          {/* Description */}
          {event.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}
        </div>

        {/* Gradient Overlay on Hover */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-lmsy-yellow/5 via-lmsy-blue/5 to-transparent pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
