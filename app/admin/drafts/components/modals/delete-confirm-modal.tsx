/**
 * Delete Confirmation Modal
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import type { DeleteConfirmState } from '../../hooks/use-draft-actions';

interface DeleteConfirmModalProps {
  deleteConfirm: DeleteConfirmState;
  onExecute: () => void;
  onClose: () => void;
}

export function DeleteConfirmModal({ deleteConfirm, onExecute, onClose }: DeleteConfirmModalProps) {
  return (
    <AnimatePresence>
      {deleteConfirm.show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-black border border-red-500/30 rounded-lg p-6"
            style={{
              boxShadow: '0 0 40px rgba(220, 38, 38, 0.2), inset 0 0 20px rgba(220, 38, 38, 0.05)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-full">
                <Trash2 className="h-5 w-5 text-red-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-serif text-white/90">
                {deleteConfirm.type === 'batch' ? 'DELETE_MULTIPLE_ITEMS' : 'DELETE_ITEM'}
              </h2>
            </div>

            {/* Message */}
            <p className="text-white/60 text-sm mb-6">
              {deleteConfirm.type === 'batch'
                ? `Are you sure you want to delete ${deleteConfirm.count} items? This action cannot be undone.`
                : 'Are you sure you want to delete this item? This action cannot be undone.'}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <motion.button
                onClick={onExecute}
                className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-mono hover:bg-red-500/30 transition-all rounded"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                CONFIRM_DELETE
              </motion.button>
              <motion.button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-white/60 text-sm font-mono hover:bg-white/15 hover:text-white/80 transition-all rounded"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                CANCEL
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
