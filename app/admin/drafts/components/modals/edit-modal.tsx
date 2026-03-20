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
  chronicle_visible: boolean;
  chronicle_title: { en: string; zh: string; th: string };
  chronicle_excerpt: { en: string; zh: string; th: string };
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

function TranslateButton({
  lang,
  translating,
  onTranslate,
}: {
  lang: 'zh' | 'th';
  translating: boolean;
  onTranslate: (lang: 'zh' | 'th') => void;
}) {
  return (
    <button
      onClick={() => onTranslate(lang)}
      disabled={translating}
      className="px-3 py-2 bg-lmsy-blue/20 border border-lmsy-blue/40 text-lmsy-blue rounded hover:bg-lmsy-blue/30 transition-all disabled:opacity-50"
      title={lang === 'zh' ? 'Translate to Chinese' : 'Translate to Thai'}
      type="button"
    >
      <Languages className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-serif text-white/90">EDIT_DRAFT</h2>
              <button onClick={onClose} className="p-2 text-white/30 hover:text-white/60 transition-colors">
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
                <label className="block text-xs font-mono text-white/40 mb-1">TITLE_EN</label>
                <input
                  type="text"
                  value={editForm.title.en}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: { ...prev.title, en: e.target.value } }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">TITLE_ZH</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.title.zh}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, title: { ...prev.title, zh: e.target.value } }))}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                  />
                  <TranslateButton lang="zh" translating={translating} onTranslate={onTranslate} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">TITLE_TH</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.title.th}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, title: { ...prev.title, th: e.target.value } }))}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                  />
                  <TranslateButton lang="th" translating={translating} onTranslate={onTranslate} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_EN</label>
                <textarea
                  value={editForm.description.en}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: { ...prev.description, en: e.target.value } }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_ZH</label>
                <div className="flex gap-2">
                  <textarea
                    value={editForm.description.zh}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: { ...prev.description, zh: e.target.value } }))}
                    rows={2}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                  />
                  <TranslateButton lang="zh" translating={translating} onTranslate={onTranslate} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_TH</label>
                <div className="flex gap-2">
                  <textarea
                    value={editForm.description.th}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: { ...prev.description, th: e.target.value } }))}
                    rows={2}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                  />
                  <TranslateButton lang="th" translating={translating} onTranslate={onTranslate} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">EVENT_DATE (when the image happened)</label>
                <input
                  type="date"
                  value={editForm.event_date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, event_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                />
                <p className="text-[10px] text-white/30 mt-1">Leave blank to use the ingest time.</p>
              </div>

              <div>
                <label className="block text-xs font-mono text-white/40 mb-1">TAGS (comma-separated)</label>
                <input
                  type="text"
                  value={editForm.tags.join(', ')}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    }))
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="space-y-3 rounded border border-white/10 p-4">
                <label className="flex items-center gap-2 text-xs font-mono text-white/60">
                  <input
                    type="checkbox"
                    checked={editForm.chronicle_visible}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, chronicle_visible: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  SHOW_IN_CHRONICLE
                </label>

                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">CHRONICLE_TITLE_EN</label>
                  <input
                    type="text"
                    value={editForm.chronicle_title.en}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, chronicle_title: { ...prev.chronicle_title, en: e.target.value } }))
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                    placeholder="Optional override for Chronicle title in English"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">CHRONICLE_TITLE_ZH</label>
                  <input
                    type="text"
                    value={editForm.chronicle_title.zh}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, chronicle_title: { ...prev.chronicle_title, zh: e.target.value } }))
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                    placeholder="Optional override for Chronicle title in Chinese"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">CHRONICLE_TITLE_TH</label>
                  <input
                    type="text"
                    value={editForm.chronicle_title.th}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, chronicle_title: { ...prev.chronicle_title, th: e.target.value } }))
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                    placeholder="Optional override for Chronicle title in Thai"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">CHRONICLE_EXCERPT_EN</label>
                  <textarea
                    value={editForm.chronicle_excerpt.en}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, chronicle_excerpt: { ...prev.chronicle_excerpt, en: e.target.value } }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                    placeholder="Optional override for Chronicle excerpt in English"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">CHRONICLE_EXCERPT_ZH</label>
                  <textarea
                    value={editForm.chronicle_excerpt.zh}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, chronicle_excerpt: { ...prev.chronicle_excerpt, zh: e.target.value } }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                    placeholder="Optional override for Chronicle excerpt in Chinese"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">CHRONICLE_EXCERPT_TH</label>
                  <textarea
                    value={editForm.chronicle_excerpt.th}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, chronicle_excerpt: { ...prev.chronicle_excerpt, th: e.target.value } }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                    placeholder="Optional override for Chronicle excerpt in Thai"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={editForm.is_featured}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, is_featured: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 focus:ring-lmsy-yellow/40"
                />
                <label htmlFor="is_featured" className="text-xs font-mono text-white/60">
                  FEATURED_ITEM
                </label>
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
