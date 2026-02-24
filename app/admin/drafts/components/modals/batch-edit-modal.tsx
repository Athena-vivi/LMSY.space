/**
 * Batch Edit Modal Component
 *
 * Modal for editing multiple draft items at once
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, Languages, ChevronUp, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import type { DraftItem } from '@/lib/supabase/types';

interface BatchEditForm {
  title: { en: string; zh: string; th: string };
  description: { en: string; zh: string; th: string };
  tags: string[];
  is_featured: boolean;
  event_date: string;
}

interface BatchEditModalProps {
  drafts: DraftItem[];
  batchEditing: boolean;
  batchEditForm: BatchEditForm;
  setBatchEditForm: (form: BatchEditForm | ((prev: BatchEditForm) => BatchEditForm)) => void;
  batchOrder: string[];
  translating: boolean;
  selectedIds: Set<string>;
  onClose: () => void;
  onSave: () => void;
  onTranslate: (lang: 'zh' | 'th') => void;
  onMoveItem: (index: number, direction: 'up' | 'down') => void;
}

export function BatchEditModal({
  drafts,
  batchEditing,
  batchEditForm,
  setBatchEditForm,
  batchOrder,
  translating,
  selectedIds,
  onClose,
  onSave,
  onTranslate,
  onMoveItem,
}: BatchEditModalProps) {
  return (
    <AnimatePresence>
      {batchEditing && (
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
            className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex bg-black border border-white/10 rounded-lg"
          >
            {/* Left Panel - Form */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-serif text-white/90">BATCH_EDIT ({selectedIds.size} ITEMS)</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Title EN */}
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">TITLE_EN</label>
                  <input
                    type="text"
                    value={batchEditForm.title.en}
                    onChange={(e) => setBatchEditForm(prev => ({ ...prev, title: { ...prev.title, en: e.target.value } }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                  />
                </div>

                {/* Title ZH */}
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">TITLE_ZH</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={batchEditForm.title.zh}
                      onChange={(e) => setBatchEditForm(prev => ({ ...prev, title: { ...prev.title, zh: e.target.value } }))}
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
                      value={batchEditForm.title.th}
                      onChange={(e) => setBatchEditForm(prev => ({ ...prev, title: { ...prev.title, th: e.target.value } }))}
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
                    value={batchEditForm.description.en}
                    onChange={(e) => setBatchEditForm(prev => ({ ...prev, description: { ...prev.description, en: e.target.value } }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40 resize-none"
                  />
                </div>

                {/* Description ZH */}
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">DESCRIPTION_ZH</label>
                  <div className="flex gap-2">
                    <textarea
                      value={batchEditForm.description.zh}
                      onChange={(e) => setBatchEditForm(prev => ({ ...prev, description: { ...prev.description, zh: e.target.value } }))}
                      rows={3}
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
                      value={batchEditForm.description.th}
                      onChange={(e) => setBatchEditForm(prev => ({ ...prev, description: { ...prev.description, th: e.target.value } }))}
                      rows={3}
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
                    value={batchEditForm.event_date}
                    onChange={(e) => setBatchEditForm(prev => ({ ...prev, event_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                  />
                  <p className="text-[10px] text-white/30 mt-1">留空则使用抓取时间</p>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-mono text-white/40 mb-1">TAGS (comma-separated)</label>
                  <input
                    type="text"
                    value={batchEditForm.tags.join(', ')}
                    onChange={(e) => setBatchEditForm(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 text-sm focus:outline-none focus:border-lmsy-yellow/40"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                {/* Is Featured */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="batch_is_featured"
                    checked={batchEditForm.is_featured}
                    onChange={(e) => setBatchEditForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 focus:ring-lmsy-yellow/40"
                  />
                  <label htmlFor="batch_is_featured" className="text-xs font-mono text-white/60">
                    FEATURED_ITEMS
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
                  SAVE_ALL_CHANGES
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
            </div>

            {/* Right Panel - Item List with Order */}
            <div className="w-80 border-l border-white/10 p-4 overflow-y-auto custom-scrollbar bg-white/5">
              <h3 className="text-xs font-mono text-white/60 mb-4 sticky top-0 bg-white/5 pb-2 border-b border-white/10">
                SEQUENCE_ORDER
              </h3>
              <div className="space-y-2">
                {batchOrder.map((id, index) => {
                  const item = drafts.find(d => d.id === id);
                  if (!item) return null;

                  return (
                    <motion.div
                      key={id}
                      layout
                      className="flex items-center gap-2 p-2 bg-black/50 border border-white/10 rounded"
                    >
                      <span className="text-xs font-mono text-white/40 w-6">{index + 1}</span>
                      {item.r2_media_url && (
                        <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={item.r2_media_url}
                            alt=""
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80 truncate">
                          {item.title.en || 'Untitled'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => onMoveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="h-3 w-3" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => onMoveItem(index, 'down')}
                          disabled={index === batchOrder.length - 1}
                          className="p-1 text-white/30 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="h-3 w-3" strokeWidth={2} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
