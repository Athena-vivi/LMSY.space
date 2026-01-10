'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  displayName: string;
}

interface ImageLightboxProps {
  lightboxIndex: number | null;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  uploadItems: UploadItem[];
  getPreviewCatalogId: (index: number) => string;
}

export default function ImageLightbox({
  lightboxIndex,
  onClose,
  onNavigate,
  uploadItems,
  getPreviewCatalogId
}: ImageLightboxProps) {
  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && lightboxIndex > 0) {
        onNavigate('prev');
      } else if (e.key === 'ArrowRight' && lightboxIndex < uploadItems.length - 1) {
        onNavigate('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, uploadItems.length, onClose, onNavigate]);

  // Mouse wheel navigation
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0 && lightboxIndex < uploadItems.length - 1) {
        onNavigate('next');
      } else if (e.deltaY < 0 && lightboxIndex > 0) {
        onNavigate('prev');
      }
    };

    const timeoutId = setTimeout(() => {
      window.addEventListener('wheel', handleWheel, { passive: false });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [lightboxIndex, uploadItems.length, onNavigate]);

  if (lightboxIndex === null) return null;

  return (
    <AnimatePresence>
      {lightboxIndex !== null && (
        <>
          {/* Backdrop with backdrop-blur-2xl */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl"
          />

          {/* Lightbox Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <X className="h-6 w-6 text-white/60" strokeWidth={1.5} />
            </button>

            {/* Navigation arrows */}
            {lightboxIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('prev');
                }}
                className="absolute left-4 z-50 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <svg className="h-6 w-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {lightboxIndex < uploadItems.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('next');
                }}
                className="absolute right-4 z-50 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <svg className="h-6 w-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Main image */}
            <div className="relative max-w-5xl max-h-[85vh] w-full">
              <Image
                src={uploadItems[lightboxIndex].preview}
                alt={uploadItems[lightboxIndex].displayName}
                width={1920}
                height={1080}
                className="object-contain w-full h-full rounded-lg"
                sizes="100vw"
                priority
              />

              {/* Image info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent rounded-b-lg">
                <div className="text-white/90 text-sm font-mono mb-1">
                  {String(lightboxIndex + 1).padStart(3, '0')} / {String(uploadItems.length).padStart(3, '0')}
                </div>
                <div className="text-lmsy-yellow/80 text-xs font-mono">
                  {getPreviewCatalogId(lightboxIndex)}
                </div>
                <div className="text-white/60 text-xs mt-1 truncate">
                  {uploadItems[lightboxIndex].displayName}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
