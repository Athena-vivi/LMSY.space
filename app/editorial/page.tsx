'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { BackButton } from '@/components/back-button';
import { supabase } from '@/lib/supabase/client';

interface Magazine {
  id: string;
  title: string;
  category: string;
  cover_url: string;
  release_date: string;
  description: string | null;
  catalog_id: string | null;
  blur_data: string | null;
  artifact_count?: number;
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
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('category', 'magazine')
          .order('release_date', { ascending: false });

        if (error) {
          console.error('Failed to fetch magazines:', error);
          setMagazines([]);
        } else {
          // Fetch artifact counts for each magazine
          const magazinesWithCounts = await Promise.all(
            (data || []).map(async (magazine) => {
              const { count } = await supabase
                .from('gallery')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', magazine.id);

              return {
                ...magazine,
                artifact_count: (count || 0) + 1, // +1 for the cover itself
              };
            })
          );
          setMagazines(magazinesWithCounts);
        }
      } catch (err) {
        console.error('Error fetching magazines:', err);
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
                    />
                  ))}

                  {/* Empty Slots for curation */}
                  {[...Array(Math.max(0, 8 - magazines.length))].map((_, index) => (
                    <EmptySlot
                      key={`empty-${index}`}
                      index={magazines.length + index}
                    />
                  ))}
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
}

function MagazineSlot({ magazine, index, catalogId, onHover, theme }: MagazineSlotProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      onHoverStart={() => onHover(magazine.id)}
      onHoverEnd={() => onHover(null)}
      className="relative group"
    >
      <Link href={`/editorial/${magazine.id}`} className="block">
        {/* Magazine Cover Container - 3:4 Aspect Ratio */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-white/[0.02] border border-white/10">
          {/* Corner Frame Decorations - Viewfinder Style */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top-left corner */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-lmsy-yellow/40" />
            {/* Bottom-right corner */}
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-lmsy-blue/40" />
          </div>

          {/* Cover Image with blur-up */}
          {magazine.cover_url ? (
            <Image
              src={magazine.cover_url}
              alt={magazine.title}
              fill
              className={`object-cover transition-transform duration-700 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              placeholder="blur"
              blurDataURL={magazine.blur_data || 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyL/wAARCADIAeAADAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Jj9T5r6JzH8qg9hjtiT0OqT5VoT8VfG8a8M+Jt0X05ZT6bqHKKqWpSmJySMipW0pJzaX4JMqopJlEYxjmUxlJcqWpSmQyOV5UqTlKUhlKcYyxnKCUooyinKcIyinCUYxjmOclSjmKcYynCUYxjmOclSnGMZzjlKcYynGMZzjlKUoRylKMUoypTFKMUwplylMUwplyjGMU5ylKMUoRylGMQ=='}
              onLoad={() => setImageLoaded(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority
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
              {magazine.artifact_count || 1} ARTIFACT{magazine.artifact_count !== 1 ? 'S' : ''} INSIDE
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
