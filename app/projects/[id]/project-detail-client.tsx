'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Calendar, ExternalLink, Play, Quote } from 'lucide-react';
import Image from 'next/image';
import { getImageUrl } from '@/lib/image-url';
import { NebulaBackground } from '@/components/nebula-background';
import { CATEGORIES, CategoryType } from './page';

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  catalog_id: string | null;
  category_tag: string | null;
  curator_note: string | null;
  is_featured: boolean;
  event_date: string | null;
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
  category: string;
  release_date: string | null;
  description: string | null;
  cover_url: string | null;
  watch_url: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_ongoing?: boolean;
}

interface ProjectDetailClientProps {
  project: Project;
  images: GroupedImages;
  categories: typeof CATEGORIES;
}

// Curator's notes for each category
const CURATOR_NOTES: Record<CategoryType, { title: string; note: string } | null> = {
  all: null,
  official_stills: {
    title: 'Curator\'s Note',
    note: 'These carefully selected stills capture the essence of the production, showcasing the visual language and artistic direction that define this project.',
  },
  bts: {
    title: 'Behind the Scenes',
    note: 'Exclusive glimpses into the creative process—the moments between takes, the laughter, and the dedicated craft that brings stories to life.',
  },
  press_events: {
    title: 'Press & Events',
    note: 'Documenting the public journey—red carpet moments, press conferences, and the shared excitement with fans and media.',
  },
};

/**
 * Group images into chronological chapters based on event_date
 * Chapters represent different phases of a project's lifecycle
 */
function groupImagesIntoChapters(images: GalleryImage[]): Chapter[] {
  if (images.length === 0) return [];

  // Filter images with event_date
  const datedImages = images.filter(img => img.event_date);
  if (datedImages.length === 0) {
    return [{
      id: 'single-chapter',
      title: 'The Collection',
      period: 'All Works',
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
          title: getChapterTitle(monthKey, currentMonth),
          period: formatPeriod(monthKey),
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
      title: getChapterTitle(currentMonth, null),
      period: formatPeriod(currentMonth),
      images: currentChapter,
      startIndex: globalIndex - currentChapter.length,
    });
  }

  return chapters;
}

/**
 * Generate chapter title based on month patterns
 */
function getChapterTitle(currentMonth: string, previousMonth: string | null): string {
  const [year, month] = currentMonth.split('-');
  const monthDate = new Date(parseInt(year), parseInt(month) - 1);
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long' });

  // Detect chapter type based on patterns
  if (currentMonth === '2024-08' || currentMonth === '2024-09') {
    return `Chapter I: The Premiere`;
  }
  if (currentMonth === '2024-10') {
    return `Chapter II: The Resonance`;
  }
  if (currentMonth === '2024-12') {
    return `Chapter III: The Aftermath`;
  }

  // Default: use month name
  return `${monthName} ${year}`;
}

/**
 * Format period string like "Aug 2024 - Sep 2024" or "Aug 2024"
 */
function formatPeriod(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function ProjectDetailClient({ project, images, categories }: ProjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState<CategoryType>('all');
  const currentImages = images[activeTab] || [];
  const curatorNote = CURATOR_NOTES[activeTab];

  // Category config for badges
  const categoryConfig: Record<string, { label: string; className: string }> = {
    series: {
      label: 'TV Series',
      className: 'text-lmsy-yellow border-lmsy-yellow/30 bg-lmsy-yellow/5 backdrop-blur-sm',
    },
    editorial: {
      label: 'Editorial',
      className: 'text-lmsy-blue border-lmsy-blue/30 bg-lmsy-blue/5 backdrop-blur-sm',
    },
    appearance: {
      label: 'Appearance',
      className: 'text-white border-white/20 bg-white/5 backdrop-blur-sm',
    },
    journal: {
      label: 'Journal',
      className: 'text-white/40 border-white/10 bg-transparent backdrop-blur-sm',
    },
    commercial: {
      label: 'Commercial',
      className: 'text-amber-200/70 border-amber-500/20 bg-amber-500/5 backdrop-blur-sm',
    },
  };

  // 🎯 CHAPTERS: Group images by event_date for chronological display
  const chapters = groupImagesIntoChapters(currentImages);

  return (
    <>
      <NebulaBackground />
      <div className="min-h-screen">
        {/* Back Button */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32">
          <Link href={`/exhibitions/category/${project.category === 'series' ? 'drama' : project.category === 'appearance' ? 'stage' : 'travel'}`}>
            <motion.button
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm tracking-wider"
              whileHover={{ x: -5 }}
            >
              <ArrowLeft className="h-4 w-4" />
              BACK TO EXHIBITION
            </motion.button>
          </Link>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-32">
          {/* Hero - Cover Image with Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            {(() => {
              const coverUrl = getImageUrl(project.cover_url);
              return coverUrl ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-white/10">
                  <Image
                    src={coverUrl}
                    alt={project.title}
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                  />
                </div>
              ) : (
                /* Glowing text logo placeholder */
                <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-white/10 bg-gradient-to-br from-lmsy-yellow/10 via-lmsy-blue/10 to-black flex items-center justify-center">
                  <div className="text-center">
                    <motion.h1
                      className="font-serif text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter"
                      style={{
                        background: 'linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(56, 189, 248) 50%, rgb(251, 191, 36) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        filter: 'drop-shadow(0 0 30px rgba(251, 191, 36, 0.3))',
                      }}
                      animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    >
                      {project.title.split(' ').map(word => word[0]).join('') || project.title.substring(0, 3).toUpperCase()}
                    </motion.h1>
                    <p className="text-white/40 text-sm mt-4 tracking-widest uppercase">Coming Soon</p>
                  </div>
                </div>
              );
            })()}
          </motion.div>

          {/* Title and Category */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <span className={`px-3 py-1 text-[10px] font-mono tracking-[0.1em] uppercase border ${categoryConfig[project.category]?.className || categoryConfig.series.className}`}>
                {categoryConfig[project.category]?.label || 'Uncategorized'}
              </span>
              {project.release_date && (
                <div className="flex items-center gap-2 text-white/60">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {new Date(project.release_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              {project.title}
            </h1>

            <div className="w-24 h-0.5 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue" />
          </motion.div>

          {/* Description */}
          {project.description && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-12 max-w-3xl"
            >
              <p className="text-lg leading-relaxed text-white/60 whitespace-pre-line">
                {project.description}
              </p>
            </motion.div>
          )}

          {/* Watch Button */}
          {project.watch_url && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-12"
            >
              <a
                href={project.watch_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-black rounded-lg font-medium hover:opacity-90 transition-all duration-300"
              >
                <Play className="w-5 h-5" />
                Watch Now
                <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
          )}

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-12"
          >
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
              {categories.map((cat) => {
                const count = images[cat.value as CategoryType]?.length || 0;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setActiveTab(cat.value as CategoryType)}
                    className={`relative px-4 py-2 text-xs font-mono tracking-wider uppercase transition-all duration-300 ${
                      activeTab === cat.value
                        ? 'text-white'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {cat.label}
                    <span className="ml-2 text-white/20">({count})</span>
                    {activeTab === cat.value && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Curator's Note */}
          <AnimatePresence mode="wait">
            {curatorNote && (
              <motion.div
                key={`curator-${activeTab}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="mb-12 max-w-3xl"
              >
                <div className="relative p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <Quote className="absolute top-4 left-4 h-8 w-8 text-lmsy-yellow/20" />
                  <div className="pl-8">
                    <h4 className="text-xs font-mono text-lmsy-yellow/60 tracking-wider uppercase mb-2">
                      {curatorNote.title}
                    </h4>
                    <p className="text-white/60 text-sm leading-relaxed italic">
                      {curatorNote.note}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 🎯 CHAPTERIZED GALLERY - Chronological Masonry Layout */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`gallery-${activeTab}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {chapters.map((chapter, chapterIndex) => (
                <div key={chapter.id} className="mb-12">
                  {/* Chapter Header */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: chapterIndex * 0.1 }}
                    className="mb-8"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      <div className="text-center px-6">
                        <h3 className="font-serif text-xl md:text-2xl text-white/80">
                          {chapter.title}
                        </h3>
                        <p className="font-mono text-[10px] text-lmsy-yellow/60 tracking-[0.2em] uppercase mt-1">
                          {chapter.period}
                        </p>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/20 to-transparent" />
                    </div>
                  </motion.div>

                  {/* Chapter Images - Masonry Layout */}
                  <div className="columns-1 md:columns-2 lg:columns-3 gap-4 md:gap-6">
                    {chapter.images.map((image, index) => (
                      <motion.div
                        key={image.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        className="mb-4 md:mb-6 break-inside-avoid"
                      >
                        <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
                          {/* Image with original aspect ratio - no stretching, no cropping */}
                          {(() => {
                            const imageUrl = getImageUrl(image.image_url);
                            return imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={image.caption || image.catalog_id || ''}
                                width={0}
                                height={0}
                                sizes="100vw"
                                className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                                unoptimized
                              />
                            ) : null;
                          })()}

                          {/* Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                          {/* Caption */}
                          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                            {image.catalog_id && (
                              <p className="text-[10px] font-mono text-lmsy-yellow/60 mb-1">
                                {image.catalog_id}
                              </p>
                            )}
                            {image.caption && (
                              <p className="text-sm text-white/80 line-clamp-2">
                                {image.caption}
                              </p>
                            )}
                          </div>

                          {/* Featured Badge */}
                          {image.is_featured && (
                            <div className="absolute top-4 right-4 px-2 py-1 bg-lmsy-yellow/20 border border-lmsy-yellow/40 rounded-full">
                              <span className="text-[10px] font-mono font-bold text-lmsy-yellow">FEATURED</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Empty State */}
          {currentImages.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <p className="text-white/40 text-lg">No images in this category yet.</p>
              <p className="text-white/20 text-sm mt-2">More content will be added soon.</p>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
