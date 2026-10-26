/**
 * Portals View
 *
 * Every fixed door on the homepage and the photo behind it. Two families sit
 * here because they are the same decision:
 *   - the five category entries (PORTAL_SLOT, one per HOME_CATEGORIES value)
 *   - the two soul-resonance doors (INTERVIEW_SLOT, `talk` and `live`)
 *
 * An empty door is not broken - it falls back to the cover derived from the
 * projects in that hall. The card says AUTO so "nobody chose one" stays
 * distinguishable from "this was chosen".
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DoorOpen, X } from 'lucide-react';
import Image from 'next/image';
import { getCdnUrl } from '../../utils';
import { VaultImagePicker } from '../vault-image-picker';
import { useAdminHeaders } from '../../hooks/use-admin-headers';
import type { PortalSlotRow } from '../../hooks/use-vault-data';
import type { GalleryItem } from '@/lib/supabase';
import { HOME_CATEGORIES, type ProjectCategory } from '@/lib/category-registry';

interface DoorSlot {
  id: string;
  image_url: string;
  blur_data: string | null;
}

type DoorRef =
  | { kind: 'portal'; category: ProjectCategory }
  | { kind: 'interview'; door: 'talk' | 'live' };

interface PortalsViewProps {
  data: {
    /** Rows already pinned to a door; at most seven, most often fewer. */
    portals: PortalSlotRow[];
  };
  loading: boolean;
}

const INTERVIEW_DOORS: Array<{ door: 'talk' | 'live'; label: string }> = [
  { door: 'talk', label: '对话 / TALK' },
  { door: 'live', label: '直播 / LIVE' },
];

function doorKey(ref: DoorRef): string {
  return ref.kind === 'portal' ? `portal:${ref.category}` : `interview:${ref.door}`;
}

export function PortalsView({ data, loading }: PortalsViewProps) {
  const { portals } = data;
  const authHeaders = useAdminHeaders();
  const [pickerDoor, setPickerDoor] = useState<DoorRef | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Saved doors come straight from the vault rows, which already carry the
  // columns; overrides keep a save visible without reloading the page (a reload
  // re-runs the admin guard and can bounce back to the homepage).
  const [overrides, setOverrides] = useState<Record<string, DoorSlot | null>>({});

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

  const slotFor = (ref: DoorRef): DoorSlot | null => {
    const key = doorKey(ref);
    if (key in overrides) return overrides[key];

    const row =
      ref.kind === 'portal'
        ? portals.find((item) => item.portal_slot === ref.category)
        : portals.find((item) => item.interview_slot === ref.door);

    return row ? { id: row.id, image_url: row.image_url, blur_data: row.blur_data ?? null } : null;
  };

  const writeDoor = async (ref: DoorRef, item: GalleryItem | null) => {
    const current = slotFor(ref);
    const target = item ?? current;
    if (!target) return;

    setBusy(true);
    try {
      const body =
        ref.kind === 'portal'
          ? { imageId: target.id, category: item ? ref.category : null }
          : { imageId: target.id, interview: item ? ref.door : null };

      const response = await fetch('/api/admin/gallery/portal', {
        method: 'PATCH',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to save door image');
      }

      setOverrides((prev) => ({
        ...prev,
        [doorKey(ref)]: item
          ? { id: item.id, image_url: item.image_url, blur_data: item.blur_data ?? null }
          : null,
      }));
      flash(item ? `${doorKey(ref)} 已保存 / SAVED` : `${doorKey(ref)} 已清空 / CLEARED`);
      setPickerDoor(null);
    } catch (err) {
      console.error('[HOME_DOOR] Error:', err);
      alert('Failed to save door image');
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

  const current = pickerDoor ? slotFor(pickerDoor) : null;

  const renderSlot = (ref: DoorRef, label: string, aspect: string, sizes: string) => {
    const slot = slotFor(ref);
    const imageUrl = slot ? getCdnUrl(slot.image_url) : null;

    return (
      <motion.div
        key={doorKey(ref)}
        className={`relative ${aspect} rounded border border-white/10 bg-black/50 overflow-hidden cursor-pointer group`}
        whileHover={{ scale: 1.02, borderColor: 'rgba(251, 191, 36, 0.3)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setPickerDoor(ref)}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={label}
            fill
            className="object-cover"
            sizes={sizes}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2 px-2">
              <DoorOpen className="h-6 w-6 text-ink-2 mx-auto" strokeWidth={1.5} />
              <span className="block text-[10px] font-mono text-ink-2 break-all">{label}</span>
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
            {label}
          </span>
          {slot ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                writeDoor(ref, null);
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
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="border border-lmsy-yellow/20 rounded-lg p-4 bg-lmsy-yellow/5 space-y-5"
      >
        <div className="flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-lmsy-yellow" strokeWidth={1.5} />
          <h3 className="text-sm font-mono text-lmsy-yellow/90 tracking-wider">
            HOMEPAGE_PORTALS
          </h3>
          {note && <span className="text-xs font-mono text-emerald-300/90">{note}</span>}
          <span className="text-xs font-mono text-ink-2 ml-auto">
            SELECT_AN_IMAGE_FOR_EACH_DOOR
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-mono text-ink-2/60 tracking-[0.18em]">
            FIVE_ENTRIES
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {HOME_CATEGORIES.map((definition) =>
              renderSlot(
                { kind: 'portal', category: definition.value },
                definition.value,
                'aspect-[4/5]',
                '(max-width: 768px) 45vw, 180px'
              )
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-mono text-ink-2/60 tracking-[0.18em]">
            SOUL_RESONANCE
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {INTERVIEW_DOORS.map((entry) =>
              renderSlot(
                { kind: 'interview', door: entry.door },
                entry.label,
                'aspect-[16/9]',
                '(max-width: 768px) 90vw, 45vw'
              )
            )}
          </div>
        </div>

        <p className="text-[10px] font-mono text-ink-2/70 leading-relaxed">
          A door with no image falls back to the cover derived from its projects. Pick one here to
          override it, CLEAR to go back to automatic.
        </p>
      </motion.div>

      <VaultImagePicker
        key={pickerDoor ? doorKey(pickerDoor) : 'no-door'}
        open={pickerDoor !== null}
        title={`SET_IMAGE_FOR_${pickerDoor ? doorKey(pickerDoor).toUpperCase() : ''}`}
        subtitle="SELECT_AN_IMAGE_FROM_THE_VAULT"
        currentImageId={current?.id ?? null}
        busy={busy}
        onPick={(item) => pickerDoor && writeDoor(pickerDoor, item)}
        onClose={() => setPickerDoor(null)}
        onClear={current && pickerDoor ? () => writeDoor(pickerDoor, null) : undefined}
      />
    </>
  );
}
