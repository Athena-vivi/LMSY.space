'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import EditorialLightbox from '@/components/lightbox/editorial-lightbox';
import { useState } from 'react';
import { getImageUrl } from '@/lib/image-url';

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  blur_data: string | null;
  catalog_id: string | null;
}

interface GalleryImageWithLightboxProps {
  image: GalleryImage;
  index: number;
}

/**
 * Client component for gallery images with click-to-lightbox functionality
 * This component MUST be a client component because it uses useState
 */
export function GalleryImageWithLightbox({
  image,
  index,
}: GalleryImageWithLightboxProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // 🔒 CRITICAL: Use getImageUrl for full compatibility
  const imageUrl = getImageUrl(image.image_url);

  console.log('[PATH_SYNC] Gallery Image:', {
    catalogId: image.catalog_id,
    finalSrc: imageUrl,
    inputUrl: image.image_url,
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 + index * 0.08 }}
        className="mb-4 md:mb-6 break-inside-avoid relative group cursor-pointer"
        onClick={() => setLightboxIndex(index)}
      >
        <div className="relative overflow-hidden rounded-xl bg-white/[0.02] border border-white/10">
          {/* 🎨 Image with NATURAL aspect ratio - NO FIXED HEIGHT */}
          <Image
            src={imageUrl || ''}
            alt={image.caption || `Page ${index + 1}`}
            width={0}
            height={0}
            sizes="100vw"
            className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
            placeholder="empty"
            priority={index < 3}
            unoptimized
          />

          {/* 🌌 Nebula Hover Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* 📖 Catalog ID - Always visible at bottom right */}
          {image.catalog_id && (
            <div className="absolute bottom-3 right-3 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
              <span className="font-mono text-[10px] text-lmsy-yellow/80 bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
                {image.catalog_id}
              </span>
            </div>
          )}

          {/* 🔍 Click indicator */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-black/50 backdrop-blur-sm rounded-full p-2">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607zM10.5 7.5v6m3-3h-6" />
              </svg>
            </div>
          </div>

          {/* 📝 Caption - Slide up on hover */}
          {image.caption && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={{ y: 10 }}
              whileHover={{ y: 0 }}
            >
              <p className="font-serif text-sm text-white/90 line-clamp-2">
                {image.caption}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <EditorialLightbox
            images={[image]}
            initialIndex={0}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
