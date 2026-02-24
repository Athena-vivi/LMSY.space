/**
 * Drafts Actions Bar Component
 *
 * Floating action bar that appears when items are selected
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit2, Trash2, X } from 'lucide-react';

interface DraftsActionsBarProps {
  selectedIds: Set<string>;
  onBatchPublish: () => void;
  onBatchDelete: () => void;
  onBatchEdit: () => void;
  onClearSelection: () => void;
}

export function DraftsActionsBar({
  selectedIds,
  onBatchPublish,
  onBatchDelete,
  onBatchEdit,
  onClearSelection,
}: DraftsActionsBarProps) {
  return (
    <AnimatePresence>
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div
            className="flex items-center gap-4 px-6 py-3 bg-black/95 backdrop-blur-xl border border-lmsy-yellow/30 rounded-full shadow-2xl"
            style={{
              boxShadow: '0 0 40px rgba(251, 191, 36, 0.2), inset 0 0 20px rgba(251, 191, 36, 0.05)',
            }}
          >
            <span className="text-white/60 text-sm font-mono">
              {selectedIds.size} SELECTED
            </span>
            <div className="w-px h-4 bg-white/10" />
            <motion.button
              onClick={onBatchPublish}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-400/90 text-xs font-mono hover:bg-green-500/30 transition-all rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2} />
              <span>PUBLISH_ALL</span>
            </motion.button>
            <motion.button
              onClick={onBatchDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400/90 text-xs font-mono hover:bg-red-500/30 transition-all rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              <span>DELETE_ALL</span>
            </motion.button>
            <motion.button
              onClick={onBatchEdit}
              className="flex items-center gap-2 px-4 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue/90 text-xs font-mono hover:bg-lmsy-blue/30 transition-all rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Edit2 className="h-3.5 w-3.5" strokeWidth={2} />
              <span>EDIT_ALL</span>
            </motion.button>
            <motion.button
              onClick={onClearSelection}
              className="p-2 text-white/30 hover:text-white/60 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
