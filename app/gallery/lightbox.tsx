'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useState, useCallback, useEffect } from 'react';
import { type GalleryItem } from '@/lib/supabase';

interface LightboxProps {
  image: GalleryItem;
  images: GalleryItem[];
  onClose: () => void;
}

export default function Lightbox({ image, images, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Find current image index
  useEffect(() => {
    const index = images.findIndex(img => img.id === image.id);
    setCurrentIndex(index);
  }, [image, images]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
  }, [onClose, goToPrevious, goToNext]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentImage = images[currentIndex];

  if (!currentImage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="relative w-full h-full max-w-7xl mx-auto p-4 md:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full p-2 transition-colors"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {/* Navigation - Previous */}
          {images.length > 1 && (
            <button
              onClick={goToPrevious}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full p-3 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
          )}

          {/* Image Container */}
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="relative w-full h-full max-h-[80vh]">
              {currentImage.image_url ? (
                <Image
                  src={currentImage.image_url}
                  alt={currentImage.caption || currentImage.tag || 'Gallery image'}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20 rounded-lg flex items-center justify-center">
                  <p className="text-white/50 text-lg">Image not available</p>
                </div>
              )}

              {/* Caption Overlay */}
              {(currentImage.caption || currentImage.tag) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                >
                  {currentImage.tag && (
                    <span className="inline-block px-3 py-1 mb-2 text-xs font-medium bg-lmsy-yellow text-black rounded-full">
                      #{currentImage.tag}
                    </span>
                  )}
                  {currentImage.caption && (
                    <p className="text-white font-serif text-xl md:text-2xl">
                      {currentImage.caption}
                    </p>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* Navigation - Next */}
          {images.length > 1 && (
            <button
              onClick={goToNext}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full p-3 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          )}

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-4 py-2 rounded-full">
              <span className="text-white text-sm font-medium">
                {currentIndex + 1} / {images.length}
              </span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
