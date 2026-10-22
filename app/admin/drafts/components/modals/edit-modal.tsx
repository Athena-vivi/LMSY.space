'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';

/**
 * Only the English title is editable here. Everything else the row carries -
 * descriptions, tags, event date, chronicle fields - is left untouched: PATCH
 * forwards exactly the body it is given, so an omitted field is not a cleared
 * field.
 */
interface DraftForm {
  title: { en: string; zh: string; th: string };
}

interface EditModalProps {
  editingItem: {
    id: string;
    r2_media_url: string | null;
    media_type: 'image' | 'video';
  } | null;
  editForm: DraftForm;
  setEditForm: (form: DraftForm | ((prev: DraftForm) => DraftForm)) => void;
  onClose: () => void;
  onSave: () => void;
}

export function EditModal({
  editingItem,
  editForm,
  setEditForm,
  onClose,
  onSave,
}: EditModalProps) {
  return (
    <AnimatePresence>
      {editingItem && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto custom-scrollbar bg-black border border-white/10 rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif text-ink">EDIT_DRAFT</h2>
              <button onClick={onClose} className="p-2 text-ink-2 hover:text-ink-2 transition-colors">
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {editingItem.r2_media_url && (
              <div className="mb-6 rounded-lg overflow-hidden border border-white/10">
                {editingItem.media_type === 'video' ? (
                  <video src={editingItem.r2_media_url} controls className="w-full max-h-48 object-cover" />
                ) : (
                  <Image
                    src={editingItem.r2_media_url}
                    alt={editForm.title.en || 'Preview'}
                    width={400}
                    height={300}
                    className="w-full object-cover"
                    unoptimized
                  />
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-ink-2 mb-1">TITLE_EN</label>
                <input
                  type="text"
                  value={editForm.title.en}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: { ...prev.title, en: e.target.value } }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-ink-2 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
              <motion.button
                onClick={onSave}
                className="flex-1 px-4 py-2 bg-lmsy-yellow/20 border border-lmsy-yellow/40 text-lmsy-yellow text-sm font-mono hover:bg-lmsy-yellow/30 transition-all rounded"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                SAVE_CHANGES
              </motion.button>
              <motion.button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-ink-2 text-sm font-mono hover:bg-white/15 hover:text-ink-2 transition-all rounded"
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
