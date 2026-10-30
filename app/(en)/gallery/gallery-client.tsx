'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/components/language-provider';
import { MediaPlate } from '@/components/ui/media-plate';
import { t } from '@/lib/languages';
import { supabase, type GalleryItem } from '@/lib/supabase';
import {
  fetchGalleryPage,
  fetchProjectRefs,
  PAGE_SIZE,
  UNTAGGED,
  type ProjectRef,
} from '@/lib/gallery-data';
import Lightbox from './lightbox';
import { PageIntro } from '@/components/page-intro';
import { getImageUrl } from '@/lib/image-url';
import { getAssetDimensions, FALLBACK_ASPECT_RATIO } from '@/lib/image-dimensions';
import { getLocalizedText } from '@/lib/localized-content';
import { formatDisplayDate } from '@/lib/display-date';
import { assetTagLabelKey } from '@/lib/category-meta';

const gradients = [
  'from-lmsy-yellow/20 to-lmsy-yellow/5',
  'from-lmsy-blue/20 to-lmsy-blue/5',
  'from-purple-500/20 to-purple-500/5',
  'from-pink-500/20 to-pink-500/5',
  'from-amber-500/20 to-amber-500/5',
];

const GRID_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

/**
 * Gallery grid, hydrated from the SSR first page. Everything interactive
 * (tag filter, load-more, lightbox, search-anchor deep links) lives here; the
 * initial data comes from the server page as props, so the first screen is
 * real content in the HTML — not a loading skeleton.
 */
export default function GalleryClient({
  initialImages,
  initialProjectMap,
  initialHasMore,
  projectIds,
}: {
  initialImages: GalleryItem[];
  initialProjectMap: Record<string, ProjectRef>;
  initialHasMore: boolean;
  projectIds: string[];
}) {
  const [images, setImages] = useState<GalleryItem[]>(initialImages);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [lightboxImage, setLightboxImage] = useState<GalleryItem | null>(null);
  const [projectMap, setProjectMap] = useState<Record<string, ProjectRef>>(initialProjectMap);
  // Search results link to /gallery#<asset-id>; remember the anchor so the
  // grid can auto-load pages until the target image is present, then scroll.
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  const selectedTagRef = useRef(selectedTag);
  const { language } = useLanguage();

  useEffect(() => {
    selectedTagRef.current = selectedTag;
  }, [selectedTag]);

  // Hash navigation can happen after this client page has already mounted
  // (for example, selecting a search result while already on /gallery).
  // Listen for those changes, reset a restrictive tag filter, then let the
  // paging effect load until the asset uuid becomes available.
  useEffect(() => {
    const syncAnchorFromHash = () => {
      const hash = window.location.hash;
      if (!hash || hash.length <= 1) return;
      if (selectedTagRef.current !== 'All') {
        setLoading(true);
        setSelectedTag('All');
      }
      setPendingAnchor(decodeURIComponent(hash.slice(1)));
    };

    syncAnchorFromHash();
    window.addEventListener('hashchange', syncAnchorFromHash);
    return () => window.removeEventListener('hashchange', syncAnchorFromHash);
  }, []);

  const mergeProjectRefs = useCallback(async (rows: GalleryItem[]) => {
    const missing = rows
      .map((r) => r.project_id)
      .filter((id): id is string => Boolean(id));
    if (missing.length === 0) return;
    const refs = await fetchProjectRefs(supabase, missing);
    if (Object.keys(refs).length > 0) {
      setProjectMap((prev) => ({ ...prev, ...refs }));
    }
  }, []);

  // Reload from the first page whenever the filter changes (filtering happens
  // in the database, not on a fully-loaded client array). The very first run
  // is skipped: the server page already rendered page 0 of the 'All' filter,
  // so reloading it on mount would flash a skeleton over real content.
  const skipInitialReload = useRef(true);
  useEffect(() => {
    if (skipInitialReload.current) {
      skipInitialReload.current = false;
      return;
    }
    if (projectIds.length === 0) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const { rows, failed } = await fetchGalleryPage(supabase, 0, selectedTag, projectIds);
        if (!active) return;
        setImages(rows);
        setHasMore(!failed && rows.length === PAGE_SIZE);
        mergeProjectRefs(rows);
      } catch {
        if (active) setImages([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedTag, projectIds, mergeProjectRefs]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || projectIds.length === 0) return;
    setLoadingMore(true);
    try {
      const { rows, failed } = await fetchGalleryPage(supabase, images.length, selectedTag, projectIds);
      setImages((prev) => [...prev, ...rows]);
      setHasMore(!failed && rows.length === PAGE_SIZE);
      mergeProjectRefs(rows);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, images.length, selectedTag, projectIds, mergeProjectRefs]);

  // Resolve /gallery#<id> anchors (search results deep-link here): scroll to
  // the target once it is rendered. If it is on a not-yet-loaded page, keep
  // calling loadMore until it shows up or the grid is exhausted (the anchor
  // may also point at an asset excluded by the active tag filter - then it is
  // silently dropped). The effect runs once per images/anchor state change.
  useEffect(() => {
    if (!pendingAnchor || loading) return;
    const el = document.getElementById(pendingAnchor);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPendingAnchor(null);
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      return;
    }
    if (!hasMore) {
      setPendingAnchor(null);
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      return;
    }
    if (!loadingMore) {
      loadMore();
    }
  }, [pendingAnchor, loading, hasMore, loadingMore, images, loadMore]);

  // Tag buttons must match tag values that actually exist in the database
  // (audit P1-3). Distribution across publicly visible projects: Magazine 237,
  // Advertising 54, STAGE 12, STILL 9, Telegram 3, untagged 15. "Telegram" is
  // ingest-source metadata rather than a content category, so it is not
  // offered as a user-facing filter.
  const tags = [
    { key: 'gallery.tagAll', value: 'All' },
    { key: 'gallery.tagMagazine', value: 'Magazine' },
    { key: 'gallery.tagAdvertising', value: 'Advertising' },
    { key: 'gallery.tagStage', value: 'STAGE' },
    { key: 'gallery.tagStill', value: 'STILL' },
    { key: 'gallery.tagUntagged', value: UNTAGGED },
  ] as const;

  const filteredImages = images;

  const openLightbox = useCallback((image: GalleryItem) => {
    setLightboxImage(image);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

  return (
    <div className="min-h-screen">
      <PageIntro
        title={t(language, 'gallery.title')}
        description={t(language, 'gallery.description')}
      />

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
                    ? 'bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-black border-transparent shadow-lg shadow-lmsy-yellow/20'
                    : 'bg-muted text-ink-2 border-border hover:border-lmsy-blue hover:text-lmsy-blue'
                }`}
              >
                #{t(language, tag.key)}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Loading State (filter switches only — the first screen is SSR) */}
      {loading && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <MediaPlate
                key={i}
                className="aspect-[3/4] animate-pulse rounded-lg"
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
                  // orientation as-is (no w/h swap) - rotation is not passed.
                  const dimensions = getAssetDimensions({
                    image_url: item.image_url,
                    width: item.width,
                    height: item.height,
                  });
                  // Cap the stagger: with the full set this expression used to
                  // grow to ~16s (index * 0.05 for 330 items).
                  const revealDelay = Math.min(index, 12) * 0.03;

                  return (
                    <motion.div
                      key={item.id}
                      id={item.id}
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

                        {/* 📖 Project name + date - the visitor-facing label.
                            Phase 7: the internal catalog_id is no longer the
                            most prominent thing on every card; it stays in the
                            lightbox detail where it is actually useful. Both
                            values here are real columns - when a project has no
                            event date, only the name is shown. */}
                        <div className="absolute bottom-2 right-2 text-right">
                          {item.project_id && projectMap[item.project_id] && (
                            <span className="block max-w-[60vw] truncate text-[10px] font-medium text-white/85">
                              {getLocalizedText(
                                projectMap[item.project_id].title_i18n as never,
                                language,
                                projectMap[item.project_id].title
                              )}
                            </span>
                          )}
                          {item.event_date && (
                            <span
                              className="block text-[10px] font-mono tracking-wide text-white/55"
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {formatDisplayDate(item.event_date, language)}
                            </span>
                          )}
                        </div>

                        {/* 🏷️ Tag Badge - Top Left. Same i18n keys as the filter
                            chips above, so the badge never contradicts them. */}
                        {item.tag && (
                          <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="px-3 py-1 text-xs font-medium bg-black/50 backdrop-blur-sm rounded-full text-ink border border-white/10">
                              #{assetTagLabelKey(item.tag) ? t(language, assetTagLabelKey(item.tag)!) : item.tag}
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
                    ? t(language, 'common.loading')
                    : t(language, 'common.loadMore')}
                </button>
              </div>
            )}

            {/* Empty state: two different truths, stated plainly. The previous
                copy claimed the gallery was still being built even when the
                only reason for an empty grid was the active tag filter. */}
            {filteredImages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-24"
              >
                <div className="max-w-md mx-auto">
                  <div className="relative mx-auto mb-6 h-16 w-16">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lmsy-yellow/30 to-lmsy-blue/30 blur-md" />
                    <div className="relative flex h-full w-full items-center justify-center rounded-full border border-border bg-card">
                      <ZoomIn className="h-6 w-6 text-ink-2" strokeWidth={1.5} />
                    </div>
                  </div>

                  <h3 className="mb-3 font-serif text-2xl font-bold text-ink">
                    {selectedTag === 'All'
                      ? t(language, 'gallery.emptyAll')
                      : t(language, 'gallery.emptyFiltered')}
                  </h3>

                  {selectedTag !== 'All' && (
                    <button
                      onClick={() => setSelectedTag('All')}
                      className="mt-2 rounded-full border border-border bg-muted px-5 py-2 text-xs uppercase tracking-[0.2em] text-ink-2 transition-colors hover:border-lmsy-blue hover:text-lmsy-blue"
                    >
                      {t(language, 'gallery.resetFilter')}
                    </button>
                  )}
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
            key={lightboxImage.id}
            image={lightboxImage}
            images={filteredImages}
            project={lightboxImage.project_id ? projectMap[lightboxImage.project_id] ?? null : null}
            onClose={closeLightbox}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
