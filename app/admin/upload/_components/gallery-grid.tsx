'use client';

import { memo } from 'react';
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
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import Image from 'next/image';

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  displayName: string;
}

interface SortableItemProps {
  item: UploadItem;
  index: number;
  onRemove: (id: string) => void;
  onClick: () => void;
  catalogId: string;
}

const SortableItem = memo(function SortableItem({
  item,
  index,
  onRemove,
  onClick,
  catalogId,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 50 : 1,
    border: isDragging ? '1px solid rgba(251, 191, 36, 0.8)' : '1px solid rgba(255, 255, 255, 0.06)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer reorder-item"
      onClick={onClick}
    >
      {/* Drag handle overlay */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 z-10"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />

      <Image
        src={item.preview}
        alt={item.displayName}
        fill
        className="object-cover select-none pointer-events-none"
        draggable={false}
        sizes="(max-width: 640px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, 14vw"
      />

      {/* Remove button - above drag handle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-500/80 rounded-full p-1 opacity-0 hover:opacity-100 transition-all duration-200 z-20"
        style={{ width: '20px', height: '20px' }}
      >
        <X className="h-3 w-3 text-white" strokeWidth={2.5} />
      </button>

      {/* Primary badge */}
      {index === 0 && (
        <div className="absolute top-0 left-0 bg-lmsy-yellow/95 text-black text-[9px] font-bold px-2 py-0.5 font-mono pointer-events-none z-0">
          PRIMARY
        </div>
      )}

      {/* Catalog ID overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-6 pb-1.5 px-1 pointer-events-none z-0">
        <div className="text-[8px] font-mono text-white/90 leading-tight">
          {String(index + 1).padStart(3, '0')}
        </div>
        <div className="text-[7px] font-mono text-lmsy-yellow/70 leading-tight truncate">
          {catalogId}
        </div>
      </div>
    </div>
  );
});

interface GalleryGridProps {
  uploadItems: UploadItem[];
  onReorder: (items: UploadItem[]) => void;
  onRemove: (id: string) => void;
  onItemClick: (index: number) => void;
  getPreviewCatalogId: (index: number) => string;
}

export default function GalleryGrid({
  uploadItems,
  onReorder,
  onRemove,
  onItemClick,
  getPreviewCatalogId,
}: GalleryGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start dragging
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = uploadItems.findIndex((item) => item.id === active.id);
      const newIndex = uploadItems.findIndex((item) => item.id === over.id);

      onReorder(arrayMove(uploadItems, oldIndex, newIndex));
    }
  };

  if (uploadItems.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={uploadItems}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {uploadItems.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              onRemove={onRemove}
              onClick={() => onItemClick(index)}
              catalogId={getPreviewCatalogId(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
