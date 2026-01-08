'use client';

import { Upload } from 'lucide-react';
import { motion } from 'framer-motion';

interface UploadZoneProps {
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function UploadZone({ onDrop, onFileInput }: UploadZoneProps) {
  return (
    <motion.div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="relative border border-dashed rounded-lg py-6 px-8 text-center cursor-pointer group transition-all duration-300 mb-8"
      style={{
        borderColor: 'rgba(251, 191, 36, 0.15)',
        backgroundColor: 'rgba(251, 191, 36, 0.02)',
      }}
      whileHover={{
        borderColor: 'rgba(251, 191, 36, 0.3)',
        backgroundColor: 'rgba(251, 191, 36, 0.04)',
      }}
    >
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={onFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="flex items-center justify-center gap-4">
        <Upload className="h-5 w-5 text-white/20 group-hover:text-lmsy-yellow/60 transition-colors" strokeWidth={1.5} />
        <div className="text-left">
          <p className="text-sm font-light text-white/40">
            Drag & Drop images or click to browse
          </p>
          <p className="text-[10px] text-white/20 font-mono mt-1">
            JPG, PNG, WebP • Max 50 images
          </p>
        </div>
      </div>
    </motion.div>
  );
}
