'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { BackButton } from '@/components/back-button';

// API Response Types
interface Magazine {
  id: string;
  title: string;
  category: string;
  cover_url: string | null;
  blur_data: string | null;
  release_date: string | null;
  description: string | null;
  catalog_id: string | null;
  artifact_count: number;
  cover_source: 'database' | 'gallery_fallback' | 'empty_vault';
  gallery_images?: GalleryImage[];
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  blur_data: string | null;
  catalog_id: string | null;
}

interface NebulaColors {
  primary: string;
  secondary: string;
}

// Magazine color themes for nebula sync
const magazineThemes: Record<string, NebulaColors> = {
  'lookmhee': {
    primary: 'rgba(245, 158, 11, 0.12)',
    secondary: 'rgba(251, 191, 36, 0.08)',
  },
  'sonya': {
    primary: 'rgba(59, 130, 246, 0.12)',
    secondary: 'rgba(56, 189, 248, 0.08)',
  },
  'both': {
    primary: 'rgba(139, 92, 246, 0.12)',
    secondary: 'rgba(167, 139, 250, 0.08)',
  },
  'default': {
    primary: 'rgba(251, 191, 36, 0.08)',
    secondary: 'rgba(56, 189, 248, 0.06)',
  },
};

export default function EditorialPage() {
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [hoveredMagazine, setHoveredMagazine] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMagazines() {
      try {
        const response = await fetch('/api/editorial', {
          cache: 'no-store',
        });

        if (!response.ok) {
          setMagazines([]);
          return;
        }

        const data = await response.json();

        if (!data.success || !data.projects) {
          setMagazines([]);
          setLoading(false);
          return;
        }

        setMagazines(data.projects);
      } catch (err) {
        setMagazines([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMagazines();
  }, []);

  // Generate catalog IDs for display
  const getCatalogId = (index: number) => {
    return `LMSY-ED-${String(index + 1).padStart(3, '0')}`;
  };

  // Detect magazine theme based on title/description
  const getMagazineTheme = (magazine: Magazine): NebulaColors => {
    const title = magazine.title.toLowerCase();
    const desc = magazine.description?.toLowerCase() || '';

    if (title.includes('lookmhee') || desc.includes('lookmhee')) {
      return magazineThemes.lookmhee;
    }
    if (title.includes('sonya') || desc.includes('sonya')) {
      return magazineThemes.sonya;
    }
    if (title.includes('both') || title.includes('together')) {
      return magazineThemes.both;
    }
    return magazineThemes.default;
  };

  // Get current nebula colors
  const currentTheme = hoveredMagazine
    ? getMagazineTheme(magazines.find(m => m.id === hoveredMagazine)!)
    : magazineThemes.default;

  return (
    <div className="min-h-screen bg-black transition-colors duration-1000">
      {/* Dynamic Nebula Background */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        animate={{
          background: hoveredMagazine
            ? `radial-gradient(ellipse at 50% 50%, ${currentTheme.primary} 0%, ${currentTheme.secondary} 40%, transparent 70%)`
            : 'radial-gradient(ellipse at 50% 50%, rgba(251, 191, 36, 0.05) 0%, rgba(56, 189, 248, 0.03) 40%, transparent 70%)',
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />

      {/* Header */}
      <header className="relative z-10 px-6 py-8 md:px-12 md:py-12">
        <div className="flex items-start justify-between max-w-7xl mx-auto">
          <BackButton />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-right"
          >
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                The Editorials
              </span>
            </h1>
            <p className="font-mono text-xs text-white/40 tracking-[0.3em]">
              MAGAZINE ARCHIVE COLLECTION
            </p>
          </motion.div>
        </div>
      </header>

      {/* Magazine Grid */}
      <main className="relative z-10 px-6 pb-20 md:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Asymmetric Vertical Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            <AnimatePresence mode="wait">
              {!loading ? (
                <motion.div
                  key="magazines"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="contents"
                >
                  {magazines.map((magazine, index) => (
                    <MagazineSlot
                      key={magazine.id}
                      magazine={magazine}
                      index={index}
                      catalogId={magazine.catalog_id || getCatalogId(index)}
                      onHover={setHoveredMagazine}
                      theme={getMagazineTheme(magazine)}
                      isFirst={index === 0}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="contents"
                >
                  {/* Skeleton loading grid */}
                  {Array.from({ length: 8 }).map((_, index) => (
                    <SkeletonSlot key={index} index={index} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer - Archive Metadata */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-mono text-[10px] text-white/20 tracking-[0.3em] uppercase">
            LMSY.SPACE · EDITORIAL_ARCHIVE_VOL_001 · {`${magazines.length}`} ISSUES CURATED
          </p>
        </div>
      </footer>
    </div>
  );
}

// Skeleton Loading - Breathing Effect
function SkeletonSlot({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className="relative"
    >
      {/* Skeleton Container with breathing effect */}
      <motion.div
        className="relative aspect-[3/4] overflow-hidden rounded-lg border border-dashed border-lmsy-yellow/20 bg-lmsy-yellow/5"
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.2,
        }}
      >
        {/* Corner markers */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-3 left-3 w-8 h-8 border-t border-l border-lmsy-yellow/30" />
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b border-r border-lmsy-blue/30" />
        </div>

        {/* Loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            {/* Breathing dot */}
            <motion.div
              className="w-2 h-2 rounded-full bg-lmsy-yellow/40"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <p className="font-mono text-[8px] text-lmsy-yellow/30 tracking-[0.2em] uppercase">
              Loading...
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface MagazineSlotProps {
  magazine: Magazine;
  index: number;
  catalogId: string;
  onHover: (id: string | null) => void;
  theme: NebulaColors;
  isFirst: boolean;
}

function MagazineSlot({ magazine, index, catalogId, onHover, isFirst }: MagazineSlotProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  // Direct CDN URL - no placeholder masking
  const coverUrl = magazine.cover_url
    ? (magazine.cover_url.startsWith('http') ? magazine.cover_url : `https://cdn.lmsy.space/${magazine.cover_url}`)
    : null;

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      onHoverStart={() => onHover(magazine.id)}
      onHoverEnd={() => onHover(null)}
      className="relative group"
      style={{ cursor: 'pointer' }}
    >
      <Link
        href={`/editorial/${magazine.id}`}
        className="block"
        onClick={() => setIsNavigating(true)}
      >
        {/* Magazine Cover Container - 3:4 Aspect Ratio */}
        <div className={`relative aspect-[3/4] overflow-hidden rounded-lg bg-white/[0.02] border border-white/10 transition-opacity duration-300 ${
          isNavigating ? 'opacity-50' : ''
        }`}>
          {/* Corner Frame Decorations */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-lmsy-yellow/40" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-lmsy-blue/40" />
          </div>

          {/* Skeleton Loading while image loads */}
          {isLoading && coverUrl && !imageError && (
            <motion.div
              className="absolute inset-0 border border-dashed border-lmsy-yellow/20 bg-lmsy-yellow/5"
              animate={{
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="w-2 h-2 rounded-full bg-lmsy-yellow/40"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.4, 0.8, 0.4],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {imageError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center border border-red-500/30 p-3">
              <p className="text-red-400/50 font-mono text-[6px] break-all text-center leading-tight">
                IMAGE_LOAD_FAILED
              </p>
            </div>
          ) : coverUrl ? (
            // Real CDN image
            <Image
              src={coverUrl}
              alt={magazine.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              placeholder="empty"
              onError={handleImageError}
              onLoad={handleImageLoad}
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={isFirst}
              unoptimized
            />
          ) : (
            // No cover available
            <div className="absolute inset-0 flex flex-col items-center justify-center border border-white/10">
              <div className="relative mb-3">
                <div className="w-6 h-6 rotate-45 border border-white/20" />
                <div className="absolute inset-0 w-6 h-6 border border-white/10 rotate-45 scale-75" />
              </div>
              <p className="font-mono text-[8px] text-white/10 tracking-[0.2em] uppercase text-center leading-relaxed">
                NO_COVER
              </p>
            </div>
          )}

          {/* Hover Overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />

          {/* Artifact Count */}
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 rounded px-2 py-1">
            <span className="font-mono text-[8px] text-white/70 tracking-[0.15em] uppercase">
              {magazine.artifact_count} ARTIFACT{magazine.artifact_count !== 1 ? 'S' : ''}
            </span>
          </div>

          {/* View Indicator */}
          <motion.div
            className="absolute bottom-4 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            initial={{ y: 10 }}
            whileHover={{ y: 0 }}
          >
            <span className="font-mono text-[10px] text-white/80 tracking-[0.2em] uppercase">
              View Issue →
            </span>
          </motion.div>
        </div>

        {/* Labels */}
        <motion.div
          className="absolute -top-3 -left-3 bg-black/80 backdrop-blur-sm border border-white/10 rounded px-2 py-1"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08 + 0.3 }}
        >
          <span className="font-mono text-[9px] text-lmsy-yellow/80 tracking-wider">
            #{catalogId}
          </span>
        </motion.div>

        <div className="absolute -bottom-3 -right-3 bg-black/80 backdrop-blur-sm border border-white/10 rounded px-3 py-1.5">
          <span className="font-mono text-[10px] text-white/70 tracking-wide uppercase">
            {magazine.title.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
