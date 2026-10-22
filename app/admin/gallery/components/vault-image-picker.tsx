/**
 * Vault Image Picker
 *
 * Shared by every "pick an image for this fixed slot" flow in Asset Vault
 * (homepage doors, homepage years, homepage portraits).
 *
 * By default the list is searched and paged by the server
 * (/api/admin/vault/assets); the picker used to receive the whole vault as a
 * prop, which meant every visit to a tab downloaded every asset first.
 *
 * Callers that already hold the exact set to choose from - the curation page
 * only offers the pictures of one node - pass `images` instead, and the picker
 * filters that array in memory.
 *
 * Thumbnails use a fixed height instead of an aspect ratio: `Image fill`
 * contributes no intrinsic height, so an aspect-ratio box could collapse and
 * let the photos overlap each other. A definite height cannot collapse.
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, X } from 'lucide-react';
import Image from 'next/image';
import type { GalleryItem } from '@/lib/supabase';
import { getCdnUrl } from '../utils';
import { useVaultAssets } from '../hooks/use-vault-assets';

/** Typing pauses this long before the search is applied. */
const QUERY_DEBOUNCE_MS = 280;
/** Rows per page when the caller supplies its own list. */
const LOCAL_PAGE_SIZE = 48;

interface VaultImagePickerProps {
  open: boolean;
  /** Mono headline, e.g. SET_PORTRAIT_FOR_SONYA */
  title: string;
  /** Mono subline under the headline */
  subtitle: string;
  /**
   * A fixed set to choose from. Omit it to search the whole vault, which is
   * paged by the server.
   */
  images?: GalleryItem[];
  /** Gallery id that is currently stored for this slot, when known */
  currentImageId?: string | null;
  /** Stored URL, used for portrait slots which only keep a URL */
  currentImageUrl?: string | null;
  busy?: boolean;
  onPick: (item: GalleryItem) => void;
  onClose: () => void;
  /** Renders a CLEAR button when the slot can be emptied */
  onClear?: () => void;
}

export function VaultImagePicker({
  open,
  title,
  subtitle,
  images,
  currentImageId,
  currentImageUrl,
  busy = false,
  onPick,
  onClose,
  onClear,
}: VaultImagePickerProps) {
  const usingLocal = images !== undefined;
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(LOCAL_PAGE_SIZE);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Debounce the search so a typed word is one request, not one per letter.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(query.trim()), QUERY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Rows are fetched only while the dialog is up, and never when the caller
  // already handed us the exact set.
  const assets = useVaultAssets({ q: term, tag: '', enabled: open && !usingLocal });

  const localFiltered = useMemo(() => {
    if (!usingLocal) return [];
    const needle = term.toLowerCase();
    if (!needle) return images;
    return images.filter((item) => {
      const haystack = [item.caption, item.catalog_id, item.tag, item.project_id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [usingLocal, images, term]);

  const visible = usingLocal ? localFiltered.slice(0, visibleCount) : assets.rows;
  const hasMore = usingLocal ? visibleCount < localFiltered.length : assets.nextCursor !== null;
  const remaining = usingLocal
    ? localFiltered.length - visibleCount
    : assets.total - assets.rows.length;
  const loadingMore = usingLocal ? false : assets.loadingMore;
  const loadingFirstPage = usingLocal ? false : assets.loading && assets.rows.length === 0;
  const loadMore = () => {
    if (usingLocal) setVisibleCount((count) => count + LOCAL_PAGE_SIZE);
    else assets.loadMore();
  };

  // Escape and scroll lock are external-system syncs. This effect deliberately
  // sets no state: the search term is left as the curator typed it, so
  // reopening the picker for another slot keeps the same filter in view.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const noMatch = !loadingFirstPage && visible.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[71] flex items-center justify-center p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-lmsy-yellow/30 bg-black"
            >
              {/* Header */}
              <div className="flex items-start gap-4 border-b border-white/10 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <h2 className="mb-1 truncate font-serif text-xl text-lmsy-yellow/90">{title}</h2>
                  <p className="truncate font-mono text-xs text-ink-2">{subtitle}</p>
                </div>

                <div className="relative w-36 shrink-0 sm:w-56">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-2"
                    strokeWidth={1.5}
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="SEARCH_VAULT..."
                    className="w-full rounded border border-white/10 bg-white/5 py-1.5 pl-8 pr-2 font-mono text-xs text-ink outline-none placeholder:text-ink-2 focus:border-lmsy-yellow/40"
                  />
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close picker"
                  title="Close (Esc)"
                  className="shrink-0 rounded border border-white/15 p-2 text-ink-2 transition-colors hover:border-white/40 hover:text-ink"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              {/* Grid */}
              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {noMatch ? (
                  <p className="py-16 text-center font-mono text-xs text-ink-2">
                    {term ? 'NO_IMAGES_MATCH' : 'VAULT_EMPTY'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {visible.map((item) => {
                      const imageUrl = getCdnUrl(item.image_url);
                      if (!imageUrl) return null;
                      const isCurrent =
                        (currentImageId ? currentImageId === item.id : false) ||
                        (currentImageUrl ? currentImageUrl === imageUrl : false);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onPick(item)}
                          disabled={busy}
                          className={`group relative block w-full overflow-hidden rounded border-2 transition-colors disabled:cursor-wait disabled:opacity-60 ${
                            isCurrent
                              ? 'border-lmsy-yellow'
                              : 'border-white/10 hover:border-white/40'
                          }`}
                        >
                          {/* Fixed height: the image cannot overlap the next row */}
                          <div className="relative h-40 w-full bg-white/5">
                            <Image
                              src={imageUrl}
                              alt={item.caption || 'Gallery image'}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
                              unoptimized
                            />
                          </div>
                          {isCurrent && (
                            <span className="absolute left-2 top-2 rounded bg-black/70 p-1">
                              <Star
                                className="h-4 w-4 fill-lmsy-yellow text-lmsy-yellow"
                                strokeWidth={2}
                              />
                            </span>
                          )}
                          {item.caption && (
                            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 to-transparent px-2 pb-1.5 pt-5 text-left font-mono text-[10px] text-white/85">
                              {item.caption}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {hasMore && (
                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded border border-white/15 px-4 py-1.5 font-mono text-[11px] tracking-wider text-ink-2 transition-colors hover:border-white/40 hover:text-ink disabled:cursor-wait disabled:opacity-50"
                    >
                      {loadingMore
                        ? 'LOADING...'
                        : `LOAD_MORE (${Math.max(0, remaining)} LEFT)`}
                    </button>
                  </div>
                )}

                {assets.error && (
                  <p className="pt-4 text-center font-mono text-[11px] text-red-300/80">
                    {assets.error}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 border-t border-white/10 px-5 py-3">
                <span className="font-mono text-[11px] text-ink-2">
                  {loadingFirstPage
                    ? 'LOADING...'
                    : usingLocal
                      ? `${localFiltered.length} IMAGES`
                      : `${assets.rows.length} / ${assets.total} IMAGES`}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {onClear && (
                    <button
                      type="button"
                      onClick={onClear}
                      disabled={busy}
                      className="rounded border border-red-400/30 px-3 py-1.5 font-mono text-[11px] tracking-wider text-red-300/80 transition-colors hover:bg-red-500/10 disabled:opacity-30"
                    >
                      CLEAR_SLOT
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded border border-white/15 px-3 py-1.5 font-mono text-[11px] tracking-wider text-ink-2 transition-colors hover:border-white/40 hover:text-ink"
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
