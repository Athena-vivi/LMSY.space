'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, GripVertical } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

interface MagazineImage {
  id: string;
  image_url: string;
  caption: string;
  catalog_id: string;
  sequence?: number;
}

interface Project {
  id: string;
  title: string;
  category: string;
  catalog_id: string;
}

// Sortable Item Component
function SortableImage({ image, index }: { image: MagazineImage; index: number }) {
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
        <Image
          src={image.image_url}
          alt={image.caption || `Magazine ${index + 1}`}
          fill
          className="object-cover"
          unoptimized
        />

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
          <p className="text-[10px] font-mono text-white/60 tracking-wider">
            {image.catalog_id || `MAG_${String(index + 1).padStart(3, '0')}`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CurateEditorialPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [images, setImages] = useState<MagazineImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchProjectAndImages();
  }, [params.id]);

  const fetchProjectAndImages = async () => {
    setLoading(true);

    try {
      // Fetch project details
      const { data: projectData } = await fetch(`/api/admin/projects/${params.id}`).then(r => r.json());
      if (projectData) setProject(projectData);

      // Fetch gallery images for this project (magazine pages)
      const { data: galleryData } = await fetch(`/api/admin/gallery?project_id=${params.id}`).then(r => r.json());
      if (galleryData) {
        // Sort by sequence if available, otherwise by catalog_id
        const sortedImages = galleryData.sort((a: MagazineImage, b: MagazineImage) => {
          const seqA = a.sequence ?? 999;
          const seqB = b.sequence ?? 999;
          if (seqA !== seqB) return seqA - seqB;
          return (a.catalog_id || '').localeCompare(b.catalog_id || '');
        });
        setImages(sortedImages);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
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

  const updateSequence = async (updatedImages: MagazineImage[]) => {
    setSaving(true);
    setSaveStatus('SAVING...');

    try {
      // Update each image's sequence
      const updates = updatedImages.map((img, index) => ({
        id: img.id,
        sequence: index,
      }));

      const response = await fetch('/api/admin/gallery/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
              href="/admin/editorial"
              className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </Link>

            {/* Project Info */}
            <div>
              <h1 className="font-serif text-2xl text-white/90 tracking-tight">
                {project?.title || 'Untitled Magazine'}
              </h1>
              <p className="text-xs font-mono text-white/30 tracking-wider uppercase mt-1">
                {project?.catalog_id} · {images.length} ARTIFACTS
              </p>
            </div>
          </div>

          {/* Save Status */}
          <div className="flex items-center gap-4">
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map(img => img.id)}
            strategy={verticalListSortingStrategy}
          >
            {/* Responsive Masonry - Scale 0.85 for density */}
            <div
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4"
              style={{ transform: 'scale(0.85)', transformOrigin: 'top left' }}
            >
              {images.map((image, index) => (
                <SortableImage key={image.id} image={image} index={index} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </main>

      {/* Instructions Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/5 px-6 py-3">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <p className="text-xs font-mono text-white/30">
            <span className="text-lmsy-yellow/60">DRAG</span> to reorder · Auto-saves on drop
          </p>
          <p className="text-xs font-mono text-white/20">
            MIRrored Curation v1.0 · MAGAZINE_ARCHIVE
          </p>
        </div>
      </footer>
    </div>
  );
}
