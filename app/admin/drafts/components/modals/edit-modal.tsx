/**
 * Edit Modal Component
 *
 * Modal for editing a single draft item
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, Languages } from 'lucide-react';
import Image from 'next/image';

interface DraftForm {
  title: { en: string; zh: string; th: string };
  description: { en: string; zh: string; th: string };
  tags: string[];
  is_featured: boolean;
  event_date: string;
}

interface EditModalProps {
  editingItem: {
    id: string;
    r2_media_url: string | null;
    media_type: 'image' | 'video';
  } | null;
  editForm: DraftForm;
  setEditForm: (form: DraftForm | ((prev: DraftForm) => DraftForm)) => void;
  translating: boolean;
  onClose: () => void;
  onSave: () => void;
  onTranslate: (lang: 'zh' | 'th') => void;
}

export function EditModal({
  editingItem,
  editForm,
  setEditForm,
  translating,
  onClose,
  onSave,
  onTranslate,
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
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif text-white/90">EDIT_DRAFT</h2>
              <button
                onClick={onClose}
                className="p-2 text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Media Preview */}
            {editingItem.r2_media_url && (
              <div className="mb-6 rounded-lg overflow-hidden border border-white/10">
                {editingItem.media_type === 'video' ? (
                  <video
                    src={editingItem.r2_media_url}
                    controls
                    className="w-full max-h-48 object-cover"
                  />
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

            {/* Form */}
            <div className="space-y-4">
              {/* Title EN */}
              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">TITLE_EN</label>
                <input
                  type="text"
                  value={editForm.title.en}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: { ...prev.title, en: e.target.value } }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                />
              </div>

              {/* Title ZH */}
              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">TITLE_ZH</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.title.zh}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: { ...prev.title, zh: e.target.value } }))}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                  />
                  <button
                    onClick={() => onTranslate('zh')}
                    disabled={translating}
                    className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50"
                    title="翻译为中文"
                  >
                    <Languages className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Title TH */}
              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">TITLE_TH</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.title.th}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: { ...prev.title, th: e.target.value } }))}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                  />
                  <button
                    onClick={() => onTranslate('th')}
                    disabled={translating}
                    className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50"
                    title="翻译为泰文"
                  >
                    <Languages className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Description EN */}
              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_EN</label>
                <textarea
                  value={editForm.description.en}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: { ...prev.description, en: e.target.value } }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                />
              </div>

              {/* Description ZH */}
              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_ZH</label>
                <div className="flex gap-2">
                  <textarea
                    value={editForm.description.zh}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: { ...prev.description, zh: e.target.value } }))}
                    rows={2}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                  />
                  <button
                    onClick={() => onTranslate('zh')}
                    disabled={translating}
                    className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50 self-start"
                    title="翻译为中文"
                  >
                    <Languages className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Description TH */}
              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_TH</label>
                <div className="flex gap-2">
                  <textarea
                    value={editForm.description.th}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: { ...prev.description, th: e.target.value } }))}
                    rows={2}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                  />
                  <button
                    onClick={() => onTranslate('th')}
                    disabled={translating}
                    className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50 self-start"
                    title="翻译为泰文"
                  >
                    <Languages className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Event Date */}
              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">EVENT_DATE (图片发生时间)</label>
                <input
                  type="date"
                  value={editForm.event_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, event_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                />
                <p className="text-[10px] text-white/30 mt-1">留空则使用抓取时间</p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">TAGS (comma-separated)</label>
                <input
                  type="text"
                  value={editForm.tags.join(', ')}
                  onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              {/* Is Featured */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={editForm.is_featured}
                  onChange={(e) => setEditForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 focus:ring-lmsy-yellow/40"
                />
                <label htmlFor="is_featured" className="text-xs font-mono text-white/60">
                  FEATURED_ITEM
                </label>
              </div>
            </div>

            {/* Actions */}
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
