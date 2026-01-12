'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { BackButton } from '@/components/back-button';
import { GalleryImageWithLightbox } from './gallery-image';
import { getImageUrl } from '@/lib/image-url';
import { ArchiveCreditCompact } from '@/components/archive-credit';

interface Magazine {
  id: string;
  title: string;
  category: string;
  cover_url: string | null;
  release_date: string | null;
  description: string | null;
  catalog_id: string | null;
  blur_data: string | null;
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  blur_data: string | null;
  catalog_id: string | null;
}

interface EditorialDetailContentProps {
  magazine: Magazine;
  galleryImages: GalleryImage[];
  selfHealed: boolean;
}

export function EditorialDetailContent({
  magazine,
  galleryImages,
  selfHealed,
}: EditorialDetailContentProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const totalArtifacts = galleryImages.length + 1; // +1 for cover

  return (
    <div className="min-h-screen bg-black">
      {/* Self-Healing Notification */}
      {selfHealed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-lmsy-yellow/10 border-b border-lmsy-yellow/30 py-3 px-6"
        >
          <div className="max-w-7xl mx-auto text-center">
            <p className="font-mono text-xs text-lmsy-yellow/80 tracking-wider">
              🤖 AUTO-SALVAGE: {galleryImages.length} orphaned image(s) recovered from archive
            </p>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <header className="relative z-10 px-6 py-8 md:px-12 md:py-12 border-b border-white/5">
        <div className="flex items-start justify-between max-w-7xl mx-auto">
          <BackButton />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-right"
          >
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2 text-white/90">
              {magazine.title}
            </h1>
            <p className="font-mono text-xs text-white/40 tracking-[0.3em]">
              {magazine.catalog_id || 'LMSY-ED'}
            </p>
          </motion.div>
        </div>
      </header>

      {/* Magazine Header Section */}
      <section className="relative px-6 py-16 md:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Date and Artifact Count */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <p className="font-mono text-4xl md:text-6xl font-bold text-white/90 mb-2">
                {formatDate(magazine.release_date)}
              </p>
              <p className="font-mono text-xs text-white/40 tracking-[0.2em] uppercase">
                Release Date
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl md:text-5xl font-bold text-lmsy-yellow/80">
                {totalArtifacts}
              </p>
              <p className="font-mono text-xs text-white/40 tracking-[0.2em] uppercase">
                Artifacts Preserved
              </p>
            </div>
          </motion.div>

          {/* 🔒 ARCHIVE CREDIT - Dynamic Gratitude based on category */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8"
          >
            <ArchiveCreditCompact category={magazine.category} />
          </motion.div>

          {/* Curator's Note */}
          {magazine.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-12"
            >
              <p className="font-mono text-[10px] text-lmsy-yellow/60 tracking-[0.2em] uppercase mb-3">
                Curator's Note
              </p>
              <p className="font-serif text-lg md:text-xl text-white/70 leading-relaxed">
                {magazine.description}
              </p>
            </motion.div>
          )}

          {/* Magazine Cover - Ratio Sovereignty Layout */}
          {magazine.cover_url && (() => {
            const coverUrl = getImageUrl(magazine.cover_url);
            console.log('[PATH_SYNC] Detail Cover:', {
              title: magazine.title,
              finalSrc: coverUrl,
              inputUrl: magazine.cover_url,
            });
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="mb-16"
              >
                {/* 🔒 RATIO SOVEREIGNTY: No aspect-ratio, no fill mode */}
                <div className="w-full max-w-5xl mx-auto">
                  <Image
                    src={coverUrl || ''}
                    alt={magazine.title}
                    width={1200}
                    height={1600}
                    className="w-full h-auto rounded-xl"
                    placeholder="empty"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 1200px"
                    priority
                    unoptimized
                  />
                </div>
              </motion.div>
            );
          })()}
        </div>
      </section>

      {/* Empty Vault Message */}
      {galleryImages.length === 0 && (
        <section className="relative px-6 pb-20 md:px-12">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="font-mono text-lg text-lmsy-yellow/60 tracking-[0.2em] mb-4">
                [ ARCHIVE_EMPTY: WAITING_FOR_CURATION ]
              </p>
              <p className="font-serif text-white/40">
                This magazine&lsquo;s pages have not yet been digitized.<br />
                Check back soon for updates.
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* Gallery Section - Masonry Layout */}
      {galleryImages.length > 0 && (
        <section className="relative px-6 pb-20 md:px-12">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mb-8"
            >
              <h2 className="font-serif text-2xl md:text-3xl text-white/80 mb-2">
                Inside This Issue
              </h2>
              <p className="font-mono text-xs text-white/40 tracking-[0.2em] uppercase">
                {galleryImages.length} Pages Preserved
              </p>
            </motion.div>

            {/* 🖼️ GALLERY-GRADE MASONRY - Natural Aspect Ratios */}
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 md:gap-6">
              {galleryImages.map((image, index) => (
                <GalleryImageWithLightbox
                  key={image.id}
                  image={image}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-mono text-[10px] text-white/20 tracking-[0.3em] uppercase">
            LMSY.SPACE · MAGAZINE_ARCHIVE · {magazine.catalog_id || 'LMSY-ED'} · {totalArtifacts} ARTIFACTS
          </p>
        </div>
      </footer>
    </div>
  );
}
