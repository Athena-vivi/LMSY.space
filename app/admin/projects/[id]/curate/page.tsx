'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ExternalLink, Loader2, GripVertical, RotateCcw, RotateCw, Trash2, Star } from 'lucide-react';
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
import { supabase } from '@/lib/supabase';

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string;
  catalog_id: string;
  sequence?: number;
  created_at?: string;
  is_cover?: boolean | null;
  rotation?: number | null;
}

interface Project {
  id: string;
  title: string;
  category: string;
  catalog_id: string;
}

// Sortable Item Component
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

      {/* Image Container - Smaller Scale */}
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
            <span className="text-[10px] font-mono text-white/30 tracking-wider">
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

        {/* Catalog ID */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-mono text-white/60 tracking-wider">
              {image.catalog_id || `IMG_${String(index + 1).padStart(3, '0')}`}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onRotate(image, 'left')}
                className="rounded bg-black/70 p-1 text-white/60 transition-colors hover:text-white"
                title="Rotate Left"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => onRotate(image, 'right')}
                className="rounded bg-black/70 p-1 text-white/60 transition-colors hover:text-white"
                title="Rotate Right"
              >
                <RotateCw className="h-3 w-3" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(image)}
                className="rounded bg-black/70 p-1 text-red-300/70 transition-colors hover:text-red-200"
                title="Delete Image"
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

export default function CurateProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-lmsy-yellow/60 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-6">
            {/* Back Button */}
            <Link
              href="/admin/projects"
              className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </Link>

            {/* Project Info */}
            <div>
              <h1 className="font-serif text-2xl text-white/90 tracking-tight">
                {project?.title || 'Untitled Project'}
              </h1>
              <p className="text-xs font-mono text-white/30 tracking-wider uppercase mt-1">
                {project?.catalog_id} · {images.length} ARTIFACTS
              </p>
            </div>
          </div>

          {/* Save Status */}
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-mono text-white/50 transition-colors hover:border-lmsy-blue/30 hover:bg-lmsy-blue/5 hover:text-lmsy-blue/80"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              VIEW_LIVE
            </Link>
            {saveStatus && (
              <span className={`text-xs font-mono ${
                saveStatus.includes('✓') ? 'text-green-400/80' :
                saveStatus.includes('✗') ? 'text-red-400/80' :
                'text-lmsy-yellow/80'
              }`}>
                {saveStatus}
              </span>
            )}
            {saving && <Loader2 className="h-4 w-4 text-lmsy-yellow/60 animate-spin" />}
          </div>
        </div>
      </header>

      {/* Mirrored Masonry Grid */}
      <main className="p-6 max-w-[1920px] mx-auto">
        {loadError ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center">
            <p className="text-sm font-mono text-red-300/80">{loadError}</p>
          </div>
        ) : images.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
            <p className="text-sm font-mono text-white/60">NO_LINKED_GALLERY_ASSETS</p>
            <p className="mt-3 text-xs font-mono text-white/30">
              This page only shows gallery images whose <span className="text-white/50">project_id</span> matches this project.
            </p>
            <p className="mt-2 text-xs font-mono text-white/25">
              If your images are still in Draft Inbox, use <span className="text-white/45">LINK_EXISTING</span> and then <span className="text-white/45">WRITE_TO_ASSETS</span> first.
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
      </main>

      {/* Instructions Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/5 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <p className="text-xs font-mono text-white/30">
            <span className="text-lmsy-yellow/60">DRAG</span> to reorder · Auto-saves on drop
          </p>
          <p className="text-xs font-mono text-white/20">
            MIRrored Curation v1.0
          </p>
        </div>
      </footer>
    </div>
  );
}
