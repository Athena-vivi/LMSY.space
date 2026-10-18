'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/image-url';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { getLocalizedText, type LocalizedText } from '@/lib/localized-content';
import { titlePlateLabel } from '@/lib/editorial-meta';

// This is a client-rendered shell; the list is fetched client-side, so the
// HTML itself is static and safe to cache (the global no-store header and
// force-dynamic were preventing that).

// API Response Types
interface Magazine {
  id: string;
  title: string;
  title_i18n?: LocalizedText | null;
  category: string;
  cover_url: string | null;
  blur_data: string | null;
  release_date: string | null;
  description: string | null;
  description_i18n?: LocalizedText | null;
  catalog_id: string | null;
  artifact_count: number;
  cover_source: 'database' | 'gallery_fallback' | 'empty_vault';
  homepage_excerpt_i18n?: LocalizedText | null;
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

function MagazineIndex() {
  const { language } = useLanguage();
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
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data.success && data.projects) {
          setMagazines(data.projects);
        } else {
          setMagazines([]);
        }
      } catch {
        setMagazines([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMagazines();
  }, []);

  // ADR-001 D5: no generated display ids. A magazine card shows the real
  // catalog_id only when one exists; there is no index-based fallback.

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

  // Get current nebula colors. `find` can miss while the list is refreshing;
  // the theme then falls back to the default instead of dereferencing
  // undefined.
  const hoveredMagazineEntry = hoveredMagazine
    ? magazines.find((m) => m.id === hoveredMagazine)
    : undefined;
  const currentTheme = hoveredMagazineEntry
    ? getMagazineTheme(hoveredMagazineEntry)
    : magazineThemes.default;

  return (
    // The magazine surface uses the site background token (not raw #000) so it
    // matches the rest of the archive in both themes.
    <div className="min-h-screen bg-background transition-colors duration-1000">
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
      <header className="relative z-10 px-6 pt-10 pb-8 md:px-12 md:pt-14 md:pb-12">
        <div className="flex items-start justify-end max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-right"
          >
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                {t(language, 'editorial.title')}
              </span>
            </h1>
            <p className="font-mono text-xs text-ink-2 tracking-[0.3em] uppercase">
              {t(language, 'editorial.subtitle')}
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
                  {magazines.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full py-32 text-center"
                    >
                      <p className="font-serif text-xl text-ink-2">
                        {t(language, 'editorial.emptyTitle')}
                      </p>
                      <p className="mt-3 text-sm text-ink-2/70">
                        {t(language, 'editorial.emptyDesc')}
                      </p>
                    </motion.div>
                  ) : (
                    magazines.map((magazine, index) => (
                      <MagazineSlot
                        key={magazine.id}
                        magazine={magazine}
                        language={language}
                        index={index}
                        catalogId={magazine.catalog_id || null}
                        onHover={setHoveredMagazine}
                        theme={getMagazineTheme(magazine)}
                        isFirst={index === 0}
                      />
                    ))
                  )}
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
      <footer className="relative z-10 border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-mono text-[10px] text-ink-2 tracking-[0.2em] uppercase">
            LMSY.SPACE · {t(language, 'editorial.issueCount', { count: magazines.length })}
          </p>
        </div>
      </footer>
    </div>
  );
}

// Skeleton Loading - Breathing Effect
function SkeletonSlot({ index }: { index: number }) {
  const { language } = useLanguage();
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
            <p className="font-mono text-[10px] text-lmsy-yellow/70 tracking-[0.2em] uppercase">
              {t(language, 'editorial.loading')}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface MagazineSlotProps {
  magazine: Magazine;
  language: 'en' | 'zh' | 'th';
  index: number;
  catalogId?: string | null;
  onHover: (id: string | null) => void;
  theme: NebulaColors;
  isFirst: boolean;
}

function MagazineSlot({ magazine, language, index, catalogId, onHover, isFirst }: MagazineSlotProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const localizedTitle = getLocalizedText(magazine.title_i18n, language, magazine.title);

  // 🔒 CRITICAL: Use getImageUrl helper for full compatibility (old absolute + new relative)
  // 🚨 STRICTLY FORBIDDEN: Do NOT manually construct URLs here
  const coverUrl = getImageUrl(magazine.cover_url);

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
      {/* The issue opens on the single project detail route (phase 7); the
          old /editorial/[id] stays only as a 308 for bookmarks. */}
      <Link
        href={`/projects/${magazine.id}`}
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

          {/* Image with no error placeholder */}
          {!imageError && coverUrl ? (
            // Real CDN image
            <Image
              src={coverUrl}
              alt={localizedTitle}
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
              <p className="font-mono text-[11px] text-ink-2 tracking-[0.2em] uppercase text-center leading-relaxed">
                {t(language, 'editorial.noCover')}
              </p>
            </div>
          )}

          {/* Hover Overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />

          {/* Artifact Count */}
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 rounded px-2 py-1">
            <span className="font-mono text-[11px] text-ink-2 tracking-[0.15em] uppercase">
              {magazine.artifact_count} {t(language, 'editorial.artifacts')}
            </span>
          </div>

          {/* View Indicator */}
          <motion.div
            className="absolute bottom-4 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            initial={{ y: 10 }}
            whileHover={{ y: 0 }}
          >
            <span className="font-mono text-[10px] text-ink-2 tracking-[0.2em] uppercase">
              {t(language, 'editorial.viewIssue')} →
            </span>
          </motion.div>
        </div>

        {/* Labels */}
        {catalogId && (
          <motion.div
            className="absolute -top-3 -left-3 bg-black/80 backdrop-blur-sm border border-white/10 rounded px-2 py-1"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 + 0.3 }}
          >
            <span className="font-mono text-[11px] text-lmsy-yellow/80 tracking-wider">
              #{catalogId}
            </span>
          </motion.div>
        )}

        <div className="absolute -bottom-3 -right-3 bg-black/80 backdrop-blur-sm border border-white/10 rounded px-3 py-1.5">
          {/* Corner plate. Latin titles keep the archive convention
              (uppercase, spaces→underscores); CJK/Thai titles used to be
              stripped to "__________" by a global non-ASCII replace. */}
          <span className="font-mono text-[10px] text-ink-2 tracking-wide uppercase">
            {titlePlateLabel(localizedTitle)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/**
 * The magazine index: covers, catalog ids and per-issue reading entries.
 * Separate from /projects?category=editorial on purpose - that one is the
 * filtered project list, this one is the issue rack.
 */
export default function EditorialPage() {
  return <MagazineIndex />;
}
