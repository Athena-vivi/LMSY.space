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
      className="relative border border-dashed rounded-lg py-8 px-6 text-center cursor-pointer group transition-all duration-300 min-h-[120px]"
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
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <Upload className="h-8 w-8 text-white/20 group-hover:text-lmsy-yellow/60 transition-colors" strokeWidth={1.5} />
        <div className="text-center space-y-1">
          <p className="text-sm font-light text-white/40">
            Drag & Drop images here
          </p>
          <p className="text-xs text-white/30">
            or click to browse
          </p>
        </div>
      </div>
    </motion.div>
  );
}
