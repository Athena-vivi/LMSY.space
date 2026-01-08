'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTheme } from '@/components/theme-provider';

interface Publication {
  id: string;
  mag_name: string;
  slug: string;
  issue_date: string;
  cover_url: string;
  images: string[];
  credits: Record<string, string>;
  description: string;
}

export default function EditorialPage() {
  const { theme } = useTheme();
  const [publications, setPublications] = useState<Publication[]>([]);

  const isDark = theme === "dark" || (theme === "system" && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    async function fetchPublications() {
      try {
        const response = await fetch('/api/editorial');
        if (!response.ok) {
          console.warn('API response not OK, using empty publications');
          setPublications([]);
          return;
        }
        const data = await response.json();
        setPublications(data.publications || []);
      } catch (err) {
        console.warn('Failed to fetch publications, using empty list:', err);
        setPublications([]);
      }
    }

    fetchPublications();
  }, []);

  // Generate empty slots to reach 8 total
  const totalSlots = 8;
  const emptySlots = Math.max(0, totalSlots - publications.length);

  return (
    <div className="min-h-screen">
      {/* Refined Masthead - 顶部精致页眉 */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 md:px-12 md:py-6 backdrop-blur-md border-b border-white/5"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
      >
        <div className="flex items-start justify-between">
          {/* Left: Logo + Small Title */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Link href="/" className="block hover:opacity-80 transition-opacity">
                <div className="relative h-8 w-8 md:h-9 md:w-9">
                  <Image
                    src="/lmsy-logo.png"
                    alt="LMSY Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </Link>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <h1 className="font-serif text-sm md:text-base tracking-[0.3em] text-foreground/80">
                THE EDITORIALS
              </h1>
            </motion.div>
          </div>

          {/* Right: Catalog Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-right"
          >
            <p className="font-mono text-[10px] md:text-xs tracking-[0.2em] text-muted-foreground/50 uppercase">
              [ TOTAL_ISSUES: {String(publications.length).padStart(2, '0')} / CURATING NOW... ]
            </p>
          </motion.div>
        </div>
      </header>

      {/* Main Content - Exhibition Gallery */}
      <main className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Featured Slot - 60% width */}
          <section className="mb-16 md:mb-24">
            <div className="w-[60%] mx-auto">
              {publications.length > 0 ? (
                <ExhibitionSlot
                  publication={publications[0]}
                  index={0}
                  isDark={isDark}
                />
              ) : (
                <EmptySlot index={0} isDark={isDark} />
              )}
            </div>
          </section>

          {/* Grid Slots - Dual column staggered */}
          <section className="grid md:grid-cols-2 gap-x-12 gap-y-16 md:gap-y-24">
            {publications.slice(1).map((pub, i) => (
              <ExhibitionSlot
                key={pub.id}
                publication={pub}
                index={i + 1}
                isDark={isDark}
              />
            ))}
            {[...Array(Math.max(0, emptySlots - 1))].map((_, i) => (
              <EmptySlot
                key={`empty-${i}`}
                index={publications.length + i}
                isDark={isDark}
              />
            ))}
          </section>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border/30 py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground/30 uppercase">
            LMSY.SPACE · ARCHIVE_VOL_001
          </p>
        </div>
      </footer>
    </div>
  );
}

interface ExhibitionSlotProps {
  publication?: Publication;
  index: number;
  isDark: boolean;
}

function ExhibitionSlot({ publication, index, isDark }: ExhibitionSlotProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const slotNumber = String(index + 1).padStart(3, '0');
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\//g, ' / ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <Link href={`/editorial/${publication?.slug || '#'}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden group cursor-pointer">
          {/* Background - Frosted glass with shimmer */}
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{
              background: isDark
                ? 'rgba(255, 255, 255, 0.02)'
                : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            {/* Shimmer Effect */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
              }}
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
                repeatDelay: 1,
              }}
            />
          </div>

          {/* Cover Image */}
          {publication?.cover_url && (
            <div className={`absolute inset-0 transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}>
              <Image
                src={publication.cover_url}
                alt={publication.mag_name}
                fill
                className="object-cover"
                onLoad={() => setImageLoaded(true)}
              />
            </div>
          )}

          {/* Corner Frame Decorations - L-shaped brackets */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l border-t opacity-40 transition-opacity duration-500 group-hover:opacity-100"
               style={{ borderColor: 'rgba(251, 191, 36, 0.5)', borderWidth: '0.5px' }} />
          <div className="absolute top-4 right-4 w-8 h-8 border-r border-t opacity-40 transition-opacity duration-500 group-hover:opacity-100"
               style={{ borderColor: 'rgba(251, 191, 36, 0.5)', borderWidth: '0.5px' }} />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l border-b opacity-40 transition-opacity duration-500 group-hover:opacity-100"
               style={{ borderColor: 'rgba(251, 191, 36, 0.5)', borderWidth: '0.5px' }} />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r border-b opacity-40 transition-opacity duration-500 group-hover:opacity-100"
               style={{ borderColor: 'rgba(251, 191, 36, 0.5)', borderWidth: '0.5px' }} />

          {/* Hover Glow Effect - Yellow/Blue Flow */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{
              opacity: hovered ? 1 : 0,
            }}
            animate={hovered ? {
              background: [
                'linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(56, 189, 248, 0.05) 100%)',
                'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
                'linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(56, 189, 248, 0.05) 100%)',
              ],
            } : {}}
            transition={{ duration: 2, repeat: hovered ? Infinity : 0 }}
          />

          {/* Center Text Placeholder */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="font-mono text-[8px] tracking-[0.2em] text-foreground/20 text-center px-4">
                {publication ? 'ISSUE_SKELETON // ASTRA_ARCHIVE' : 'EMPTY_SLOT // AWAITING_CONTENT'}
              </p>
            </div>
          )}

          {/* Catalog Stamp - Bottom Left */}
          <div className="absolute bottom-4 left-4">
            <p className="font-mono text-[10px] tracking-[0.15em] text-foreground/40">
              #{slotNumber}
            </p>
          </div>

          {/* Date Stamp - Bottom Right */}
          <div className="absolute bottom-4 right-4">
            <p className="font-mono text-[10px] tracking-[0.15em] text-foreground/40">
              {publication ? formatDate(publication.issue_date) : '---- / -- / --'}
            </p>
          </div>

          {/* Border Frame */}
          <div className="absolute inset-0 border border-foreground/10 pointer-events-none" />
        </div>
      </Link>
    </motion.div>
  );
}

interface EmptySlotProps {
  index: number;
  isDark: boolean;
}

function EmptySlot({ index, isDark }: EmptySlotProps) {
  const [hovered, setHovered] = useState(false);
  const slotNumber = String(index + 1).padStart(3, '0');

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <div className="relative aspect-[3/4] overflow-hidden cursor-default">
        {/* Background - Frosted glass with shimmer */}
        <div
          className="absolute inset-0 backdrop-blur-sm"
          style={{
            background: isDark
              ? 'rgba(255, 255, 255, 0.02)'
              : 'rgba(0, 0, 0, 0.02)',
          }}
        >
          {/* Shimmer Effect */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
            }}
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
              repeatDelay: 1,
            }}
          />
        </div>

        {/* Corner Frame Decorations - L-shaped brackets */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l border-t opacity-30 transition-opacity duration-500 hover:opacity-60"
             style={{ borderColor: 'rgba(251, 191, 36, 0.5)', borderWidth: '0.5px' }} />
        <div className="absolute top-4 right-4 w-8 h-8 border-r border-t opacity-30 transition-opacity duration-500 hover:opacity-60"
             style={{ borderColor: 'rgba(251, 191, 36, 0.5)', borderWidth: '0.5px' }} />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l border-b opacity-30 transition-opacity duration-500 hover:opacity-60"
             style={{ borderColor: 'rgba(251, 191, 36, 0.5)', borderWidth: '0.5px' }} />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r border-b opacity-30 transition-opacity duration-500 hover:opacity-60"
             style={{ borderColor: 'rgba(251, 191, 36, 0.5)', borderWidth: '0.5px' }} />

        {/* Hover Glow Effect - Yellow/Blue Flow */}
        <motion.div
          className="absolute inset-0 opacity-0 transition-opacity duration-700"
          style={{
            opacity: hovered ? 1 : 0,
          }}
          animate={hovered ? {
            background: [
              'linear-gradient(135deg, rgba(251, 191, 36, 0.03) 0%, rgba(56, 189, 248, 0.03) 100%)',
              'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%)',
              'linear-gradient(135deg, rgba(251, 191, 36, 0.03) 0%, rgba(56, 189, 248, 0.03) 100%)',
            ],
          } : {}}
          transition={{ duration: 2, repeat: hovered ? Infinity : 0 }}
        />

        {/* Center Text Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-mono text-[8px] tracking-[0.2em] text-foreground/15 text-center px-4">
            EMPTY_SLOT // AWAITING_CONTENT
          </p>
        </div>

        {/* Catalog Stamp - Bottom Left */}
        <div className="absolute bottom-4 left-4">
          <p className="font-mono text-[10px] tracking-[0.15em] text-foreground/30">
            #{slotNumber}
          </p>
        </div>

        {/* Date Stamp - Bottom Right */}
        <div className="absolute bottom-4 right-4">
          <p className="font-mono text-[10px] tracking-[0.15em] text-foreground/30">
            ---- / -- / --
          </p>
        </div>

        {/* Border Frame */}
        <div className="absolute inset-0 border border-foreground/5 pointer-events-none" />
      </div>
    </motion.div>
  );
}
