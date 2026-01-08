'use client';

import { memo } from 'react';
import { motion, Reorder } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  displayName: string;
}

interface GalleryCardProps {
  item: UploadItem;
  index: number;
  onRemove: (id: string) => void;
  onClick: () => void;
  catalogId: string;
}

const GalleryCard = memo(function GalleryCard({ item, index, onRemove, onClick, catalogId }: GalleryCardProps) {
  return (
    <Reorder.Item
      key={item.id}
      value={item}
      id={item.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileDrag={{
        scale: 1.08,
        boxShadow: '0 0 30px rgba(251, 191, 36, 0.5)',
        zIndex: 100,
      }}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.05}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
      className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer reorder-item"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.06)',
      }}
      onClick={onClick}
    >
      <Image
        src={item.preview}
        alt={item.displayName}
        fill
        className="object-cover select-none"
        draggable={false}
        style={{ userSelect: 'none', WebkitUserDrag: 'none' }}
        sizes="(max-width: 640px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 16vw, 14vw"
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-500/80 rounded-full p-1 opacity-0 hover:opacity-100 transition-all duration-200 z-10"
        style={{ width: '20px', height: '20px' }}
      >
        <X className="h-3 w-3 text-white" strokeWidth={2.5} />
      </button>

      {index === 0 && (
        <div className="absolute top-0 left-0 bg-lmsy-yellow/95 text-black text-[9px] font-bold px-2 py-0.5 font-mono pointer-events-none">
          PRIMARY
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-6 pb-1.5 px-1 pointer-events-none">
        <div className="text-[8px] font-mono text-white/90 leading-tight">
          {String(index + 1).padStart(3, '0')}
        </div>
        <div className="text-[7px] font-mono text-lmsy-yellow/70 leading-tight truncate">
          {catalogId}
        </div>
      </div>
    </Reorder.Item>
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
  getPreviewCatalogId
}: GalleryGridProps) {
  if (uploadItems.length === 0) return null;

  return (
    <Reorder.Group
      axis="x"
      values={uploadItems}
      onReorder={onReorder}
      className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3"
    >
      {uploadItems.map((item, index) => (
        <GalleryCard
          key={item.id}
          item={item}
          index={index}
          onRemove={onRemove}
          onClick={() => onItemClick(index)}
          catalogId={getPreviewCatalogId(index)}
        />
      ))}
    </Reorder.Group>
  );
}
