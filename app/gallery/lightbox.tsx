'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, BookOpen, ExternalLink, Images } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';
import { type GalleryItem } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { getLocalizedText } from '@/lib/localized-content';
import { getImageUrl } from '@/lib/image-url';
import { assetTagLabelKey } from '@/lib/category-meta';

interface LightboxProps {
  image: GalleryItem;
  images: GalleryItem[];
  // Public title/id of the project this asset belongs to. Null/undefined when
  // the project is missing or not publicly readable - the entry is simply
  // hidden, the lightbox keeps working (fail-safe per phase-4 Task 2).
  project?: { id: string; title: string } | null;
  onClose: () => void;
}

export default function Lightbox({ image, images, project, onClose }: LightboxProps) {
  const { language } = useLanguage();
  // Start on the image that was clicked. The parent remounts this component
  // per asset (key={image.id}), so no state-syncing effect is needed - the
  // previous useEffect + setState pair triggered a cascading render on every
  // open and could briefly paint the wrong frame.
  const [currentIndex, setCurrentIndex] = useState(() => {
    const index = images.findIndex((img) => img.id === image.id);
    return index >= 0 ? index : 0;
  });

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

  // Lock background scrolling while the lightbox is open (the grid behind it
  // otherwise keeps scrolling on wheel/touch, which reads as a broken modal).
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const currentImage = images[currentIndex];
  const isEditorial = currentImage?.is_editorial;
  const localizedCaption = currentImage
    ? getLocalizedText(currentImage.caption_i18n, language, currentImage.caption)
    : '';
  // Project back-link (phase-4 Task 2): /projects/<id>, shown in both modes.
  const projectLink = project ? `/projects/${project.id}` : null;

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
              className="absolute top-6 right-6 z-10 text-ink-2 hover:text-ink transition-colors"
              aria-label={t(language, 'common.close')}
            >
              <X className="h-8 w-8" />
            </button>

            <div className="flex flex-col md:flex-row h-full gap-8 md:gap-16">
              {/* Image - Left/Top */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-full">
                  {currentImage.image_url ? (
                    <Image
                      src={getImageUrl(currentImage.image_url) || ''}
                      alt={localizedCaption || 'Curatorial feature'}
                      width={800}
                      height={1000}
                      className="w-auto h-auto max-h-[70vh] object-contain"
                      priority
                    />
                  ) : (
                    <div className="w-full h-96 bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20 rounded-lg flex items-center justify-center">
                      <p className="text-ink-2 text-lg">{t(language, 'common.noImage')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Curator's Note - Right/Bottom */}
              {(localizedCaption || currentImage.curator_note || currentImage.source_url) && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="flex-1 flex flex-col justify-center"
                >
                  {/* Catalog ID */}
                  {currentImage.catalog_id && (
                    <div className="font-mono text-xs text-ink-2 tracking-widest mb-6">
                      {currentImage.catalog_id}
                    </div>
                  )}

                  {/* Source link - only rendered when provenance exists; legacy
                      images with unknown origin show nothing (no empty stub). */}
                  {currentImage.source_url && (
                    <a
                      href={currentImage.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mb-6 text-xs uppercase tracking-widest text-ink-2 hover:text-lmsy-yellow transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>
                        {t(language, 'common.source')}
                        {currentImage.source_platform ? ` · ${currentImage.source_platform}` : ''}
                      </span>
                    </a>
                  )}

                  {/* Project back-link - hidden when the project is not
                      publicly readable (fail-safe). */}
                  {projectLink && (
                    <Link
                      href={projectLink}
                      className="inline-flex items-center gap-2 mb-6 text-xs uppercase tracking-widest text-ink-2 hover:text-lmsy-blue transition-colors"
                    >
                      <Images className="h-3 w-3" />
                      <span>{t(language, 'gallery.viewAllProjectImages')}</span>
                    </Link>
                  )}

                  {/* Curator Label */}
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="h-4 w-4 text-lmsy-yellow" />
                    <span className="text-xs uppercase tracking-widest text-ink-2">
                      {t(language, 'common.curatorNote')}
                    </span>
                  </div>

                  {/* Caption */}
                  {localizedCaption && (
                    <h2 className="font-serif text-2xl md:text-3xl text-ink mb-6 leading-relaxed">
                      {localizedCaption}
                    </h2>
                  )}

                  {/* Markdown Curator's Note */}
                  {currentImage.curator_note && (
                    <div className="prose prose-lg max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }: any) => (
                            <p className="text-ink-2 leading-relaxed mb-4" {...props} />
                          ),
                          em: ({ node, ...props }: any) => (
                            <em className="text-lmsy-yellow not-italic" {...props} />
                          ),
                          strong: ({ node, ...props }: any) => (
                            <strong className="text-lmsy-blue font-semibold" {...props} />
                          ),
                          blockquote: ({ node, ...props }: any) => (
                            <blockquote className="border-l-2 border-lmsy-yellow pl-4 italic text-ink-2 my-4" {...props} />
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
                    aria-label={`${index + 1} / ${images.length}`}
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
            aria-label={t(language, 'common.close')}
          >
            <X className="h-6 w-6 text-ink" />
          </button>

          {/* Navigation - Previous */}
          {images.length > 1 && (
            <button
              onClick={goToPrevious}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full p-3 transition-colors"
              aria-label={t(language, 'common.previous')}
            >
              <ChevronLeft className="h-6 w-6 text-ink" />
            </button>
          )}

          {/* Image Container */}
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="relative w-full h-full max-h-[80vh]">
              {currentImage.image_url ? (
                <Image
                  src={getImageUrl(currentImage.image_url) || ''}
                  alt={localizedCaption || currentImage.tag || 'Gallery image'}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20 rounded-lg flex items-center justify-center">
                  <p className="text-ink text-lg">{t(language, 'common.noImage')}</p>
                </div>
              )}

              {/* Caption Overlay */}
              {(localizedCaption || currentImage.tag || currentImage.catalog_id || currentImage.source_url) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
                >
                  {/* Caption first (content), then one compact meta row. The
                      previous stack of four full-width lines pushed the image
                      up and read as a list of labels. */}
                  {localizedCaption && (
                    <p className="mb-3 font-serif text-xl text-ink md:text-2xl">
                      {localizedCaption}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-ink-2">
                    {currentImage.catalog_id && (
                      <span className="font-mono text-ink-2">{currentImage.catalog_id}</span>
                    )}
                    {currentImage.tag && (
                      <span className="rounded-full bg-lmsy-yellow px-3 py-1 font-medium tracking-normal text-black">
                        #{assetTagLabelKey(currentImage.tag) ? t(language, assetTagLabelKey(currentImage.tag)!) : currentImage.tag}
                      </span>
                    )}
                    {projectLink && (
                      <Link
                        href={projectLink}
                        className="inline-flex items-center gap-2 text-ink transition-colors hover:text-lmsy-blue"
                      >
                        <Images className="h-3 w-3" />
                        <span>{t(language, 'gallery.viewProject')}</span>
                      </Link>
                    )}
                    {currentImage.source_url && (
                      <a
                        href={currentImage.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 transition-colors hover:text-lmsy-yellow"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>
                          {t(language, 'common.source')}
                          {currentImage.source_platform ? ` · ${currentImage.source_platform}` : ''}
                        </span>
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Navigation - Next */}
          {images.length > 1 && (
            <button
              onClick={goToNext}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full p-3 transition-colors"
              aria-label={t(language, 'common.next')}
            >
              <ChevronRight className="h-6 w-6 text-ink" />
            </button>
          )}

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-4 py-2 rounded-full">
              <span className="text-ink text-sm font-medium">
                {currentIndex + 1} / {images.length}
              </span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
