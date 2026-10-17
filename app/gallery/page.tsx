'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { supabase, type GalleryItem } from '@/lib/supabase';
import Lightbox from './lightbox';
import { BackButton } from '@/components/back-button';
import { getImageUrl } from '@/lib/image-url';
import { getImageDimensions, FALLBACK_ASPECT_RATIO } from '@/lib/image-dimensions';
import { getLocalizedText } from '@/lib/localized-content';

const gradients = [
  'from-lmsy-yellow/20 to-lmsy-yellow/5',
  'from-lmsy-blue/20 to-lmsy-blue/5',
  'from-purple-500/20 to-purple-500/5',
  'from-pink-500/20 to-pink-500/5',
  'from-amber-500/20 to-amber-500/5',
];

// Only the columns this page renders (list + lightbox). The previous
// `select('*')` also pulled every long text column (excerpt, title, credits,
// i18n blobs) for all 330 rows.
const GALLERY_COLUMNS =
  'id, image_url, caption, caption_i18n, tag, catalog_id, created_at, is_cover, is_editorial, curator_note, rotation, sequence, source_url, source_platform';
const PAGE_SIZE = 60;

const GRID_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

// Sentinel for the untagged filter: rows whose tag column IS NULL cannot be
// matched with .eq(), they need .is('tag', null).
const UNTAGGED = '__untagged__';

async function fetchGalleryPage(from: number, tag: string) {
  let query = supabase
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select(GALLERY_COLUMNS);

  if (tag === UNTAGGED) {
    query = query.is('tag', null);
  } else if (tag !== 'All') {
    query = query.eq('tag', tag);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }) // stable tiebreaker so paging never repeats/skips
    .range(from, from + PAGE_SIZE - 1);

  if (error) return { rows: [] as GalleryItem[], failed: true };
  return { rows: (data || []) as unknown as GalleryItem[], failed: false };
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [lightboxImage, setLightboxImage] = useState<GalleryItem | null>(null);
  const { language } = useLanguage();

  // Reload from the first page whenever the filter changes (filtering happens
  // in the database, not on a fully-loaded client array).
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const { rows, failed } = await fetchGalleryPage(0, selectedTag);
        if (!active) return;
        setImages(rows);
        setHasMore(!failed && rows.length === PAGE_SIZE);
      } catch {
        if (active) setImages([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedTag]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { rows, failed } = await fetchGalleryPage(images.length, selectedTag);
      setImages((prev) => [...prev, ...rows]);
      setHasMore(!failed && rows.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, images.length, selectedTag]);

  // Tag buttons must match tag values that actually exist in the database
  // (audit P1-3). Verified distribution: Magazine 237, Advertising 54,
  // STAGE 12, STILL 9, Telegram 3, untagged 15. "Telegram" is ingest-source
  // metadata rather than a content category, so it is not offered as a
  // user-facing filter (those rows remain visible under All).
  const tags = [
    { key: 'gallery.tagAll', value: 'All' },
    { key: 'gallery.tagMagazine', value: 'Magazine' },
    { key: 'gallery.tagAdvertising', value: 'Advertising' },
    { key: 'gallery.tagStage', value: 'STAGE' },
    { key: 'gallery.tagStill', value: 'STILL' },
    { key: 'gallery.tagUntagged', value: UNTAGGED },
  ];

  const filteredImages = images;

  const openLightbox = useCallback((image: GalleryItem) => {
    setLightboxImage(image);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="pt-24 pb-8 md:pt-32 md:pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-8">
            <BackButton />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6 font-bold text-ink tracking-tight">
              {t(language, 'gallery.title')}
            </h1>
            <p className="text-lg text-ink-2 max-w-2xl">
              {t(language, 'gallery.description')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tag Filter */}
      <section className="pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-wrap gap-3"
          >
            {tags.map((tag) => (
              <button
                key={tag.value}
                onClick={() => setSelectedTag(tag.value)}
                className={`px-6 py-2.5 text-sm font-medium transition-all duration-300 rounded-full border ${
                  selectedTag === tag.value
                    ? 'bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-ink border-transparent shadow-lg shadow-lmsy-yellow/20'
                    : 'bg-muted text-ink-2 border-border hover:border-lmsy-blue hover:text-lmsy-blue'
                }`}
              >
                #{t(language, tag.key as any)}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-lg bg-muted animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Masonry Gallery with Lazy Loading */}
      {!loading && (
        <section className="pb-24 md:pb-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              layout
              className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6"
            >
              <AnimatePresence>
                {filteredImages.map((item, index) => {
                  const imageUrl = getImageUrl(item.image_url);
                  // The gallery does not apply a CSS rotation, so use the stored
                  // orientation as-is (no w/h swap).
                  const dimensions = getImageDimensions(item.image_url);
                  // Cap the stagger: with the full set this expression used to
                  // grow to ~16s (index * 0.05 for 330 items).
                  const revealDelay = Math.min(index, 12) * 0.03;

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: revealDelay }}
                      className="break-inside-avoid"
                    >
                      <div
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer magazine-shadow"
                        onClick={() => openLightbox(item)}
                      >
                        {/* 🎨 Natural aspect ratio, with reserved space to avoid layout shift */}
                        {imageUrl ? (
                          <div
                            className="relative w-full"
                            style={{ aspectRatio: dimensions ? `${dimensions.width} / ${dimensions.height}` : `${FALLBACK_ASPECT_RATIO}` }}
                          >
                            <Image
                              src={imageUrl}
                              alt={getLocalizedText(item.caption_i18n, language, item.caption) || item.tag || 'Gallery image'}
                              fill
                              sizes={GRID_SIZES}
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                              loading={index < 3 ? 'eager' : 'lazy'}
                            />
                          </div>
                        ) : (
                          <div className={`w-full min-h-[200px] aspect-[3/4] bg-gradient-to-br ${gradients[index % gradients.length]}`} />
                        )}

                        {/* 🌌 Nebula Hover Glow */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        {/* 📖 Catalog Number - Always visible.
                            ADR-001 D5: show the asset's persistent catalog_id;
                            assets without one (e.g. promoted before numbering
                            was wired) simply show nothing — never a generated
                            stand-in number. */}
                        <div className="absolute bottom-2 right-2 opacity-60 hover:opacity-100 transition-opacity">
                          {item.catalog_id && (
                            <span
                              className="text-[10px] font-mono tracking-wide text-white/70"
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {item.catalog_id}
                            </span>
                          )}
                        </div>

                        {/* 🏷️ Tag Badge - Top Left */}
                        {item.tag && (
                          <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="px-3 py-1 text-xs font-medium bg-black/50 backdrop-blur-sm rounded-full text-ink border border-white/10">
                              #{item.tag}
                            </span>
                          </div>
                        )}

                        {/* 🔍 Zoom Icon - Top Right */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-black/50 backdrop-blur-sm rounded-full p-2 border border-white/10">
                            <ZoomIn className="h-4 w-4 text-ink" />
                          </div>
                        </div>

                        {/* 📝 Caption - Bottom */}
                        {getLocalizedText(item.caption_i18n, language, item.caption) && (
                          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                            <p className="text-ink font-serif text-sm line-clamp-2 drop-shadow-lg">
                              {getLocalizedText(item.caption_i18n, language, item.caption)}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {/* Load more — real pagination, the full table is never fetched at once */}
            {hasMore && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 rounded-full text-sm font-medium border border-border bg-muted text-ink-2 hover:border-lmsy-blue hover:text-lmsy-blue transition-colors disabled:opacity-60"
                >
                  {loadingMore
                    ? language === 'zh'
                      ? '加载中…'
                      : language === 'th'
                        ? 'กำลังโหลด…'
                        : 'Loading…'
                    : language === 'zh'
                      ? '加载更多'
                      : language === 'th'
                        ? 'โหลดเพิ่มเติม'
                        : 'Load more'}
                </button>
              </div>
            )}

            {/* Empty State / Under Construction */}
            {filteredImages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="max-w-md mx-auto">
                  {/* Animated Sparkle Icon */}
                  <motion.div
                    className="mx-auto w-16 h-16 mb-6"
                    animate={{
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <div className="relative w-full h-full">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lmsy-yellow to-lmsy-blue blur-md opacity-50 animate-pulse" />
                      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-lmsy-yellow to-lmsy-blue flex items-center justify-center">
                        <span className="text-3xl">✨</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Message */}
                  <h3 className="font-serif text-2xl font-bold text-ink mb-4">
                    {language === 'zh' ? '画廊建设中' : language === 'th' ? 'หอศิลป์กำลังสร้าง' : 'Gallery Under Construction'}
                  </h3>
                  <p className="text-ink-2 text-lg mb-6">
                    {language === 'zh'
                      ? '我们正在精心策划每一张照片，敬请期待...'
                      : language === 'th'
                      ? 'เรากำลังคัดสรรภาพถ่ายทุกภาพอย่างพิถีพิถัน อดใจรอสักครู่...'
                      : 'We are carefully curating every photo. Stay tuned...'}
                  </p>

                  {/* Decorative Line */}
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-lmsy-yellow" />
                    <div className="w-2 h-2 rounded-full bg-lmsy-yellow animate-pulse" />
                    <div className="h-px w-16 bg-gradient-to-l from-transparent to-lmsy-blue" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <Lightbox
            image={lightboxImage}
            images={filteredImages}
            onClose={closeLightbox}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
