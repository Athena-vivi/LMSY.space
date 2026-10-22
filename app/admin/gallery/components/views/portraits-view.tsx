/**
 * Portraits View
 *
 * Homepage people photos. Same decision type as the year photos and the same
 * vault picker, so it lives in its own tab next to MILESTONES instead of
 * being stacked under that grid.
 *
 * Nothing here guesses a picture: an empty slot stays empty until the curator
 * chooses one, and the saved result is reflected in place (no page reload).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { UserRound, X } from 'lucide-react';
import Image from 'next/image';
import { getCdnUrl } from '../../utils';
import { VaultImagePicker } from '../vault-image-picker';
import { useAdminHeaders } from '../../hooks/use-admin-headers';

interface PortraitRow {
  id: string;
  name: string;
  nickname: string | null;
  slug: string | null;
  avatar_url: string | null;
  role_label: string | null;
}

interface PortraitsViewProps {
  loading: boolean;
}

export function PortraitsView({ loading }: PortraitsViewProps) {
  const authHeaders = useAdminHeaders();
  const [portraits, setPortraits] = useState<PortraitRow[]>([]);
  const [loadingPortraits, setLoadingPortraits] = useState(true);
  const [pickerTarget, setPickerTarget] = useState<PortraitRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    setNote(message);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 3200);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPortraits() {
      try {
        const response = await fetch('/api/admin/people/portrait', {
          headers: await authHeaders(),
          credentials: 'include',
        });
        if (!response.ok) return;
        const json = await response.json();
        if (!cancelled) setPortraits(json.data ?? []);
      } catch (error) {
        console.error('[PORTRAITS] failed to load:', error);
      } finally {
        if (!cancelled) setLoadingPortraits(false);
      }
    }

    loadPortraits();
    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  useEffect(() => {
    return () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, []);

  const setPortrait = async (person: PortraitRow, imageUrl: string | null) => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/people/portrait', {
        method: 'PATCH',
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ profileId: person.id, imageUrl }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to set portrait');
      }

      // Patch the row in place so the card updates immediately and the
      // curator can see that the save worked.
      setPortraits((prev) =>
        prev.map((row) => (row.id === person.id ? { ...row, avatar_url: imageUrl } : row))
      );
      flash(`${person.nickname || person.name} ${imageUrl ? '已保存 / SAVED' : '已清空 / CLEARED'}`);
      setPickerTarget(null);
    } catch (err) {
      console.error('[SET_PORTRAIT] Error:', err);
      alert('Failed to save portrait');
    } finally {
      setBusy(false);
    }
  };

  if (loading || loadingPortraits) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 bg-lmsy-blue/60 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 bg-lmsy-blue/60 animate-pulse" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 bg-lmsy-blue/60 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  const target = pickerTarget;
  const targetUrl = target ? getCdnUrl(target.avatar_url) : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-lg border border-lmsy-blue/20 bg-lmsy-blue/5 p-4"
      >
        <div className="mb-3 flex items-center gap-2">
          <UserRound className="h-4 w-4 text-lmsy-blue" strokeWidth={1.5} />
          <h3 className="font-mono text-sm tracking-wider text-lmsy-blue/90">
            HOMEPAGE_PORTRAITS
          </h3>
          {note && <span className="font-mono text-xs text-emerald-300/90">{note}</span>}
          <span className="ml-auto font-mono text-xs text-ink-2">
            SELECT_A_PORTRAIT_FOR_EACH_PERSON
          </span>
        </div>

        {portraits.length === 0 ? (
          <p className="py-10 text-center font-mono text-xs text-ink-2">NO_PROFILES_FOUND</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {portraits.map((person) => {
              const imageUrl = getCdnUrl(person.avatar_url);
              const displayName = person.nickname || person.name;

              return (
                <div key={person.id} className="space-y-2">
                  <motion.div
                    className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded border border-white/10 bg-black/50"
                    whileHover={{ scale: 1.02, borderColor: 'rgba(56, 189, 248, 0.35)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPickerTarget(person)}
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={displayName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 45vw, 200px"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="space-y-2 text-center">
                          <UserRound className="mx-auto h-6 w-6 text-ink-2" strokeWidth={1.5} />
                          <span className="font-mono text-xs text-ink-2">NO_PORTRAIT</span>
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-6">
                      <span className="block font-mono text-xs text-white/90">
                        {imageUrl ? 'CHANGE_PORTRAIT' : 'SET_PORTRAIT'}
                      </span>
                    </div>

                    {imageUrl && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setPortrait(person, null);
                        }}
                        disabled={busy}
                        className="absolute right-2 top-2 border border-red-400/30 bg-black/70 px-2 py-1 font-mono text-[10px] tracking-wider text-red-300/80 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <span className="inline-flex items-center gap-1">
                          <X className="h-3 w-3" strokeWidth={2} />
                          CLEAR
                        </span>
                      </button>
                    )}
                  </motion.div>

                  <div>
                    <p className="truncate font-serif text-sm text-ink">{displayName}</p>
                    {person.role_label && (
                      <p className="truncate font-mono text-[10px] tracking-wider text-ink-2">
                        {person.role_label.toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <VaultImagePicker
        key={target?.id ?? 'no-target'}
        open={target !== null}
        title={`SET_PORTRAIT_FOR_${(target?.nickname || target?.name || '').toUpperCase()}`}
        subtitle="SELECT_AN_IMAGE_FROM_THE_VAULT"
        currentImageUrl={targetUrl}
        busy={busy}
        onPick={(item) => {
          const url = getCdnUrl(item.image_url);
          if (target && url) setPortrait(target, url);
        }}
        onClose={() => setPickerTarget(null)}
        onClear={targetUrl && target ? () => setPortrait(target, null) : undefined}
      />
    </>
  );
}
