'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Eye, X, Save, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { supabase, type GalleryItem } from '@/lib/supabase';

interface EditorialArticle extends GalleryItem {
  title?: string;
  excerpt?: string;
  category?: string;
  author?: string;
  readTime?: string;
}

type ViewMode = 'list' | 'create' | 'edit' | 'preview';

export default function AdminEditorialPage() {
  const [articles, setArticles] = useState<EditorialArticle[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedArticle, setSelectedArticle] = useState<EditorialArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    category: 'Feature',
    author: 'Astra',
    readTime: '5 min read',
    image_url: '',
    caption: '',
    curator_note: '',
    tag: 'editorial',
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .eq('is_editorial', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setArticles(data as EditorialArticle[]);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setSelectedArticle(null);
    setFormData({
      title: '',
      excerpt: '',
      category: 'Feature',
      author: 'Astra',
      readTime: '5 min read',
      image_url: '',
      caption: '',
      curator_note: '',
      tag: 'editorial',
    });
    setViewMode('create');
  };

  const handleEdit = (article: EditorialArticle) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title || '',
      excerpt: article.excerpt || '',
      category: article.category || 'Feature',
      author: article.author || 'Astra',
      readTime: article.readTime || '5 min read',
      image_url: article.image_url || '',
      caption: article.caption || '',
      curator_note: article.curator_note || '',
      tag: article.tag || 'editorial',
    });
    setViewMode('edit');
  };

  const handlePreview = (article: EditorialArticle) => {
    setSelectedArticle(article);
    setViewMode('preview');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    const { error } = await supabase.from('gallery').delete().eq('id', id);
    if (!error) {
      setArticles(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleSave = async () => {
    setSaving(true);

    const payload = {
      image_url: formData.image_url,
      caption: formData.caption,
      tag: formData.tag,
      is_editorial: true,
      curator_note: formData.curator_note,
      title: formData.title,
      excerpt: formData.excerpt,
      category: formData.category,
      author: formData.author,
      readTime: formData.readTime,
    };

    let error;
    if (viewMode === 'create') {
      const result = await supabase.from('gallery').insert(payload).select();
      error = result.error;
    } else if (selectedArticle) {
      const result = await supabase
        .from('gallery')
        .update(payload)
        .eq('id', selectedArticle.id);
      error = result.error;
    }

    if (!error) {
      await fetchArticles();
      setViewMode('list');
    }

    setSaving(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-light text-white/90 tracking-tight mb-2">
            Editorial Studio
          </h1>
          <p className="text-xs font-mono text-white/30 tracking-wider uppercase">
            Digital Magazine Content Management
          </p>
        </div>
        {viewMode === 'list' && (
          <motion.button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-lmsy-yellow/30 rounded-lg text-lmsy-yellow/90 transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-sm font-medium">New Article</span>
          </motion.button>
        )}
      </motion.div>

      {/* List View */}
      <AnimatePresence mode="wait">
        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-lmsy-yellow/60 animate-spin" />
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-20 border border-dashed rounded-lg" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                <p className="text-white/30 font-light">No editorial articles yet</p>
              </div>
            ) : (
              articles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-black border rounded-lg overflow-hidden"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="grid grid-cols-12 gap-6 p-6">
                    {/* Cover Image */}
                    <div className="col-span-3">
                      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-white/5">
                        {article.image_url && (
                          <Image
                            src={article.image_url}
                            alt={article.title || article.caption || 'Article cover'}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        )}
                      </div>
                    </div>

                    {/* Article Info */}
                    <div className="col-span-7 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className="px-3 py-1 text-xs font-medium tracking-wider uppercase rounded-full"
                            style={{
                              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(56, 189, 248, 0.1))',
                              borderColor: 'rgba(251, 191, 36, 0.2)',
                              color: 'rgba(251, 191, 36, 0.9)',
                              border: '1px solid',
                            }}
                          >
                            {article.category || 'Feature'}
                          </span>
                          {article.readTime && (
                            <span className="text-xs text-white/30 font-mono">{article.readTime}</span>
                          )}
                        </div>
                        <h3 className="font-serif text-xl text-white/90 mb-2">
                          {article.title || article.caption || 'Untitled'}
                        </h3>
                        {article.excerpt && (
                          <p className="text-sm text-white/40 font-light line-clamp-2">
                            {article.excerpt}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/20 font-mono">
                        <span>{article.author || 'Astra'}</span>
                        <span>•</span>
                        <span>{new Date(article.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handlePreview(article)}
                        className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-lmsy-blue transition-colors"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleEdit(article)}
                        className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-lmsy-yellow transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Hover Border */}
                  <div
                    className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      border: '1px solid transparent',
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(56, 189, 248, 0.3)) border-box',
                      WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude',
                    }}
                  />
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* Create/Edit View */}
        {(viewMode === 'create' || viewMode === 'edit') && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-12 gap-8"
          >
            {/* Form */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              {/* Cover Image URL */}
              <div>
                <label className="block text-xs font-mono text-white/30 tracking-wider uppercase mb-3">
                  Cover Image URL
                </label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://cdn.lmsy.space/images/..."
                  className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-mono text-white/30 tracking-wider uppercase mb-3">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Article title..."
                  className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors text-lg"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-xs font-mono text-white/30 tracking-wider uppercase mb-3">
                  Excerpt
                </label>
                <input
                  type="text"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Brief summary..."
                  className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                />
              </div>

              {/* Category & Author */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono text-white/30 tracking-wider uppercase mb-3">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-white/30 tracking-wider uppercase mb-3">
                    Author
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                  />
                </div>
              </div>

              {/* Read Time */}
              <div>
                <label className="block text-xs font-mono text-white/30 tracking-wider uppercase mb-3">
                  Read Time
                </label>
                <input
                  type="text"
                  value={formData.readTime}
                  onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                  placeholder="5 min read"
                  className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                />
              </div>

              {/* Caption (fallback for title) */}
              <div>
                <label className="block text-xs font-mono text-white/30 tracking-wider uppercase mb-3">
                  Caption (Legacy)
                </label>
                <input
                  type="text"
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  placeholder="Image caption..."
                  className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                />
              </div>

              {/* Markdown Content */}
              <div>
                <label className="block text-xs font-mono text-white/30 tracking-wider uppercase mb-3">
                  Content (Markdown)
                </label>
                <textarea
                  value={formData.curator_note}
                  onChange={(e) => setFormData({ ...formData, curator_note: e.target.value })}
                  placeholder="# Your Article

Write your article in **Markdown** format.

## Features

- List item 1
- List item 2

> Curator's note: This is a blockquote"
                  rows={20}
                  className="w-full px-4 py-3 bg-white/5 border rounded-lg text-white/90 font-light focus:outline-none focus:border-lmsy-yellow/40 transition-colors font-mono text-sm resize-none"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                />
              </div>
            </div>

            {/* Preview Sidebar */}
            <div className="col-span-12 lg:col-span-5">
              <div className="sticky top-8 space-y-6">
                {/* Cover Preview */}
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-white/5 border" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                  {formData.image_url ? (
                    <Image
                      src={formData.image_url}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white/20 text-sm">No cover image</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <motion.button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-black font-medium transition-all duration-200 disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.9), rgba(56, 189, 248, 0.9))',
                      boxShadow: '0 0 30px rgba(251, 191, 36, 0.3), 0 0 60px rgba(56, 189, 248, 0.2)',
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" strokeWidth={1.5} />
                    )}
                    <span>{viewMode === 'create' ? 'Publish' : 'Save'}</span>
                  </motion.button>
                  <button
                    onClick={() => setViewMode('list')}
                    className="px-4 py-3 rounded-lg border border-white/10 text-white/40 hover:text-white/60 hover:bg-white/5 transition-all duration-200"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Markdown Preview */}
                <div className="border rounded-lg p-4" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <h4 className="text-xs font-mono text-white/30 tracking-wider uppercase mb-3">
                    Markdown Preview
                  </h4>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div
                      className="text-white/70 text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: formData.curator_note
                          .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
                          .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-3">$1</h2>')
                          .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-2">$1</h3>')
                          .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold">$1</strong>')
                          .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
                          .replace(/^\> (.*$)/gim, '<blockquote class="border-l-2 border-lmsy-yellow/30 pl-4 my-2 italic text-white/50">$1</blockquote>')
                          .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
                          .replace(/\n/gim, '<br />'),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Preview Mode */}
        {viewMode === 'preview' && selectedArticle && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-xl"
          >
            <div className="min-h-screen py-8 px-4">
              {/* Close Button */}
              <div className="fixed top-4 right-4 z-10">
                <button
                  onClick={() => setViewMode('list')}
                  className="p-3 rounded-full border border-white/10 bg-black/80 text-white/40 hover:text-white/60 hover:bg-white/5 transition-all"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Preview Content */}
              <div className="max-w-4xl mx-auto">
                {/* Hero */}
                <div className="mb-12">
                  {selectedArticle.image_url && (
                    <div className="relative aspect-[3/4] md:aspect-[16/9] rounded-2xl overflow-hidden mb-8">
                      <Image
                        src={selectedArticle.image_url}
                        alt={selectedArticle.title || selectedArticle.caption || 'Article cover'}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                  )}

                  <div className="space-y-4">
                    <span
                      className="inline-block px-4 py-2 text-sm font-medium tracking-wider uppercase rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(56, 189, 248, 0.1))',
                        borderColor: 'rgba(251, 191, 36, 0.2)',
                        color: 'rgba(251, 191, 36, 0.9)',
                        border: '1px solid',
                      }}
                    >
                      {selectedArticle.category || 'Feature'}
                    </span>
                    <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white/90 tracking-tight">
                      {selectedArticle.title || selectedArticle.caption || 'Untitled'}
                    </h1>
                    {selectedArticle.excerpt && (
                      <p className="text-xl text-white/60 font-light">
                        {selectedArticle.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-white/30 font-mono">
                      <span>{selectedArticle.author || 'Astra'}</span>
                      {selectedArticle.readTime && (
                        <>
                          <span>•</span>
                          <span>{selectedArticle.readTime}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(selectedArticle.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                {selectedArticle.curator_note && (
                  <div className="prose prose-lg prose-invert max-w-none">
                    <div
                      className="text-white/80 space-y-6"
                      dangerouslySetInnerHTML={{
                        __html: selectedArticle.curator_note
                          .replace(/^# (.*$)/gim, '<h1 class="font-serif text-4xl font-bold mb-6 text-white/90">$1</h1>')
                          .replace(/^## (.*$)/gim, '<h2 class="font-serif text-3xl font-bold mb-4 text-white/80">$1</h2>')
                          .replace(/^### (.*$)/gim, '<h3 class="font-serif text-2xl font-bold mb-3 text-white/70">$1</h3>')
                          .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold text-lmsy-yellow">$1</strong>')
                          .replace(/\*(.*)\*/gim, '<em class="italic text-lmsy-blue">$1</em>')
                          .replace(/^\> (.*$)/gim, '<blockquote class="border-l-2 border-lmsy-yellow/30 pl-6 my-6 italic text-white/50 relative"><span class="absolute -left-2 top-0 text-lmsy-yellow text-4xl opacity-30">"</span>$1</blockquote>')
                          .replace(/^\- (.*$)/gim, '<li class="ml-6 mb-2 text-white/70">$1</li>')
                          .replace(/\n\n/gim, '</p><p class="mb-6 leading-relaxed">')
                          .replace(/\n/gim, '<br />'),
                      }}
                    />
                  </div>
                )}

                {/* Footer */}
                <div className="mt-16 pt-8 border-t border-white/5 text-center">
                  <p className="font-mono text-xs text-white/20 tracking-widest">
                    PREVIEW MODE • EDITORIAL STUDIO
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Keyframe Animations */}
      <style jsx global>{`
        @keyframes pulse-border {
          0%, 100% {
            border-color: rgba(251, 191, 36, 0.2);
          }
          50% {
            border-color: rgba(251, 191, 36, 0.4);
          }
        }
      `}</style>
    </div>
  );
}
