'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { BackButton } from '@/components/back-button';
import { supabase } from '@/lib/supabase/client';
import { getImageUrl } from '@/lib/image-url';

interface Magazine {
  id: string;
  title: string;
  category: string;
  cover_url: string | null;
  release_date: string | null;
  description: string | null;
  catalog_id: string | null;
  blur_data: string | null;
  gallery_images?: GalleryImage[];
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  blur_data: string | null;
}

interface NebulaColors {
  primary: string;
  secondary: string;
}

// Magazine color themes for nebula sync
const magazineThemes: Record<string, NebulaColors> = {
  'lookmhee': {
    primary: 'rgba(245, 158, 11, 0.12)',   // Amber
    secondary: 'rgba(251, 191, 36, 0.08)',
  },
  'sonya': {
    primary: 'rgba(59, 130, 246, 0.12)',    // Blue
    secondary: 'rgba(56, 189, 248, 0.08)',
  },
  'both': {
    primary: 'rgba(139, 92, 246, 0.12)',    // Purple
    secondary: 'rgba(167, 139, 250, 0.08)',
  },
  'default': {
    primary: 'rgba(251, 191, 36, 0.08)',    // Yellow
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
        console.log('[EDITORIAL] Fetching magazines from lmsy_archive.projects...');

        // Fetch projects with their gallery images using foreign key relationship
        const { data: projects, error } = await supabase
          .schema('lmsy_archive')
          .from('projects')
          .select(`
            *,
            gallery (
              id,
              image_url,
              blur_data,
              caption,
              catalog_id
            )
          `)
          .eq('category', 'editorial')
          .order('release_date', { ascending: false });

        if (error) {
          console.error('[EDITORIAL] ❌ Failed to fetch magazines:', error);
          setMagazines([]);
          return;
        }

        console.log('[EDITORIAL_DEBUG] Raw data from DB:', projects);

        if (!projects || projects.length === 0) {
          console.log('[EDITORIAL] ⚠️ No editorial projects found');
          setMagazines([]);
          setLoading(false);
          return;
        }

        // Process magazines: get cover from gallery if needed, count artifacts
        const processedMagazines = projects.map((project: any) => {
          // Get gallery images (Supabase returns them in a nested array)
          const galleryImages = project.gallery || [];
          const artifactCount = galleryImages.length;

          // 🔒 CRITICAL: Cover selection logic - prioritize catalog_id ending with -000
          let coverUrl = project.cover_url;
          let blurData = project.blur_data;
          let coverSource = 'project';

          if (!coverUrl && galleryImages.length > 0) {
            // Priority 1: Find image with catalog_id ending in -000 (cover image)
            const coverImage = galleryImages.find((img: any) => {
              const catalogId = img.catalog_id;
              if (!catalogId) return false;
              // Check if catalog_id ends with -000
              return /-000$/.test(catalogId);
            });

            if (coverImage) {
              coverUrl = coverImage.image_url;
              blurData = coverImage.blur_data;
              coverSource = `catalog-${coverImage.catalog_id}`;
              console.log('[EDITORIAL] Found -000 cover for', project.title, '->', coverImage.catalog_id);
            } else {
              // Priority 2: Find image with smallest catalog_id sequence (fallback)
              // Sort by catalog_id to get the lowest sequence number
              const sortedGallery = [...galleryImages].sort((a: any, b: any) => {
                const aCatalog = a.catalog_id || '';
                const bCatalog = b.catalog_id || '';

                // Extract sequence number from catalog_id (last 3 digits after last hyphen)
                const aMatch = aCatalog.match(/-(\d{3})$/);
                const bMatch = bCatalog.match(/-(\d{3})$/);

                const aSeq = aMatch ? parseInt(aMatch[1], 10) : 999;
                const bSeq = bMatch ? parseInt(bMatch[1], 10) : 999;

                return aSeq - bSeq;
              });

              coverUrl = sortedGallery[0].image_url;
              blurData = sortedGallery[0].blur_data;
              coverSource = `fallback-${sortedGallery[0].catalog_id}`;
              console.log('[EDITORIAL] Cover fallback for', project.title, '->', sortedGallery[0].catalog_id);
            }
          }

          return {
            ...project,
            cover_url: coverUrl,
            blur_data: blurData,
            gallery_images: galleryImages,
            artifact_count: artifactCount,
            cover_source: coverSource,
          };
        });

        console.log('[EDITORIAL] ✅ Successfully loaded', processedMagazines.length, 'magazines');
        console.log('[EDITORIAL_DEBUG] Processed magazines:', processedMagazines);
        setMagazines(processedMagazines);
      } catch (err) {
        console.error('[EDITORIAL] ❌ Error fetching magazines:', err);
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
                <>
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

                  {/* Only show empty slots when we have zero magazines */}
                  {magazines.length === 0 && (
                    <EmptySlot index={0} />
                  )}
                </>
              ) : (
                // Loading skeletons
                [0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                  <LoadingSlot key={`loading-${index}`} index={index} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-mono text-[10px] text-white/20 tracking-[0.3em] uppercase">
            LMSY.SPACE · EDITORIAL_ARCHIVE_VOL_001 · {magazines.length} ISSUES CURATED
          </p>
        </div>
      </footer>
    </div>
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Use getImageUrl to ensure CDN URL is properly formatted
  const coverUrl = magazine.cover_url ? getImageUrl(magazine.cover_url) : null;
  const blurData = magazine.blur_data;

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
          {/* Corner Frame Decorations - Viewfinder Style */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top-left corner */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-lmsy-yellow/40" />
            {/* Bottom-right corner */}
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-lmsy-blue/40" />
          </div>

          {/* Cover Image with blur-up */}
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={magazine.title}
              fill
              className={`object-cover transition-opacity duration-700 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } group-hover:scale-105`}
              placeholder={blurData ? "blur" : "empty"}
              blurDataURL={blurData || undefined}
              onLoad={() => setImageLoaded(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={isFirst}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border border-white/10 border-t-transparent animate-spin" />
            </div>
          )}

          {/* Hover Overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />

          {/* Artifact Count Overlay - Always visible */}
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 rounded px-2 py-1">
            <span className="font-mono text-[8px] text-white/70 tracking-[0.15em] uppercase">
              {magazine.artifact_count || 0} ARTIFACT{magazine.artifact_count !== 1 ? 'S' : ''} INSIDE
            </span>
          </div>

          {/* View Magazine Indicator */}
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

        {/* Archival Label - Top Left */}
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

        {/* Magazine Name - Bottom Right */}
        <div className="absolute -bottom-3 -right-3 bg-black/80 backdrop-blur-sm border border-white/10 rounded px-3 py-1.5">
          <span className="font-mono text-[10px] text-white/70 tracking-wide uppercase">
            {magazine.title
              .replace(/[^a-zA-Z0-9]/g, '_')
              .toUpperCase()
              .substring(0, 20)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

interface EmptySlotProps {
  index: number;
}

function EmptySlot({ index }: EmptySlotProps) {
  const catalogId = `LMSY-ED-${String(index + 1).padStart(3, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className="relative"
    >
      {/* Empty Slot Container - 3:4 Aspect Ratio */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-white/[0.02] border border-white/5 border-dashed">
        {/* Viewfinder Decorations */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top-left corner */}
          <div className="absolute top-3 left-3 w-8 h-8 border-t border-l border-white/10" />
          {/* Top-right corner */}
          <div className="absolute top-3 right-3 w-8 h-8 border-t border-r border-white/10" />
          {/* Bottom-left corner */}
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b border-l border-white/10" />
          {/* Bottom-right corner */}
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b border-r border-white/10" />
        </div>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Pending Label */}
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <p className="font-mono text-[10px] text-white/20 tracking-[0.2em] uppercase">
              MAG_ISSUE_PENDING
            </p>
          </motion.div>

          {/* Slot Number */}
          <div className="absolute top-4 left-4">
            <span className="font-mono text-[9px] text-white/10 tracking-wider">
              #{catalogId}
            </span>
          </div>
        </div>

        {/* Scanning Line Effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            y: ['-100%', '100%'],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear',
            delay: index * 0.5,
          }}
        >
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </motion.div>
      </div>
    </motion.div>
  );
}

interface LoadingSlotProps {
  index: number;
}

function LoadingSlot({ index }: LoadingSlotProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className="relative"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-white/[0.02] border border-white/5">
        {/* Shimmer Effect */}
        <motion.div
          className="absolute inset-0"
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
            delay: index * 0.2,
          }}
        >
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </motion.div>
      </div>
    </motion.div>
  );
}
