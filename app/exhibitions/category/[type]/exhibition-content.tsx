'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { NebulaBackground } from '@/components/nebula-background';
import { getImageUrl } from '@/lib/image-url';
import { ProjectWithImage, GalleryImage } from './page';
import { GalleryCanvas } from '@/components/gallery-canvas';
import { SpaceHubReturn } from '@/components/space-hub-return';
import { useState, useCallback } from 'react';

interface ExhibitionContentProps {
  mapping: {
    category?: string;
    title: string;
    description: string;
  };
  projects: ProjectWithImage[];
  type: string;
  allImages: GalleryImage[];
}

/**
 * Format time period display for projects
 * Shows range for ongoing projects, single date for one-time events
 */
function formatTimePeriod(project: ProjectWithImage): string {
  // Use start_date if available, otherwise fall back to release_date
  const baseDate = project.start_date || project.release_date;

  if (!baseDate) {
    return '';
  }

  // If it's an ongoing project with different start/end dates
  if (project.is_ongoing && project.end_date) {
    const start = new Date(baseDate);
    const end = new Date(project.end_date);

    const startStr = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    // Show range if different, otherwise show "Ongoing"
    return startStr === endStr
      ? `${startStr} - Ongoing`
      : `${startStr} - ${endStr}`;
  }

  // If start and end are different but not ongoing (multi-day event)
  if (project.start_date && project.end_date && project.start_date !== project.end_date) {
    const start = new Date(project.start_date);
    const end = new Date(project.end_date);

    const startStr = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return `${startStr} - ${endStr}`;
  }

  // Default: single date
  return new Date(baseDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ExhibitionContent({ mapping, projects, allImages }: ExhibitionContentProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Find the index of a project's first image in the allImages array
  const getProjectImageIndex = useCallback((projectId: string) => {
    return allImages.findIndex(img => img.project_id === projectId);
  }, [allImages]);

  return (
    <>
      {/* 🌌 SPACE HUB RETURN - Glowing Bear-Rabbit Logo */}
      <SpaceHubReturn />

      <NebulaBackground />
      <div className="min-h-screen py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Header */}
          <div className="mb-16 md:mb-24">
            <motion.h1
              className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              style={{
                background: 'linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(56, 189, 248) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {mapping.title}
            </motion.h1>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl">
              {mapping.description}
            </p>
            <div className="mt-8 flex items-center gap-4 text-sm text-white/40">
              <span>{projects.length} Projects</span>
              <span>•</span>
              <span>{allImages.length} Images</span>
              <span>•</span>
              <span>Archive Collection</span>
            </div>
          </div>

          {/* 🖼️ GALLERY-GRADE MASONRY - Natural Aspect Ratios */}
          {projects.length > 0 ? (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-4 md:gap-6">
              {projects.map((project, index) => {
                const projectImageIndex = getProjectImageIndex(project.id);
                return (
                  <motion.div
                    key={project.id}
                    className="mb-4 md:mb-6 break-inside-avoid group"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                  >
                    <div className="relative overflow-hidden rounded-xl border bg-white/5 cursor-pointer"
                      style={{
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                      }}
                      onClick={() => {
                        if (projectImageIndex >= 0) {
                          setLightboxIndex(projectImageIndex);
                        } else {
                          // If no specific image, navigate to project detail
                          window.location.href = `/projects/${project.id}`;
                        }
                      }}
                    >
                      {/* 🔥 INTRINSIC ASPECT RATIO: width=0 height=0 forces natural dimensions */}
                      {(() => {
                        const imageUrl = project.displayImage ? getImageUrl(project.displayImage) : null;
                        if (imageUrl) {
                          return (
                            <Image
                              src={imageUrl}
                              alt={project.title}
                              width={0}
                              height={0}
                              sizes="100vw"
                              className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                              unoptimized
                            />
                          );
                        }
                        return (
                          <div className="aspect-[4/5] bg-gradient-to-br from-lmsy-yellow/10 to-lmsy-blue/10 flex items-center justify-center">
                            <span className="font-serif text-4xl font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                              {project.title.charAt(0)}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500" />

                      {/* Content */}
                      <div className="absolute inset-0 p-6 flex flex-col justify-end">
                        {/* Category Badge */}
                        <div className="mb-3">
                          <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] font-mono tracking-wider uppercase text-white/80 border border-white/20">
                            {project.category}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-serif text-xl md:text-2xl font-bold text-white mb-2 line-clamp-2">
                          {project.title}
                        </h3>

                        {/* 🕐 Time Period Display */}
                        {(project.start_date || project.release_date) && (
                          <p className="text-white/70 text-xs md:text-sm">
                            {formatTimePeriod(project)}
                          </p>
                        )}

                        {/* Tags */}
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {project.tags.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="text-[10px] text-white/50 font-mono"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 🔍 Zoom Indicator */}
                      {projectImageIndex >= 0 && (
                        <motion.div
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          initial={{ scale: 0.8 }}
                          whileHover={{ scale: 1 }}
                        >
                          <div className="bg-black/50 backdrop-blur-sm rounded-full p-2">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607zM10.5 7.5v6m3-3h-6" />
                            </svg>
                          </div>
                        </motion.div>
                      )}

                      {/* Hover Border Effect */}
                      <div className="absolute inset-0 rounded-xl border-2 border-transparent bg-gradient-to-r from-lmsy-yellow/30 via-lmsy-blue/30 to-lmsy-yellow/30 p-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="absolute inset-0 rounded-xl bg-background/0" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24">
              <p className="text-white/40 text-lg">No projects found in this category yet.</p>
              <Link
                href="/"
                className="inline-block mt-6 text-lmsy-yellow hover:text-lmsy-blue transition-colors"
              >
                Return Home
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 🖼️ LIGHTBOX - Full Screen Image Viewer */}
      <AnimatePresence>
        {lightboxIndex !== null && allImages.length > 0 && (
          <GalleryCanvas
            images={allImages}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
