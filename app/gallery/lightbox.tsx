'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import Image from 'next/image';
import { useState, useCallback, useEffect } from 'react';
import { type GalleryItem } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';

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
  const isEditorial = currentImage?.is_editorial;

  if (!currentImage) return null;

  // Editorial mode: minimal UI, curator focus
  if (isEditorial) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-full max-w-6xl mx-auto p-8 md:p-16"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Minimal close button - top right */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-10 text-foreground/20 hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-8 w-8" />
            </button>

            <div className="flex flex-col md:flex-row h-full gap-8 md:gap-16">
              {/* Image - Left/Top */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-full">
                  {currentImage.image_url ? (
                    <Image
                      src={currentImage.image_url}
                      alt={currentImage.caption || 'Curatorial feature'}
                      width={800}
                      height={1000}
                      className="w-auto h-auto max-h-[70vh] object-contain"
                      priority
                    />
                  ) : (
                    <div className="w-full h-96 bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20 rounded-lg flex items-center justify-center">
                      <p className="text-foreground/30 text-lg">Image not available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Curator's Note - Right/Bottom */}
              {(currentImage.caption || currentImage.curator_note) && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="flex-1 flex flex-col justify-center"
                >
                  {/* Catalog ID */}
                  {currentImage.catalog_id && (
                    <div className="font-mono text-xs text-muted-foreground/60 tracking-widest mb-6">
                      {currentImage.catalog_id}
                    </div>
                  )}

                  {/* Curator Label */}
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="h-4 w-4 text-lmsy-yellow" />
                    <span className="text-xs uppercase tracking-widest text-muted-foreground/60">
                      Curator's Note
                    </span>
                  </div>

                  {/* Caption */}
                  {currentImage.caption && (
                    <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6 leading-relaxed">
                      {currentImage.caption}
                    </h2>
                  )}

                  {/* Markdown Curator's Note */}
                  {currentImage.curator_note && (
                    <div className="prose prose-lg max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }: any) => (
                            <p className="text-muted-foreground/80 leading-relaxed mb-4" {...props} />
                          ),
                          em: ({ node, ...props }: any) => (
                            <em className="text-lmsy-yellow not-italic" {...props} />
                          ),
                          strong: ({ node, ...props }: any) => (
                            <strong className="text-lmsy-blue font-semibold" {...props} />
                          ),
                          blockquote: ({ node, ...props }: any) => (
                            <blockquote className="border-l-2 border-lmsy-yellow pl-4 italic text-foreground/60 my-4" {...props} />
                          ),
                        }}
                      >
                        {currentImage.curator_note}
                      </ReactMarkdown>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Navigation dots for editorial mode */}
            {images.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-lmsy-yellow scale-125'
                        : 'bg-foreground/20 hover:bg-foreground/40'
                    }`}
                    aria-label={`View ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Standard mode: regular lightbox
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
              {(currentImage.caption || currentImage.tag || currentImage.catalog_id) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                >
                  {currentImage.catalog_id && !isEditorial && (
                    <div className="font-mono text-[10px] text-white/40 mb-2">
                      {currentImage.catalog_id}
                    </div>
                  )}
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
