'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ExternalLink, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/lib/image-url';
import { getImageDimensions } from '@/lib/image-dimensions';
import { formatChapterTitle } from '@/lib/chapter-title';
import { t, type Language, type TranslationKey } from '@/lib/languages';
import { NebulaBackground } from '@/components/nebula-background';
import { BackButton } from '@/components/back-button';
import { ArchiveCreditCompact } from '@/components/archive-credit';
import type { CategoryType } from './page';
import { useLanguage } from '@/components/language-provider';
import { getLocalizedText, type LocalizedText } from '@/lib/localized-content';
import { categoryMeta } from '@/lib/category-meta';
import { formatDisplayDate } from '@/lib/display-date';
import { visibleProjectTabs } from '@/lib/project-tabs';

// Masonry is 1/2/3 columns; tell the image optimizer the real render width.
const DETAIL_IMAGE_SIZES = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  catalog_id: string | null;
  category_tag: string | null;
  curator_note: string | null;
  is_featured: boolean;
  event_date: string | null;
  rotation?: number | null;
}

interface GroupedImages {
  all: GalleryImage[];
  official_stills: GalleryImage[];
  bts: GalleryImage[];
  press_events: GalleryImage[];
}

// Chapter interface for chronological display
interface Chapter {
  id: string;
  title: string;
  period: string;
  images: GalleryImage[];
  startIndex: number;
}

interface Project {
  id: string;
  title: string;
  title_i18n?: LocalizedText | null;
  category: string;
  release_date: string | null;
  description: string | null;
  description_i18n?: LocalizedText | null;
  cover_url: string | null;
  cover_rotation?: number | null;
  watch_url: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_ongoing?: boolean;
  theme_statement?: string | null;
  theme_statement_i18n?: LocalizedText | null;
}

interface ProjectDetailClientProps {
  project: Project;
  images: GroupedImages;
  // Same-category public projects for the "more like this" section. Empty
  // array = section is hidden. Covers pre-picked server-side; no mock data.
  relatedProjects?: Array<{
    id: string;
    title: string;
    title_i18n?: LocalizedText | null;
    release_date: string | null;
    cover?: string | null;
    category?: string;
  }>;
}

// Curator's notes per tab. These are generic UI copy (not per-project data),
// so they are i18n keys rather than three hard-coded English paragraphs.
const CURATOR_NOTES: Record<CategoryType, { titleKey: TranslationKey; noteKey: TranslationKey } | null> = {
  all: null,
  official_stills: {
    titleKey: 'project.noteStillsTitle',
    noteKey: 'project.noteStills',
  },
  bts: {
    titleKey: 'project.noteBtsTitle',
    noteKey: 'project.noteBts',
  },
  press_events: {
    titleKey: 'project.notePressTitle',
    noteKey: 'project.notePress',
  },
};

/**
 * Group images into chronological chapters based on event_date
 * Chapters represent different phases of a project's lifecycle
 */
function groupImagesIntoChapters(images: GalleryImage[], language: Language): Chapter[] {
  if (images.length === 0) return [];

  // Filter images with event_date
  const datedImages = images.filter(img => img.event_date);
  if (datedImages.length === 0) {
    return [{
      id: 'single-chapter',
      title: t(language, 'project.unsorted'),
      period: '',
      images,
      startIndex: 0,
    }];
  }

  // Sort by event_date
  const sorted = [...datedImages].sort((a, b) => {
    const dateA = new Date(a.event_date!).getTime();
    const dateB = new Date(b.event_date!).getTime();
    return dateA - dateB;
  });

  // Group by month
  const chapters: Chapter[] = [];
  let currentChapter: GalleryImage[] = [];
  let currentMonth: string | null = null;
  let globalIndex = 0;

  for (const image of sorted) {
    const date = new Date(image.event_date!);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (currentMonth !== monthKey) {
      if (currentChapter.length > 0) {
        chapters.push({
          id: monthKey,
          title: getChapterTitle(monthKey, language),
          period: '',
          images: currentChapter,
          startIndex: globalIndex - currentChapter.length,
        });
      }
      currentChapter = [image];
      currentMonth = monthKey;
    } else {
      currentChapter.push(image);
    }
    globalIndex++;
  }

  // Don't forget the last chapter
  if (currentChapter.length > 0 && currentMonth) {
    chapters.push({
      id: currentMonth,
      title: getChapterTitle(currentMonth, language),
      period: '',
      images: currentChapter,
      startIndex: globalIndex - currentChapter.length,
    });
  }

  // Images whose event_date is unknown (NULL) must not silently disappear
  // from the page: collect them into a trailing chapter. NULL means "date
  // unknown", never a fabricated date.
  const undatedImages = images.filter(img => !img.event_date);
  if (undatedImages.length > 0) {
    chapters.push({
      id: 'undated',
      title: t(language, 'project.unsorted'),
      period: t(language, 'project.dateUnknown'),
      images: undatedImages,
      startIndex: sorted.length,
    });
  }

  return chapters;
}

/**
 * Chapter titles are generic month labels localized by the active language
 * (e.g. "August 2024" / "2024年8月"). The previous per-month narrative names
 * ("Chapter I: The Premiere"...) were hard-coded for one project's 2024
 * timeline and have been removed (phase-4 batch 1, Task 4).
 */
function getChapterTitle(currentMonth: string, language: Language): string {
  return formatChapterTitle(currentMonth, language);
}

export default function ProjectDetailClient({ project, images, relatedProjects = [] }: ProjectDetailClientProps) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<CategoryType>('all');
  const currentImages = images[activeTab] || [];
  const curatorNote = CURATOR_NOTES[activeTab];
  const localizedTitle = getLocalizedText(project.title_i18n, language, project.title);
  const localizedDescription = getLocalizedText(project.description_i18n, language, project.description);
  const localizedThemeStatement = getLocalizedText(project.theme_statement_i18n, language, project.theme_statement);

  // Category badge comes from the shared category-meta module: the label is
  // localized and the accent matches the Projects list badge.
  const category = categoryMeta(project.category);
  const categoryLabel = t(language, category.labelKey);
  const releaseDateLabel = formatDisplayDate(project.release_date, language);

  // Facets are offered only when they actually hold images (see
  // lib/project-tabs.ts). With the live data - every asset has
  // category_tag = NULL - BTS and Press are empty and "stills" equals "all",
  // so the tab bar would otherwise advertise three dead facets.
  const tabCounts = {
    all: images.all.length,
    official_stills: images.official_stills.length,
    bts: images.bts.length,
    press_events: images.press_events.length,
  };
  const tabs = visibleProjectTabs(tabCounts);
  const tabLabel: Record<CategoryType, string> = {
    all: t(language, 'project.tabAll'),
    official_stills: t(language, 'project.tabStills'),
    bts: t(language, 'project.tabBts'),
    press_events: t(language, 'project.tabPress'),
  };

  // 🎯 CHAPTERS: Group images by event_date for chronological display
  const chapters = groupImagesIntoChapters(currentImages, language);

  return (
    <>
      {/* 🌌 SPACE HUB RETURN - Glowing Bear-Rabbit Logo */}

      <NebulaBackground />
      <div className="min-h-screen">
        {/* Back navigation (P4): real history back, falls back to /projects */}
        <div className="w-full px-4 pt-4 sm:px-6 lg:px-10 xl:px-14">
          <BackButton />
        </div>
        <div className="w-full px-4 pt-14 pb-24 sm:px-6 md:pt-20 md:pb-32 lg:px-10 xl:px-14">
          <div className="relative">
            <aside className="xl:fixed xl:top-28 xl:left-14 xl:w-[220px] xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pr-3">
          {/* Title and Category */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 max-w-[220px]"
          >
            <div className="mb-4 flex flex-col items-start gap-3">
              <span className={`px-3 py-1 text-[10px] font-mono tracking-[0.1em] uppercase border backdrop-blur-sm ${category.accent}`}>
                {categoryLabel}
              </span>
              {releaseDateLabel && (
                <div className="flex items-center gap-2 text-ink-2">
                  <Calendar className="h-4 w-4" />
                  <time className="text-sm" dateTime={project.release_date ?? undefined}>
                    {releaseDateLabel}
                  </time>
                </div>
              )}
            </div>

            <h1 className="mb-4 font-serif text-2xl font-bold tracking-tight text-ink md:text-3xl xl:text-[2rem]">
              {localizedTitle}
            </h1>

            {/* 🔒 ARCHIVE CREDIT - Dynamic Gratitude based on category */}
            <div className="mb-5">
              <ArchiveCreditCompact category={project.category} />
            </div>

            <div className="h-0.5 w-24 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue" />
          </motion.div>

          {/* Description */}
          {localizedDescription && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6 max-w-[220px]"
            >
              <p className="text-sm leading-7 text-ink-2 whitespace-pre-line">
                {localizedDescription}
              </p>
            </motion.div>
          )}

          {localizedThemeStatement && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.22 }}
              className="mb-6 max-w-[220px]"
            >
              <p className="border-l border-lmsy-yellow/30 pl-4 text-sm leading-relaxed text-ink whitespace-pre-line">
                {localizedThemeStatement}
              </p>
            </motion.div>
          )}

          {/* Watch Button */}
          {project.watch_url && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-8 max-w-[220px]"
            >
              <a
                href={project.watch_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-black rounded-lg font-medium hover:opacity-90 transition-all duration-300"
              >
                <Play className="w-5 h-5" />
                {t(language, 'project.watchNow')}
                <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
          )}

          {/* Tab Navigation - only facets that contain images */}
          {tabs.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-8 max-w-[220px]"
            >
              <div className="flex flex-wrap gap-2 border-b border-border pb-4">
                {tabs.map((value) => (
                  <button
                    key={value}
                    onClick={() => setActiveTab(value)}
                    className={`relative px-4 py-2 text-xs font-mono tracking-wider uppercase transition-all duration-300 ${
                      activeTab === value ? 'text-ink' : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    {tabLabel[value]}
                    <span className="ml-2 text-ink-2">({tabCounts[value]})</span>
                    {activeTab === value && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Curator's Note */}
          <AnimatePresence mode="wait">
            {curatorNote && (
              <motion.div
                key={`curator-${activeTab}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="mb-8 max-w-[220px]"
              >
                <div className="relative p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <div>
                    <h4 className="text-xs font-mono text-lmsy-yellow/60 tracking-wider uppercase mb-2">
                      {t(language, curatorNote.titleKey)}
                    </h4>
                    <p className="text-ink-2 text-sm leading-relaxed italic">
                      {t(language, curatorNote.noteKey)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 🎯 CHAPTERIZED GALLERY - Chronological Masonry Layout */}
            </aside>

          <section className="xl:pl-[260px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`gallery-${activeTab}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {chapters.map((chapter) => {
                // Cover plate (catalog -000) leads the chapter full-width, so
                // projects with few images do not read as an empty right column.
                const coverIndex = chapter.images.findIndex(img => img.catalog_id?.endsWith('-000'));
                const coverImage = coverIndex >= 0 ? chapter.images[coverIndex] : null;
                const restImages = coverImage
                  ? chapter.images.filter((_, i) => i !== coverIndex)
                  : chapter.images;
                const coverUrl = coverImage ? getImageUrl(coverImage.image_url) : null;
                // Columns follow the actual image count so a 1-2 image chapter
                // reads as a deliberate plate, not an empty grid.
                const restColClass =
                  restImages.length <= 2
                    ? 'columns-1'
                    : restImages.length <= 4
                      ? 'columns-1 md:columns-2'
                      : 'columns-1 md:columns-2 lg:columns-3';

                return (
                <div key={chapter.id} className="mb-12">
                  {/* Chapter heading - generic localized month label
                      ("October 2026" / "2026年10月"), never per-project
                      narrative names (phase-4 Task 4). The previous code
                      computed titles but never rendered them; they are now
                      shown so users can see where a month section starts. */}
                  <div className="mb-4 flex items-baseline justify-between gap-3 md:mb-6">
                    <h3 className="font-serif text-xl md:text-2xl font-bold text-ink">
                      {chapter.title}
                    </h3>
                    {/* The month label already carries the date, so the
                        secondary slot shows how many images the chapter holds
                        instead of repeating "Aug 2024" next to "August 2024". */}
                    <span className="font-mono text-xs text-ink-2">
                      {chapter.period ||
                        `${chapter.images.length} ${
                          chapter.images.length === 1
                            ? t(language, 'common.imagesOne')
                            : t(language, 'common.imagesMany')
                        }`}
                    </span>
                  </div>
                  {/* Cover plate - full width, capped height */}
                  {coverImage && coverUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="mb-4 md:mb-6"
                    >
                      <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        <div className="relative max-h-[70vh] w-full overflow-hidden">
                          <Image
                            src={coverUrl}
                            alt={coverImage.caption || coverImage.catalog_id || ''}
                            width={1920}
                            height={1080}
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1100px"
                            className="w-full h-auto max-h-[70vh] object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                            style={{ transform: `rotate(${coverImage.rotation ?? 0}deg)` }}
                            priority
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        {/* COVER plate badge */}
                        {coverImage.catalog_id && (
                          <div className="absolute top-3 left-3 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="px-2 py-1 bg-lmsy-yellow/20 border border-lmsy-yellow/40 rounded-full">
                              <span className="text-[10px] font-mono font-bold text-lmsy-yellow">
                                {t(language, 'project.cover')}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Chapter Images - Gallery Grade Masonry */}
                  <div className={`${restColClass} gap-4 md:gap-6`}>
                    {restImages.map((image, index) => {
                      const imageUrl = getImageUrl(image.image_url);
                      const dimensions = getImageDimensions(image.image_url, image.rotation ?? 0);

                      return (
                        <motion.div
                          key={image.id}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: Math.min(index, 12) * 0.03 }}
                          className="mb-4 md:mb-6 break-inside-avoid"
                        >
                          <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
                            {/* 🎨 Natural aspect ratio; explicit width/height reserve
                                space before load (no layout shift) and let Next
                                optimize the served size. */}
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={image.caption || image.catalog_id || ''}
                                width={dimensions?.width ?? 1200}
                                height={dimensions?.height ?? 1800}
                                sizes={DETAIL_IMAGE_SIZES}
                                className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                                style={{ transform: `rotate(${image.rotation ?? 0}deg)` }}
                                loading={index < 2 ? 'eager' : 'lazy'}
                              />
                            ) : null}

                            {/* 🌌 Nebula Hover Glow */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* 📖 Catalog ID - Always visible */}
                            {image.catalog_id && (
                              <div className="absolute bottom-3 right-3 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                                <span className="font-mono text-[10px] text-lmsy-yellow/80 bg-black/40 backdrop-blur-sm px-2 py-1 rounded">
                                  {image.catalog_id}
                                </span>
                              </div>
                            )}

                            {/* 📝 Caption - Slide up on hover */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                              {image.catalog_id && (
                                <p className="text-[10px] font-mono text-lmsy-yellow/60 mb-1">
                                  {image.catalog_id}
                                </p>
                              )}
                              {image.caption && (
                                <p className="text-sm text-ink line-clamp-2">
                                  {image.caption}
                                </p>
                              )}
                            </div>

                            {/* Featured Badge */}
                            {image.is_featured && (
                              <div className="absolute top-4 right-4 px-2 py-1 bg-lmsy-blue/20 border border-lmsy-blue/40 rounded-full">
                                <span className="text-[10px] font-mono font-bold text-lmsy-blue">
                                  {t(language, 'project.featured')}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </motion.div>
            </AnimatePresence>
          </section>
          </div>

          {/* Empty State */}
          {currentImages.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <p className="text-ink text-lg">{t(language, 'project.emptyTitle')}</p>
              <p className="text-ink-2 text-sm mt-2">{t(language, 'project.emptyDesc')}</p>
            </motion.div>
          )}

          {/* More in this category (phase-4 Task 4): same category, different
              project, public visibility filter applied server-side. Hidden
              entirely when there is nothing to recommend. */}
          {relatedProjects.length > 0 && (
            <section className="mt-20 border-t border-white/10 pt-10">
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-ink mb-8">
                {t(language, 'projects.relatedTitle')}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {relatedProjects.map((related) => {
                  const relatedCover = related.cover ? getImageUrl(related.cover) : null;
                  return (
                    <Link
                      key={related.id}
                      // Canonical detail entry (phase-4 batch 2): editorial
                      // works are read through /editorial/[id], not here.
                      href={related.category === 'editorial' ? `/editorial/${related.id}` : `/projects/${related.id}`}
                      className="group/related block"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        {relatedCover ? (
                          <Image
                            src={relatedCover}
                            alt={getLocalizedText(related.title_i18n, language, related.title)}
                            fill
                            sizes="(max-width: 768px) 50vw, 33vw"
                            className="object-cover transition-transform duration-500 group-hover/related:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20 flex items-center justify-center">
                            <Calendar className="h-10 w-10 text-ink/30" />
                          </div>
                        )}
                      </div>
                      <p className="mt-3 text-sm font-medium text-ink group-hover/related:text-lmsy-blue transition-colors line-clamp-1">
                        {getLocalizedText(related.title_i18n, language, related.title)}
                      </p>
                      {formatDisplayDate(related.release_date, language, {
                        month: 'short',
                        day: false,
                      }) && (
                        <p className="text-xs text-ink-2 mt-1">
                          {formatDisplayDate(related.release_date, language, {
                            month: 'short',
                            day: false,
                          })}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
