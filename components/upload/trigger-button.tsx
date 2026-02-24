/**
 * Upload Trigger Button
 *
 * A pre-styled button that opens the upload modal.
 * Can be used anywhere in the admin panel.
 *
 * Usage:
 * <UploadTriggerButton />
 * <UploadTriggerButton label="Import Images" variant="compact" />
 */

'use client';

import { motion } from 'framer-motion';
import { Upload as UploadIcon } from 'lucide-react';
import { useBulkUpload } from './provider';

interface UploadTriggerButtonProps {
  label?: string;
  variant?: 'default' | 'compact' | 'minimal';
  className?: string;
  showCount?: boolean;
  count?: number;
}

export function UploadTriggerButton({
  label = 'Bulk Upload',
  variant = 'default',
  className = '',
  showCount = false,
  count = 0,
}: UploadTriggerButtonProps) {
  const { openUpload } = useBulkUpload();

  const baseStyle = "flex items-center gap-2 rounded-lg font-mono text-sm transition-all duration-200";

  const variants = {
    default: "px-4 py-2 bg-gradient-to-br from-lmsy-yellow/10 to-lmsy-blue/10 border border-lmsy-yellow/20 text-white/70 hover:border-lmsy-yellow/40 hover:from-lmsy-yellow/15 hover:to-lmsy-blue/15",
    compact: "px-3 py-1.5 bg-lmsy-yellow/5 border border-lmsy-yellow/10 text-white/60 hover:bg-lmsy-yellow/10 hover:border-lmsy-yellow/20",
    minimal: "px-2 py-1 text-white/40 hover:text-lmsy-yellow/60 hover:bg-white/5",
  };

  return (
    <motion.button
      onClick={() => openUpload()}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <UploadIcon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
      {variant !== 'minimal' && <span>{label}</span>}
      {showCount && count > 0 && (
        <span className="px-1.5 py-0.5 bg-lmsy-blue/20 border border-lmsy-blue/30 rounded text-xs text-lmsy-blue">
          {count}
        </span>
      )}
    </motion.button>
  );
}
