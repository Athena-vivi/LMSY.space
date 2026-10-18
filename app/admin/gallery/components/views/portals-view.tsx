/**
 * Portals View
 *
 * The five fixed homepage doors, and the photo behind each one. Same decision
 * type as the year photos and the portraits: an empty slot stays empty until
 * someone chooses an image, and the result is reflected in place.
 *
 * A door without a pinned image is not broken - it falls back to the cover of
 * the newest public project in that hall. The card says AUTO so the difference
 * between "nobody chose one" and "the curator chose this one" stays visible.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DoorOpen, X } from 'lucide-react';
import Image from 'next/image';
import { getCdnUrl } from '../../utils';
import { VaultImagePicker } from '../vault-image-picker';
import { useAdminHeaders } from '../../hooks/use-admin-headers';
import type { GalleryItem } from '@/lib/supabase';
import { HOME_CATEGORIES, type ProjectCategory } from '@/lib/category-registry';

interface PortalSlot {
  id: string;
  image_url: string;
  blur_data: string | null;
}

interface PortalsViewProps {
  data: {
    gallery: GalleryItem[];
  };
  loading: boolean;
}

export function PortalsView({ data, loading }: PortalsViewProps) {
  const { gallery } = data;
  const authHeaders = useAdminHeaders();
  const [pickerCategory, setPickerCategory] = useState<ProjectCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Saved slots come straight from the vault rows, which already carry the
  // column; overrides keep a save visible without reloading the page (a reload
  // re-runs the admin guard and can bounce back to the homepage).
  const [overrides, setOverrides] = useState<Record<string, PortalSlot | null>>({});

  useEffect(() => {
    return () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, []);

  const flash = useCallback((message: string) => {
    setNote(message);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 3200);
  }, []);

  const slotFor = (category: ProjectCategory): PortalSlot | null => {
    if (category in overrides) return overrides[category];
    const row = gallery.find((item) => item.portal_slot === category);
    return row ? { id: row.id, image_url: row.image_url, blur_data: row.blur_data ?? null } : null;
  };

  const writeSlot = async (category: ProjectCategory, item: GalleryItem | null) => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/gallery/portal', {
        method: 'PATCH',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ imageId: item?.id ?? slotFor(category)?.id, category: item ? category : null }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to save portal image');
      }

      setOverrides((prev) => ({
        ...prev,
        [category]: item
          ? { id: item.id, image_url: item.image_url, blur_data: item.blur_data ?? null }
          : null,
      }));
      flash(item ? `${category} 已保存 / SAVED` : `${category} 已清空 / CLEARED`);
      setPickerCategory(null);
    } catch (err) {
      console.error('[PORTAL_SLOT] Error:', err);
      alert('Failed to save portal image');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 bg-lmsy-yellow/60 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 bg-lmsy-yellow/60 animate-pulse" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 bg-lmsy-yellow/60 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  const current = pickerCategory ? slotFor(pickerCategory) : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="border border-lmsy-yellow/20 rounded-lg p-4 bg-lmsy-yellow/5"
      >
        <div className="flex items-center gap-2 mb-3">
          <DoorOpen className="h-4 w-4 text-lmsy-yellow" strokeWidth={1.5} />
          <h3 className="text-sm font-mono text-lmsy-yellow/90 tracking-wider">
            HOMEPAGE_PORTALS
          </h3>
          {note && <span className="text-xs font-mono text-emerald-300/90">{note}</span>}
          <span className="text-xs font-mono text-ink-2 ml-auto">
            SELECT_AN_IMAGE_FOR_EACH_ENTRY
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {HOME_CATEGORIES.map((definition) => {
            const category = definition.value;
            const slot = slotFor(category);
            const imageUrl = slot ? getCdnUrl(slot.image_url) : null;

            return (
              <motion.div
                key={category}
                className="relative aspect-[4/5] rounded border border-white/10 bg-black/50 overflow-hidden cursor-pointer group"
                whileHover={{ scale: 1.02, borderColor: 'rgba(251, 191, 36, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPickerCategory(category)}
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={category}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 45vw, 180px"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-2 px-2">
                      <DoorOpen className="h-6 w-6 text-ink-2 mx-auto" strokeWidth={1.5} />
                      <span className="block text-[10px] font-mono text-ink-2 break-all">
                        {category}
                      </span>
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-2 right-2 text-center">
                    <span className="text-xs font-mono text-ink-2 tracking-wider">
                      {imageUrl ? 'CHANGE_IMAGE' : 'SET_IMAGE'}
                    </span>
                  </div>
                </div>

                <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
                  <span className="px-2 py-1 bg-black/70 border border-white/15 text-ink-2 text-[10px] font-mono tracking-wider">
                    {category}
                  </span>
                  {slot ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        writeSlot(category, null);
                      }}
                      disabled={busy}
                      className="px-2 py-1 bg-black/70 border border-red-400/30 text-red-300/80 text-[10px] font-mono tracking-wider hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="inline-flex items-center gap-1">
                        <X className="h-3 w-3" strokeWidth={2} />
                        CLEAR
                      </span>
                    </button>
                  ) : (
                    <span className="px-2 py-1 bg-black/70 border border-white/10 text-ink-2/70 text-[10px] font-mono tracking-wider">
                      AUTO
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        <p className="mt-3 text-[10px] font-mono text-ink-2/70 leading-relaxed">
          A door with no image uses the cover of the newest project in that hall. Pick one here to
          override it, CLEAR to go back to automatic.
        </p>
      </motion.div>

      <VaultImagePicker
        key={pickerCategory ?? 'no-category'}
        open={pickerCategory !== null}
        title={`SET_PORTAL_FOR_${pickerCategory ?? ''}`}
        subtitle="SELECT_AN_IMAGE_FROM_THE_VAULT"
        images={gallery}
        currentImageId={current?.id ?? null}
        busy={busy}
        onPick={(item) => pickerCategory && writeSlot(pickerCategory, item)}
        onClose={() => setPickerCategory(null)}
        onClear={current && pickerCategory ? () => writeSlot(pickerCategory, null) : undefined}
      />
    </>
  );
}
