'use client';

import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { getImageUrl } from '@/lib/image-url';

export interface GalleryImage {
  id: string;
  image_url: string;
  caption?: string | null;
  blur_data?: string | null;
  catalog_id?: string | null;
}

interface GalleryCanvasProps {
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * 🖼️ GALLERY CANVAS - Universal Lightbox Component
 *
 * A reusable, full-featured lightbox for image galleries across the archive.
 *
 * Features:
 * - Smooth zoom with scroll wheel or buttons
 * - Pan when zoomed in
 * - Keyboard navigation (arrows, escape, +/-)
 * - Drag to swipe between images
 * - Double-click to zoom to 2.5x
 * - View original 4K image link
 * - Catalog ID display
 * - Image counter
 * - Backdrop blur for immersive viewing
 */
export function GalleryCanvas({ images, initialIndex, onClose }: GalleryCanvasProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Reset zoom and position when image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-' || e.key === '_') handleZoomOut();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const currentImage = images[currentIndex];
  const imageUrl = currentImage?.image_url ? getImageUrl(currentImage.image_url) : null;

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.5, 1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, [handleZoomIn, handleZoomOut]);

  const handleDoubleClick = useCallback(() => {
    if (zoom === 1) {
      setZoom(2.5);
    } else {
      handleResetZoom();
    }
  }, [zoom, handleResetZoom]);

  const handleDragEnd = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      handlePrevious();
    } else if (info.offset.x < -threshold) {
      handleNext();
    }
  }, [handlePrevious, handleNext]);

  if (!currentImage || !imageUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed inset-0 z-50"
        onClick={onClose}
      >
        {/* 🌌 Pure Black Backdrop with Blur */}
        <div className="absolute inset-0 bg-black backdrop-blur-2xl" />

        {/* Content Container */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image Container with Zoom and Pan */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative w-full h-full flex items-center justify-center"
            drag={zoom > 1}
            dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            onWheel={handleWheel}
            style={{
              cursor: zoom > 1 ? 'grab' : 'default',
            }}
          >
            <motion.div
              className="relative w-full h-full flex items-center justify-center p-8 md:p-16"
              animate={{
                scale: zoom,
                x: position.x,
                y: position.y,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onDoubleClick={handleDoubleClick}
              style={{ cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
            >
              <div className="relative w-full h-full max-w-7xl max-h-[90vh]">
                <Image
                  src={imageUrl}
                  alt={currentImage.caption || `Image ${currentIndex + 1}`}
                  fill
                  className="object-contain"
                  placeholder={currentImage.blur_data ? "blur" : "empty"}
                  blurDataURL={currentImage.blur_data || undefined}
                  sizes="100vw"
                  priority
                  unoptimized={true}
                />
              </div>
            </motion.div>

            {/* 🏷️ Catalog ID - Top Left */}
            {currentImage.catalog_id && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="absolute top-6 left-6 z-10"
              >
                <span className="font-mono text-[10px] text-lmsy-yellow/60 tracking-[0.2em] uppercase bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
                  {currentImage.catalog_id}
                </span>
              </motion.div>
            )}

            {/* 🔗 VIEW ORIGINAL 4K Button - Top Left (below catalog ID) */}
            <motion.a
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-6 left-6 z-10 flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded transition-colors group/btn"
              style={{ marginTop: '24px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-3.5 h-3.5 text-lmsy-yellow/60 group-hover/btn:text-lmsy-yellow transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v4.5m0-4.5L15 15" />
              </svg>
              <span className="font-mono text-[9px] text-lmsy-yellow/80 group-hover/btn:text-lmsy-yellow transition-colors tracking-[0.15em] uppercase">
                VIEW_ORIGINAL_4K
              </span>
            </motion.a>

            {/* 📊 Image Counter - Top Right */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute top-6 right-6 z-10"
            >
              <span className="font-mono text-[10px] text-white/40 tracking-[0.2em]">
                {currentIndex + 1} / {images.length}
              </span>
            </motion.div>

            {/* ✕ Close Button - Top Right (below counter) */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              onClick={onClose}
              className="absolute top-6 right-6 z-20 p-2 text-white/60 hover:text-white transition-colors"
              style={{ marginTop: '24px' }}
            >
              <X className="w-6 h-6" />
            </motion.button>

            {/* ◀▶ Navigation Arrows */}
            {images.length > 1 && (
              <>
                {/* Previous Button */}
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={handlePrevious}
                  className="absolute left-4 md:left-8 z-10 p-3 text-white/40 hover:text-white transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </motion.button>

                {/* Next Button */}
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={handleNext}
                  className="absolute right-4 md:right-8 z-10 p-3 text-white/40 hover:text-white transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </motion.button>
              </>
            )}

            {/* 📝 Caption - Bottom Center */}
            {currentImage.caption && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="absolute bottom-8 left-0 right-0 z-10 text-center px-8"
              >
                <p className="font-serif text-lg text-white/80 drop-shadow-lg">
                  {currentImage.caption}
                </p>
              </motion.div>
            )}

            {/* 🔍+− Zoom Controls - Bottom Right */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="absolute bottom-8 right-8 z-10 flex gap-2"
            >
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="p-2 text-white/40 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 12h-15" />
                </svg>
              </button>
              <span className="p-2 text-white/40 font-mono text-xs">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 5}
                className="p-2 text-white/40 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              {zoom > 1 && (
                <button
                  onClick={handleResetZoom}
                  className="p-2 text-white/40 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              )}
            </motion.div>

            {/* 💡 Hint Text - Bottom Left */}
            {zoom === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute bottom-8 left-8 z-10 text-white/20"
              >
                <p className="font-mono text-[9px] tracking-wider">
                  Scroll to zoom · Drag to pan · Arrows to navigate
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
