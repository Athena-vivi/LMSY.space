'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Eye, EyeOff, ExternalLink, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCdnUrl, groupEventsByYear, formatShortDate } from '../../utils';
import type { ChronicleEvent } from '../../hooks/use-vault-data';

interface ChronicleViewProps {
  data: {
    events: ChronicleEvent[];
  };
  loading: boolean;
}

export function ChronicleView({ data, loading }: ChronicleViewProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const groupedEvents = useMemo(() => groupEventsByYear(data.events), [data.events]);

  const toggleVisibility = async (event: ChronicleEvent) => {
    setUpdatingId(event.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/drafts/${event.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          chronicle_visible: !event.chronicle_visible,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update chronicle visibility');
      }

      window.location.reload();
    } catch (error) {
      console.error('[CHRONICLE_VIEW] Toggle visibility failed:', error);
      alert('Failed to update Chronicle visibility');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-lmsy-yellow/60" />
      </div>
    );
  }

  if (data.events.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 py-20 text-center">
        <Calendar className="mx-auto mb-4 h-12 w-12 text-white/10" strokeWidth={1.5} />
        <p className="text-sm text-white/40">No published Chronicle items yet.</p>
        <p className="mt-2 text-xs font-mono text-white/20">Publish items from Draft Inbox first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {Object.entries(groupedEvents)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([year, events]) => (
          <div key={year} className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="font-serif text-5xl font-light text-white/20">{year}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-lmsy-yellow/30 to-transparent" />
            </div>

            <div className="space-y-4">
              {events.map((event, index) => {
                const imageUrl = getCdnUrl(event.image_url || null);
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="grid grid-cols-12 gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-4"
                  >
                    <div className="col-span-12 md:col-span-2">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-white/5">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={event.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/20">
                            NO_IMAGE
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-span-12 flex flex-col justify-between md:col-span-7">
                      <div>
                        <div className="mb-2 flex items-center gap-3">
                          <span className="text-[10px] font-mono text-white/30">
                            {formatShortDate(event.event_date)}
                          </span>
                          <span className={`rounded border px-2 py-1 text-[10px] font-mono ${
                            event.chronicle_visible
                              ? 'border-lmsy-yellow/30 text-lmsy-yellow/80'
                              : 'border-white/10 text-white/35'
                          }`}>
                            {event.chronicle_visible ? 'VISIBLE' : 'HIDDEN'}
                          </span>
                        </div>
                        <h3 className="font-serif text-xl text-white/85">{event.title}</h3>
                        {event.description && (
                          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="col-span-12 flex items-start justify-end gap-2 md:col-span-3">
                      <button
                        onClick={() => toggleVisibility(event)}
                        disabled={updatingId === event.id}
                        className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-[10px] font-mono text-white/50 transition-colors hover:border-lmsy-yellow/30 hover:text-lmsy-yellow/80 disabled:opacity-50"
                      >
                        {updatingId === event.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                        ) : event.chronicle_visible ? (
                          <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                        ) : (
                          <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                        {event.chronicle_visible ? 'HIDE' : 'SHOW'}
                      </button>

                      <Link
                        href="/admin/drafts"
                        className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-[10px] font-mono text-white/50 transition-colors hover:border-lmsy-blue/30 hover:text-lmsy-blue/80"
                      >
                        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                        OPEN_DRAFTS
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
