'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GalleryImageWithLightbox } from './gallery-image';
import { getImageUrl } from '@/lib/image-url';
import { ArchiveCreditCompact } from '@/components/archive-credit';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { formatDisplayDate } from '@/lib/display-date';
import { countIssueArtifacts } from '@/lib/editorial-meta';
import { getLocalizedText, type LocalizedText } from '@/lib/localized-content';

interface Magazine {
  id: string;
  title: string;
  title_i18n?: LocalizedText | null;
  category: string;
  cover_url: string | null;
  release_date: string | null;
  description: string | null;
  description_i18n?: LocalizedText | null;
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
}

export function EditorialDetailContent({
  magazine,
  galleryImages,
}: EditorialDetailContentProps) {
  const { language } = useLanguage();
  const localizedTitle = getLocalizedText(magazine.title_i18n, language, magazine.title);
  const localizedDescription = getLocalizedText(
    magazine.description_i18n,
    language,
    magazine.description
  );

  // Locale-aware date (was hard-coded to en-US, so zh/th readers saw English
  // dates). Missing dates say "to be confirmed" rather than a bare 'TBD'.
  const dateLabel =
    formatDisplayDate(magazine.release_date, language) ?? t(language, 'editorial.dateTbd');

  // Distinct artifacts. The cover counts once: 7 of the 11 public editorial
  // works store a cover_url that is already one of their gallery pages.
  const totalArtifacts = countIssueArtifacts(galleryImages, magazine.cover_url);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative z-10 px-6 py-8 md:px-12 md:py-12 border-b border-border">
        <div className="flex items-start justify-between gap-6 max-w-7xl mx-auto">
          {/* Back to the rack. Sits opposite the title, which stays on the right. */}
          <Link
            href="/editorial"
            className="mt-1 inline-flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2 transition-colors hover:text-lmsy-blue"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t(language, 'nf.back')}
          </Link>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-right"
          >
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2 text-ink">
              {localizedTitle}
            </h1>
            {magazine.catalog_id && (
              <p className="font-mono text-xs text-ink-2 tracking-[0.3em]">
                {/* ADR-001 D5: real persistent catalog_id only - no generated stand-in */}
                {magazine.catalog_id}
              </p>
            )}
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
              <p className="font-mono text-4xl md:text-6xl font-bold text-ink mb-2">
                {dateLabel}
              </p>
              <p className="font-mono text-xs text-ink-2 tracking-[0.2em] uppercase">
                {t(language, 'editorial.releaseDate')}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl md:text-5xl font-bold text-lmsy-yellow/80">
                {totalArtifacts}
              </p>
              <p className="font-mono text-xs text-ink-2 tracking-[0.2em] uppercase">
                {t(language, 'editorial.artifacts')}
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
          {localizedDescription && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-12"
            >
              <p className="font-mono text-[10px] text-lmsy-yellow/60 tracking-[0.2em] uppercase mb-3">
                {t(language, 'editorial.curatorNote')}
              </p>
              <p className="font-serif text-lg md:text-xl text-ink-2 leading-relaxed">
                {localizedDescription}
              </p>
            </motion.div>
          )}

          {/* Magazine Cover - Ratio Sovereignty Layout */}
          {magazine.cover_url && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mb-16"
            >
              {/* 🔒 RATIO SOVEREIGNTY: No aspect-ratio, no fill mode */}
              <div className="w-full max-w-5xl mx-auto">
                <Image
                  src={getImageUrl(magazine.cover_url) || ''}
                  alt={localizedTitle}
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
          )}
        </div>
      </section>

      {/* Empty Vault Message */}
      {galleryImages.length === 0 && (
        <section className="relative px-6 pb-20 md:px-12">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto max-w-xl border-t border-border pt-16 text-center"
            >
              <p className="mb-3 font-serif text-xl text-ink">
                {t(language, 'editorial.pagesEmpty')}
              </p>
              <p className="text-sm text-ink-2">
                {t(language, 'editorial.pagesEmptyHint')}
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
              <h2 className="font-serif text-2xl md:text-3xl text-ink-2 mb-2">
                {t(language, 'editorial.insideIssue')}
              </h2>
              <p className="font-mono text-xs text-ink-2 tracking-[0.2em] uppercase">
                {t(language, 'editorial.pagesPreserved', { count: galleryImages.length })}
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
      <footer className="relative border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-mono text-[10px] text-ink-2 tracking-[0.2em] uppercase">
            LMSY.SPACE
            {magazine.catalog_id ? ` · ${magazine.catalog_id}` : ''}
            {' · '}
            {totalArtifacts} {t(language, 'editorial.artifacts')}
          </p>
        </div>
      </footer>
    </div>
  );
}
