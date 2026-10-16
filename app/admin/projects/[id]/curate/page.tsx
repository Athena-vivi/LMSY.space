'use client';

import { use, useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  GripVertical,
  RotateCcw,
  RotateCw,
  Trash2,
  Star,
  Unlink,
  Edit2,
  Send,
  Clock,
} from 'lucide-react';
import { useAdminLang } from '@/lib/admin-i18n';
import Image from 'next/image';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getImageUrl } from '@/lib/image-url';
import { supabase, type Project } from '@/lib/supabase';
import EditProjectModal from '../../_components/edit-project-modal';

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string;
  catalog_id: string;
  sequence?: number;
  created_at?: string;
  is_cover?: boolean | null;
  rotation?: number | null;
  source_url?: string | null;
  source_platform?: string | null;
}

interface DraftImage {
  id: string;
  r2_media_url: string;
  title: { en?: string | null; zh?: string | null; th?: string | null } | null;
  status: string;
  event_date: string | null;
  media_type: string | null;
  source_url: string | null;
  source_platform: string | null;
  source_account: string | null;
  created_at: string;
}

interface ProjectRow extends Project {
  catalog_id: string;
}

function draftTitle(t: DraftImage['title']): string {
  if (!t) return 'Untitled draft';
  return t.en || t.zh || t.th || 'Untitled draft';
}

// ============================= Sortable published asset =============================
function SortableImage({
  image,
  index,
  onRotate,
  onDelete,
  onSetCover,
}: {
  image: GalleryImage;
  index: number;
  onRotate: (image: GalleryImage, direction: 'left' | 'right') => void;
  onDelete: (image: GalleryImage) => void;
  onSetCover: (image: GalleryImage) => void;
}) {
  const { t } = useAdminLang();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCover = Boolean(image.is_cover || image.catalog_id?.endsWith('-000'));
  const imageUrl = getImageUrl(image.image_url);

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-2 z-10 p-2 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-white/60" strokeWidth={1.5} />
      </div>

      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-white/5 transition-all duration-200">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={image.caption || `Gallery ${index + 1}`}
            fill
            className="object-contain bg-black/40 p-2"
            style={{ transform: `rotate(${image.rotation ?? 0}deg)` }}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
            <span className="text-[10px] font-mono text-white/65 tracking-wider">
              MISSING_IMAGE_URL
            </span>
          </div>
        )}

        {/* Cover Badge */}
        {isCover && (
          <div className="absolute top-2 right-2 px-3 py-1 bg-lmsy-yellow/20 backdrop-blur-sm border border-lmsy-yellow/40 rounded-full">
            <span className="text-[10px] font-mono font-bold text-lmsy-yellow tracking-wider">
              COVER
            </span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Catalog ID + actions */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-mono text-white/60 tracking-wider flex items-center gap-2 min-w-0">
              <span className="truncate">{image.catalog_id || `IMG_${String(index + 1).padStart(3, '0')}`}</span>
              {image.source_url && (
                <a
                  href={image.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lmsy-blue/70 hover:text-lmsy-blue flex-shrink-0"
                  title={`Source (${image.source_platform || 'unknown'}): ${image.source_url}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                </a>
              )}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onRotate(image, 'left')}
                className="rounded bg-black/70 p-1 text-white/60 transition-colors hover:text-white"
                title={t('c.rotateLeft')}
              >
                <RotateCcw className="h-3 w-3" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => onRotate(image, 'right')}
                className="rounded bg-black/70 p-1 text-white/60 transition-colors hover:text-white"
                title={t('c.rotateRight')}
              >
                <RotateCw className="h-3 w-3" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(image)}
                className="rounded bg-black/70 p-1 text-red-300/70 transition-colors hover:text-red-200"
                title={t('common.delete')}
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => onSetCover(image)}
                className={`rounded bg-black/70 p-1 transition-colors ${
                  isCover
                    ? 'text-lmsy-yellow'
                    : 'text-lmsy-yellow/75 hover:text-lmsy-yellow'
                }`}
                title={isCover ? 'Current Cover' : 'Set as Cover'}
              >
                <Star className="h-3 w-3" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================= Draft card =============================
function DraftCard({
  draft,
  selected,
  onToggle,
  onPromote,
  onUnlink,
  busy,
}: {
  draft: DraftImage;
  selected: boolean;
  onToggle: () => void;
  onPromote: (draft: DraftImage) => void;
  onUnlink: (draft: DraftImage) => void;
  busy: boolean;
}) {
  const { t } = useAdminLang();
  const imageUrl = getImageUrl(draft.r2_media_url);
  return (
    <div
      className={`relative border transition-colors cursor-pointer ${
        selected ? 'border-lmsy-yellow/60' : 'border-white/10 hover:border-white/25'
      }`}
      onClick={onToggle}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-white/5">
        {imageUrl ? (
          <Image src={imageUrl} alt={draftTitle(draft.title)} fill className="object-contain bg-black/40 p-2" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/65">
            {t('c.missingMedia')}
          </div>
        )}

        {/* Selection checkbox */}
        <div
          className={`absolute left-2 top-2 flex h-5 w-5 items-center justify-center border transition-colors ${
            selected ? 'border-lmsy-yellow bg-lmsy-yellow/20' : 'border-white/30 bg-black/60'
          }`}
        >
          {selected && <span className="text-[10px] font-mono text-lmsy-yellow">✓</span>}
        </div>

        {/* Status badge */}
        <div className="absolute right-2 top-2 px-2 py-0.5 bg-black/70 border border-white/20 backdrop-blur-sm">
          <span className="text-[9px] font-mono tracking-widest text-lmsy-yellow/80 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" strokeWidth={2} />
            PENDING
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="px-3 py-2 space-y-1.5">
        <p className="text-[10px] font-mono text-white/60 truncate">{draftTitle(draft.title)}</p>
        <div className="flex items-center justify-between gap-2 text-[9px] font-mono text-white/65">
          <span>
            {draft.source_platform || t('d.unknownSource')}
            {draft.source_account ? ` · @${draft.source_account}` : ''}
          </span>
          {draft.source_url && (
            <a
              href={draft.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lmsy-blue/70 hover:text-lmsy-blue"
              title={t('common.link')}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-1 pt-0.5">
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onPromote(draft);
            }}
            className="flex items-center gap-1 rounded bg-black/60 border border-lmsy-yellow/30 px-2 py-1 text-[9px] font-mono tracking-widest text-lmsy-yellow/80 transition-colors hover:text-lmsy-yellow disabled:opacity-40"
            title={t('c.promote')}
          >
            <Send className="h-2.5 w-2.5" strokeWidth={1.8} />
            {t('c.promote')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onUnlink(draft);
            }}
            className="flex items-center gap-1 rounded bg-black/60 border border-white/15 px-2 py-1 text-[9px] font-mono tracking-widest text-white/80 transition-colors hover:text-white/80 disabled:opacity-40"
            title={t('c.unlinkHint')}
          >
            <Unlink className="h-2.5 w-2.5" strokeWidth={1.8} />
            {t('c.unlink')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CurateProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useAdminLang();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [drafts, setDrafts] = useState<DraftImage[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [busyDraftAction, setBusyDraftAction] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getAuthHeaders = async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error('AUTH_REQUIRED');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };
  };

  const fetchProjectAndImages = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const headers = await getAuthHeaders();

      const projectResponse = await fetch(`/api/admin/projects/${id}`, {
        headers,
        credentials: 'include',
      });
      const projectJson = await projectResponse.json();
      if (projectResponse.ok && projectJson.data) {
        setProject(projectJson.data);
      } else {
        setLoadError(projectJson.error || 'PROJECT_LOAD_FAILED');
      }

      const galleryResponse = await fetch(`/api/admin/gallery?project_id=${id}`, {
        headers,
        credentials: 'include',
      });
      const galleryJson = await galleryResponse.json();
      if (galleryResponse.ok && galleryJson.data) {
        const sortedImages = [...galleryJson.data].sort((a: GalleryImage, b: GalleryImage) => {
          const aCoverRank = a.is_cover || a.catalog_id?.endsWith('-000') ? 0 : 1;
          const bCoverRank = b.is_cover || b.catalog_id?.endsWith('-000') ? 0 : 1;
          if (aCoverRank !== bCoverRank) {
            return aCoverRank - bCoverRank;
          }

          const seqA = a.sequence ?? Number.MAX_SAFE_INTEGER;
          const seqB = b.sequence ?? Number.MAX_SAFE_INTEGER;
          if (seqA !== seqB) {
            return seqA - seqB;
          }

          const catalogA = a.catalog_id || '';
          const catalogB = b.catalog_id || '';
          if (catalogA && catalogB && catalogA !== catalogB) {
            return catalogA.localeCompare(catalogB);
          }

          return (a.created_at || '').localeCompare(b.created_at || '');
        });
        setImages(sortedImages);
      } else if (!galleryResponse.ok) {
        setLoadError(galleryJson.error || 'GALLERY_LOAD_FAILED');
      }

      // Pending drafts assigned to this project
      const draftsResponse = await fetch(`/api/admin/drafts?project_id=${id}&status=draft&limit=200`, {
        cache: 'no-store',
        credentials: 'include',
      });
      if (draftsResponse.ok) {
        const draftsJson = await draftsResponse.json();
        if (draftsJson.success) {
          setDrafts(draftsJson.data || []);
          setSelectedDraftIds(new Set());
        }
      }
    } catch (error) {
      console.error('[PROJECT_CURATE] Failed to fetch project or gallery:', error);
      setLoadError('NETWORK_ERROR_WHILE_LOADING_PROJECT_GALLERY');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProjectAndImages();
  }, [fetchProjectAndImages]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex(img => img.id === active.id);
      const newIndex = images.findIndex(img => img.id === over.id);

      const newImages = arrayMove(images, oldIndex, newIndex);
      setImages(newImages);

      // Update sequence numbers and save to database
      await updateSequence(newImages);
    }
  };

  const updateSequence = async (updatedImages: GalleryImage[]) => {
    setSaving(true);
    setSaveStatus('SAVING...');

    try {
      const headers = await getAuthHeaders();
      // Update each image's sequence
      const updates = updatedImages.map((img, index) => ({
        id: img.id,
        sequence: index,
      }));

      const response = await fetch('/api/admin/gallery/batch-update', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        setSaveStatus('SAVED ✓');
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        setSaveStatus('ERROR ✗');
      }
    } catch (error) {
      console.error('Failed to update sequence:', error);
      setSaveStatus('ERROR ✗');
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async (image: GalleryImage, direction: 'left' | 'right') => {
    setSaveStatus('ROTATING...');

    try {
      const headers = await getAuthHeaders();
      const currentRotation = image.rotation ?? 0;
      const nextRotation = direction === 'left'
        ? (currentRotation + 270) % 360
        : (currentRotation + 90) % 360;

      const response = await fetch('/api/admin/gallery', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          id: image.id,
          rotation: nextRotation,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'ROTATE_FAILED');
      }

      setImages((prev) =>
        prev.map((item) =>
          item.id === image.id ? { ...item, rotation: nextRotation } : item
        )
      );
      setSaveStatus('ROTATED');
      setTimeout(() => setSaveStatus(null), 1500);
    } catch (error) {
      console.error('Failed to rotate image:', error);
      setSaveStatus('ROTATE_ERROR');
    }
  };

  const handleDeleteImage = async (image: GalleryImage) => {
    const confirmed = window.confirm(
      `Delete this image from gallery assets?\n\n${image.catalog_id || image.id}\n\nThis removes it from the project curation view as well.`
    );

    if (!confirmed) {
      return;
    }

    setSaveStatus('DELETING...');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/gallery?ids=${image.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'DELETE_FAILED');
      }

      setImages((prev) => prev.filter((item) => item.id !== image.id));
      setSaveStatus('DELETED');
      setTimeout(() => setSaveStatus(null), 1500);
    } catch (error) {
      console.error('Failed to delete image:', error);
      setSaveStatus('DELETE_ERROR');
    }
  };

  const handleSetCover = async (image: GalleryImage) => {
    setSaveStatus('SETTING_COVER...');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/projects/${id}/cover`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ imageId: image.id }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'SET_COVER_FAILED');
      }

      setImages((prev) => {
        const updated = prev.map((item) => ({
          ...item,
          is_cover: item.id === image.id,
        }));

        return [...updated].sort((a, b) => {
          const aCoverRank = a.is_cover || a.catalog_id?.endsWith('-000') ? 0 : 1;
          const bCoverRank = b.is_cover || b.catalog_id?.endsWith('-000') ? 0 : 1;
          if (aCoverRank !== bCoverRank) {
            return aCoverRank - bCoverRank;
          }

          const seqA = a.sequence ?? Number.MAX_SAFE_INTEGER;
          const seqB = b.sequence ?? Number.MAX_SAFE_INTEGER;
          if (seqA !== seqB) {
            return seqA - seqB;
          }

          return (a.created_at || '').localeCompare(b.created_at || '');
        });
      });
      setSaveStatus('COVER_SET');
      setTimeout(() => setSaveStatus(null), 1500);
    } catch (error) {
      console.error('Failed to set cover:', error);
      setSaveStatus('COVER_ERROR');
    }
  };

  // ============================ Draft batch actions ============================

  const toggleDraft = (draftId: string) => {
    setSelectedDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(draftId)) next.delete(draftId);
      else next.add(draftId);
      return next;
    });
  };

  const promoteDraft = async (draftId: string): Promise<'created' | 'exists' | 'error'> => {
    try {
      const response = await fetch(`/api/admin/drafts/${draftId}/to-gallery`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'PROMOTE_FAILED');
      }
      return result.created ? 'created' : 'exists';
    } catch {
      return 'error';
    }
  };

  const handlePromoteSelected = async () => {
    if (selectedDraftIds.size === 0) return;
    if (!confirm(`Promote ${selectedDraftIds.size} draft(s) to gallery assets?\n\nEach becomes a published image in this project. Duplicates are skipped automatically.`)) return;

    setBusyDraftAction(true);
    setSaveStatus('PROMOTING...');
    let created = 0;
    let skipped = 0;
    let failed = 0;
    for (const draftId of selectedDraftIds) {
      const outcome = await promoteDraft(draftId);
      if (outcome === 'created') created += 1;
      else if (outcome === 'exists') skipped += 1;
      else failed += 1;
    }
    setBusyDraftAction(false);
    setSaveStatus(`${t('ss.PROMOTED')} ${created} · ${t('ss.SKIPPED')} ${skipped}${failed ? ` · ${t('ss.FAILED')} ${failed}` : ''}`);
    setTimeout(() => setSaveStatus(null), 4000);
    await fetchProjectAndImages();
  };

  const handlePromoteOne = async (draft: DraftImage) => {
    setBusyDraftAction(true);
    const outcome = await promoteDraft(draft.id);
    setBusyDraftAction(false);
    setSaveStatus(outcome === 'created' ? 'PROMOTED' : outcome === 'exists' ? 'ALREADY_IN_ASSETS' : 'PROMOTE_ERROR');
    setTimeout(() => setSaveStatus(null), 2500);
    if (outcome === 'created') await fetchProjectAndImages();
  };

  const handleUnlinkSelected = async () => {
    if (selectedDraftIds.size === 0) return;
    if (!confirm(`Remove ${selectedDraftIds.size} draft(s) from this project?\n\nThey go back to the ungrouped pending pool.`)) return;

    setBusyDraftAction(true);
    setSaveStatus('UNLINKING...');
    try {
      const response = await fetch('/api/admin/drafts/batch-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedDraftIds), unlink: true }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'UNLINK_FAILED');
      setSaveStatus(`${t('ss.UNLINKED')} ${result.unlinked}`);
      setTimeout(() => setSaveStatus(null), 2500);
      await fetchProjectAndImages();
    } catch (error) {
      console.error('Failed to unlink drafts:', error);
      setSaveStatus('UNLINK_ERROR');
      setBusyDraftAction(false);
    }
  };

  const handleUnlinkOne = async (draft: DraftImage) => {
    setBusyDraftAction(true);
    try {
      const response = await fetch('/api/admin/drafts/batch-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [draft.id], unlink: true }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'UNLINK_FAILED');
      setSaveStatus('UNLINKED');
      setTimeout(() => setSaveStatus(null), 2000);
      await fetchProjectAndImages();
    } catch (error) {
      console.error('Failed to unlink draft:', error);
      setSaveStatus('UNLINK_ERROR');
      setBusyDraftAction(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDraftIds.size === 0) return;
    if (!confirm(`PERMANENTLY delete ${selectedDraftIds.size} draft(s) and their stored files?\n\nThis cannot be undone.`)) return;

    setBusyDraftAction(true);
    setSaveStatus('DELETING...');
    try {
      const response = await fetch('/api/admin/drafts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedDraftIds) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'DELETE_FAILED');
      setSaveStatus(`${t('ss.DELETED')} ${result.deleted ?? selectedDraftIds.size}`);
      setTimeout(() => setSaveStatus(null), 2500);
      await fetchProjectAndImages();
    } catch (error) {
      console.error('Failed to delete drafts:', error);
      setSaveStatus('DELETE_ERROR');
      setBusyDraftAction(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-lmsy-yellow/60 animate-spin" />
      </div>
    );
  }

  const allDraftsSelected = drafts.length > 0 && selectedDraftIds.size === drafts.length;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-6">
            {/* Back Button */}
            <Link
              href="/admin"
              className="p-2 rounded-lg hover:bg-white/5 text-white/75 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </Link>

            {/* Project Info */}
            <div>
              <h1 className="font-serif text-2xl text-white/90 tracking-tight">
                {project?.title || t('c.untitled')}
              </h1>
              <p className="text-xs font-mono text-white/65 tracking-wider uppercase mt-1">
                {project?.catalog_id} · {images.length} {t('wb.published')} · {drafts.length} {t('wb.pending')}
              </p>
            </div>
          </div>

          {/* Save Status */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setEditModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-mono text-white/80 transition-colors hover:border-lmsy-yellow/30 hover:bg-lmsy-yellow/5 hover:text-lmsy-yellow/80"
            >
              <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t('c.projectInfo')}
            </button>
            <Link
              href={`/projects/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-mono text-white/80 transition-colors hover:border-lmsy-blue/30 hover:bg-lmsy-blue/5 hover:text-lmsy-blue/80"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t('p.viewLive')}
            </Link>
            {saveStatus && (
              <span className={`text-xs font-mono ${
                saveStatus.includes('✓') ? 'text-green-400/80' :
                saveStatus.includes('✗') || saveStatus.includes('ERROR') ? 'text-red-400/80' :
                'text-lmsy-yellow/80'
              }`}>
                {t('ss.' + saveStatus).startsWith('ss.') ? saveStatus : t('ss.' + saveStatus)}
              </span>
            )}
            {saving && <Loader2 className="h-4 w-4 text-lmsy-yellow/60 animate-spin" />}
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1920px] mx-auto space-y-10">
        {loadError ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center">
            <p className="text-sm font-mono text-red-300/80">{loadError}</p>
          </div>
        ) : (
          <>
            {/* ==================== Pending drafts section ==================== */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono tracking-widest text-lmsy-yellow/70 uppercase">
                  {t('c.pendingSection')} ({drafts.length}) — {t('c.pendingHint')}
                </h2>
                {drafts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setSelectedDraftIds(allDraftsSelected ? new Set() : new Set(drafts.map((d) => d.id)))
                      }
                      className="border border-white/10 px-3 py-1.5 text-[10px] font-mono tracking-widest text-white/80 transition-colors hover:text-white/80"
                    >
                      {allDraftsSelected ? t('common.deselectAll') : t('common.selectAll')}
                    </button>
                    <button
                      onClick={handlePromoteSelected}
                      disabled={busyDraftAction || selectedDraftIds.size === 0}
                      className="border border-lmsy-yellow/30 px-3 py-1.5 text-[10px] font-mono tracking-widest text-lmsy-yellow/80 transition-colors hover:text-lmsy-yellow disabled:opacity-30"
                    >
                      {t('c.promote')} ({selectedDraftIds.size})
                    </button>
                    <button
                      onClick={handleUnlinkSelected}
                      disabled={busyDraftAction || selectedDraftIds.size === 0}
                      className="border border-white/10 px-3 py-1.5 text-[10px] font-mono tracking-widest text-white/80 transition-colors hover:text-white/80 disabled:opacity-30"
                    >
                      {t('c.unlink')}
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      disabled={busyDraftAction || selectedDraftIds.size === 0}
                      className="border border-red-500/20 px-3 py-1.5 text-[10px] font-mono tracking-widest text-red-400/60 transition-colors hover:text-red-300 disabled:opacity-30"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                )}
              </div>

              {drafts.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-6 text-center">
                  <p className="text-xs font-mono text-white/75">
                    {t('c.emptyPendingLong')}{' '}
                    <Link href="/admin/drafts" className="text-lmsy-blue/70 hover:text-lmsy-blue">{t('d.title')}</Link> —
                    {t('c.emptyPendingHow')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {drafts.map((draft) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      selected={selectedDraftIds.has(draft.id)}
                      onToggle={() => toggleDraft(draft.id)}
                      onPromote={handlePromoteOne}
                      onUnlink={handleUnlinkOne}
                      busy={busyDraftAction}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ==================== Published assets (drag to reorder) ==================== */}
            <section>
              <h2 className="text-xs font-mono tracking-widest text-white/75 uppercase mb-4">
                {t('c.publishedSection')} ({images.length}) — {t('c.dragHint')}
              </h2>
              {images.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-8 text-center">
                  <p className="text-sm font-mono text-white/60">{t('c.emptyPublished')}</p>
                  <p className="mt-3 text-xs font-mono text-white/65">
                    {t('c.emptyPublishedHint')}
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={images.map(img => img.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div
                      className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                    >
                      {images.map((image, index) => (
                        <SortableImage
                          key={image.id}
                          image={image}
                          index={index}
                          onRotate={handleRotate}
                          onDelete={handleDeleteImage}
                          onSetCover={handleSetCover}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </section>
          </>
        )}
      </main>

      {/* Instructions Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/5 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <p className="text-xs font-mono text-white/65">
            <span className="text-lmsy-yellow/60">{t('c.dragHint')}</span> · {t('c.autoSave')} ·{' '}
            <span className="text-lmsy-yellow/60">{t('c.clickSelect')}</span>
          </p>
          <p className="text-xs font-mono text-white/55">
            {t('c.title')}
          </p>
        </div>
      </footer>

      {/* Edit project info modal (reused from projects list) */}
      <EditProjectModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        project={project}
        onUpdate={fetchProjectAndImages}
      />
    </div>
  );
}
