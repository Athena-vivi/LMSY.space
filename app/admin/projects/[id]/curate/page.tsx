'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Loader2, GripVertical, RotateCcw, RotateCw } from 'lucide-react';
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
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
}: {
  image: GalleryImage;
  index: number;
  onRotate: (image: GalleryImage, direction: 'left' | 'right') => void;
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

  const isCover = image.catalog_id?.endsWith('-000');
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
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-white/5 border border-white/10 hover:border-lmsy-yellow/30 transition-all duration-200">
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
              COVER_000
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

  useEffect(() => {
    fetchProjectAndImages();
  }, [id]);

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

  const fetchProjectAndImages = async () => {
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
        const sortedImages = galleryJson.data.sort((a: GalleryImage, b: GalleryImage) => {
          const seqA = a.sequence ?? 999;
          const seqB = b.sequence ?? 999;
          return seqA - seqB;
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
  };

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
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map(img => img.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10"
                style={{ transform: 'scale(0.85)', transformOrigin: 'top left' }}
              >
                {images.map((image, index) => (
                  <SortableImage
                    key={image.id}
                    image={image}
                    index={index}
                    onRotate={handleRotate}
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
