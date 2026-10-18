/**
 * Milestones View
 *
 * Homepage year photos: one image per year, chosen by hand from the vault.
 * Portraits live in their own tab (portraits-view.tsx) because they are a
 * different slot type and should not push this grid down the page.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Calendar, X } from 'lucide-react';
import Image from 'next/image';
import { getCdnUrl } from '../../utils';
import { YEARS } from '../../constants';
import { VaultImagePicker } from '../vault-image-picker';
import { useAdminHeaders } from '../../hooks/use-admin-headers';
import type { MilestoneImage } from '../../hooks/use-vault-data';
import type { GalleryItem } from '@/lib/supabase';

interface MilestonesViewProps {
  data: {
    milestones: Record<string, MilestoneImage>;
    gallery: GalleryItem[];
  };
  loading: boolean;
}

export function MilestonesView({ data, loading }: MilestonesViewProps) {
  const { milestones, gallery } = data;
  const authHeaders = useAdminHeaders();
  const [pickerYear, setPickerYear] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reflect a save immediately instead of reloading the page: a reload
  // re-runs the admin guard and can bounce back to the homepage before the
  // curator can see the result.
  const [overrides, setOverrides] = useState<Record<string, MilestoneImage | null>>({});

  const milestoneFor = useCallback(
    (year: string): MilestoneImage | null => {
      if (year in overrides) return overrides[year];
      return milestones[year] ?? null;
    },
    [milestones, overrides]
  );

  useEffect(() => {
    return () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, []);

  const flash = (message: string) => {
    setNote(message);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 3200);
  };

  const setMilestone = async (item: GalleryItem, year: string) => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/gallery/milestone', {
        method: 'PATCH',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ imageId: item.id, year }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to set milestone');
      }

      setOverrides((prev) => ({
        ...prev,
        [year]: {
          id: item.id,
          image_url: item.image_url,
          year,
          caption: item.caption ?? null,
          tag: item.tag ?? null,
        },
      }));
      flash(`${year} 已保存 / SAVED`);
      setPickerYear(null);
    } catch (err) {
      console.error('[SET_MILESTONE] Error:', err);
      alert('Failed to set milestone');
    } finally {
      setBusy(false);
    }
  };

  const clearMilestone = async (year: string, imageId: string) => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/gallery/milestone', {
        method: 'PATCH',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ imageId, year: null }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to clear milestone');
      }

      setOverrides((prev) => ({ ...prev, [year]: null }));
      flash(`${year} 已清空 / CLEARED`);
      setPickerYear(null);
    } catch (err) {
      console.error('[CLEAR_MILESTONE] Error:', err);
      alert('Failed to clear milestone');
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

  const current = pickerYear ? milestoneFor(pickerYear) : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="border border-lmsy-yellow/20 rounded-lg p-4 bg-lmsy-yellow/5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-lmsy-yellow" strokeWidth={1.5} />
          <h3 className="text-sm font-mono text-lmsy-yellow/90 tracking-wider">
            HOMEPAGE_MILESTONES
          </h3>
          {note && (
            <span className="text-xs font-mono text-emerald-300/90">{note}</span>
          )}
          <span className="text-xs font-mono text-ink-2 ml-auto">
            SELECT_IMAGES_FOR_EACH_YEAR
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
          {YEARS.map((year) => {
            const milestone = milestoneFor(year);
            const imageUrl = milestone ? getCdnUrl(milestone.image_url) : null;

            return (
              <motion.div
                key={year}
                className="relative aspect-[3/4] rounded border border-white/10 bg-black/50 overflow-hidden cursor-pointer group"
                whileHover={{ scale: 1.02, borderColor: 'rgba(251, 191, 36, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPickerYear(year)}
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={`${year} milestone`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 30vw, 150px"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Star className="h-6 w-6 text-ink-2 mx-auto" strokeWidth={1.5} />
                      <span className="text-xs font-mono text-ink-2">{year}</span>
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
                {milestone && (
                  <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
                    <span className="px-2 py-1 bg-lmsy-yellow/20 border border-lmsy-yellow/40 text-lmsy-yellow/90 text-[10px] font-mono tracking-wider">
                      {year}
                    </span>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        clearMilestone(year, milestone.id);
                      }}
                      disabled={busy}
                      className="px-2 py-1 bg-black/70 border border-red-400/30 text-red-300/80 text-[10px] font-mono tracking-wider hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="inline-flex items-center gap-1">
                        <X className="h-3 w-3" strokeWidth={2} />
                        CLEAR
                      </span>
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <VaultImagePicker
        key={pickerYear ?? 'no-year'}
        open={pickerYear !== null}
        title={`SET_MILESTONE_FOR_${pickerYear ?? ''}`}
        subtitle="SELECT_AN_IMAGE_FROM_THE_VAULT"
        images={gallery}
        currentImageId={current?.id ?? null}
        busy={busy}
        onPick={(item) => pickerYear && setMilestone(item, pickerYear)}
        onClose={() => setPickerYear(null)}
        onClear={
          current && pickerYear
            ? () => clearMilestone(pickerYear, current.id)
            : undefined
        }
      />
    </>
  );
}
