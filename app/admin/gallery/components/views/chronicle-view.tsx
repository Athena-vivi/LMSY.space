'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Eye, EyeOff, ExternalLink, Loader2, Edit2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getCdnUrl, groupEventsByYear, formatShortDate } from '../../utils';
import type { ChronicleEvent } from '../../hooks/use-vault-data';
import { EditModal } from '@/app/admin/drafts/components/modals/edit-modal';
import { normalizeLocalizedText } from '@/lib/localized-content';
import { translateFieldMap, type AdminTranslateTarget } from '@/lib/admin-translate';

interface DraftFormState {
  title: { en: string; zh: string; th: string };
  description: { en: string; zh: string; th: string };
  tags: string[];
  is_featured: boolean;
  event_date: string;
  chronicle_visible: boolean;
  chronicle_title: { en: string; zh: string; th: string };
  chronicle_excerpt: { en: string; zh: string; th: string };
}

interface ChronicleDraft {
  id: string;
  r2_media_url: string | null;
  media_type: 'image' | 'video';
  title: { en?: string; zh?: string; th?: string };
  description: { en?: string; zh?: string; th?: string };
  tags: string[];
  is_featured: boolean;
  event_date: string | null;
  chronicle_visible?: boolean;
  chronicle_title?: string | null;
  chronicle_title_i18n?: { en?: string; zh?: string; th?: string } | null;
  chronicle_excerpt?: string | null;
  chronicle_excerpt_i18n?: { en?: string; zh?: string; th?: string } | null;
}

const emptyFormState: DraftFormState = {
  title: { en: '', zh: '', th: '' },
  description: { en: '', zh: '', th: '' },
  tags: [],
  is_featured: false,
  event_date: '',
  chronicle_visible: true,
  chronicle_title: { en: '', zh: '', th: '' },
  chronicle_excerpt: { en: '', zh: '', th: '' },
};

function buildDraftPayload(form: DraftFormState) {
  return {
    ...form,
    chronicle_title: form.chronicle_title.en || form.chronicle_title.zh || form.chronicle_title.th || '',
    chronicle_excerpt: form.chronicle_excerpt.en || form.chronicle_excerpt.zh || form.chronicle_excerpt.th || '',
    chronicle_title_i18n: form.chronicle_title,
    chronicle_excerpt_i18n: form.chronicle_excerpt,
  };
}

interface ChronicleViewProps {
  data: {
    events: ChronicleEvent[];
  };
  loading: boolean;
}

export function ChronicleView({ data, loading }: ChronicleViewProps) {
  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ChronicleDraft | null>(null);
  const [editForm, setEditForm] = useState<DraftFormState>(emptyFormState);
  const [translating, setTranslating] = useState(false);
  const groupedEvents = useMemo(() => groupEventsByYear(data.events), [data.events]);

  const toggleVisibility = async (event: ChronicleEvent) => {
    setVisibilityUpdatingId(event.id);

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
      setVisibilityUpdatingId(null);
    }
  };

  const openEditModal = async (event: ChronicleEvent) => {
    setEditingId(event.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/drafts/${event.id}`, {
        credentials: 'include',
        headers,
      });
      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Failed to load draft');
      }

      const draft = result.data as ChronicleDraft;
      setEditingItem(draft);
      setEditForm({
        title: {
          en: draft.title?.en || '',
          zh: draft.title?.zh || '',
          th: draft.title?.th || '',
        },
        description: {
          en: draft.description?.en || '',
          zh: draft.description?.zh || '',
          th: draft.description?.th || '',
        },
        tags: draft.tags || [],
        is_featured: draft.is_featured || false,
        event_date: draft.event_date || '',
        chronicle_visible: draft.chronicle_visible ?? true,
        chronicle_title: normalizeLocalizedText(draft.chronicle_title_i18n, draft.chronicle_title || ''),
        chronicle_excerpt: normalizeLocalizedText(draft.chronicle_excerpt_i18n, draft.chronicle_excerpt || ''),
      });
    } catch (error) {
      console.error('[CHRONICLE_VIEW] Failed to open edit modal:', error);
      alert(error instanceof Error ? error.message : 'Failed to load Chronicle item');
    } finally {
      setEditingId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    setEditingId(editingItem.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/drafts/${editingItem.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(buildDraftPayload(editForm)),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update Chronicle item');
      }

      setEditingItem(null);
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update Chronicle item');
    } finally {
      setEditingId(null);
    }
  };

  const handleTranslate = async (targetLang: AdminTranslateTarget) => {
    const hasEnglishSource =
      !!editForm.title.en.trim() ||
      !!editForm.description.en.trim() ||
      !!editForm.chronicle_title.en.trim() ||
      !!editForm.chronicle_excerpt.en.trim();

    if (!hasEnglishSource) {
      alert('Please enter English content first.');
      return;
    }

    setTranslating(true);
    try {
      const translated = await translateFieldMap(
        {
          title: editForm.title.en,
          description: editForm.description.en,
          chronicleTitle: editForm.chronicle_title.en,
          chronicleExcerpt: editForm.chronicle_excerpt.en,
        },
        targetLang,
        {
          title: 'title',
          description: 'description',
          chronicleTitle: 'title',
          chronicleExcerpt: 'description',
        }
      );

      setEditForm((prev) => ({
        ...prev,
        title: { ...prev.title, [targetLang]: translated.title || '' },
        description: { ...prev.description, [targetLang]: translated.description || '' },
        chronicle_title: { ...prev.chronicle_title, [targetLang]: translated.chronicleTitle || '' },
        chronicle_excerpt: { ...prev.chronicle_excerpt, [targetLang]: translated.chronicleExcerpt || '' },
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Translation failed');
    } finally {
      setTranslating(false);
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

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {events.map((event, index) => {
                const imageUrl = getCdnUrl(event.image_url || null);
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="grid grid-cols-1 gap-5 rounded-lg border border-white/5 bg-white/[0.02] p-4 md:grid-cols-[220px_minmax(0,1fr)]"
                  >
                    <div>
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

                    <div className="min-w-0">
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
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => openEditModal(event)}
                            disabled={editingId === event.id}
                            className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-[10px] font-mono text-white/50 transition-colors hover:border-lmsy-blue/30 hover:text-lmsy-blue/80 disabled:opacity-50"
                          >
                            {editingId === event.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                            ) : (
                              <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            )}
                            EDIT
                          </button>
                          <button
                            onClick={() => toggleVisibility(event)}
                            disabled={visibilityUpdatingId === event.id}
                            className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-[10px] font-mono text-white/50 transition-colors hover:border-lmsy-yellow/30 hover:text-lmsy-yellow/80 disabled:opacity-50"
                          >
                            {visibilityUpdatingId === event.id ? (
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
                        {event.description && (
                          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

      <EditModal
        editingItem={editingItem ? {
          id: editingItem.id,
          r2_media_url: editingItem.r2_media_url,
          media_type: editingItem.media_type,
        } : null}
        editForm={editForm}
        setEditForm={setEditForm}
        translating={translating}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
        onTranslate={handleTranslate}
      />
    </div>
  );
}
