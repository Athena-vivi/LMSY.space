'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Save, Loader2, Calendar, Images } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { type GalleryItem } from '@/lib/supabase';

interface EditorialArticle extends GalleryItem {
  title?: string;
  excerpt?: string;
  category?: string;
  author?: string;
  readTime?: string;
  release_date?: string;
  cover_url?: string;
  description?: string;
}

type ViewMode = 'list' | 'create' | 'edit';

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
    release_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      // 🔒 SECURITY: Always use API route from client, never admin client directly
      const response = await fetch('/api/admin/editorial');

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ADMIN_FETCH] API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch articles');
      }

      const result = await response.json();

      console.log('[ADMIN_FETCH] Editorial magazines:', {
        count: result.projects?.length || 0,
        sample: result.projects?.slice(0, 2)
      });

      if (result.success && result.projects) {
        setArticles(result.projects);
      }
    } catch (err) {
      console.error('[ADMIN_FETCH] Exception:', err);
    } finally {
      setLoading(false);
    }
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
      release_date: new Date().toISOString().split('T')[0],
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
      release_date: article.release_date || new Date().toISOString().split('T')[0],
    });
    setViewMode('edit');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this magazine? This will also delete all associated pages.')) return;

    try {
      // 🔒 SECURITY: Use API route for deletion
      const response = await fetch(`/api/admin/editorial?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      setArticles(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('[ADMIN_DELETE] Error:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    const payload = {
      title: formData.title,
      description: formData.excerpt,
      category: 'magazine',
      release_date: formData.release_date,
    };

    try {
      if (viewMode === 'create') {
        // For new magazines, redirect to upload page
        window.location.href = `/admin/upload?type=magazine&title=${encodeURIComponent(formData.title)}&date=${formData.release_date}`;
        return;
      } else if (selectedArticle) {
        // 🔒 SECURITY: Use API route for update
        const response = await fetch('/api/admin/editorial', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedArticle.id,
            ...payload,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Update failed');
        }

        await fetchArticles();
        setViewMode('list');
      }
    } catch (err) {
      console.error('[ADMIN_SAVE] Error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
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
            Magazine Archive Management System
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
            <span className="text-sm font-medium">New Magazine</span>
          </motion.button>
        )}
      </motion.div>

      {/* List View - Horizontal Item List */}
      <AnimatePresence mode="wait">
        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-2"
          >
            {/* List Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b text-xs font-mono font-medium tracking-wider"
              style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div className="col-span-1 text-white/40">#</div>
              <div className="col-span-4 text-white/40">TITLE</div>
              <div className="col-span-2 text-white/40">DATE</div>
              <div className="col-span-2 text-white/40">CATALOG_ID</div>
              <div className="col-span-3 text-white/40 text-right">ACTIONS</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-lmsy-yellow/60 animate-spin" />
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-20 border border-dashed rounded-lg" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                <p className="text-white/30 font-light">No magazines in archive</p>
              </div>
            ) : (
              articles.map((article, index) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group relative grid grid-cols-12 gap-4 px-4 py-3 border items-center hover:bg-white/[0.02] transition-colors"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  {/* Index */}
                  <div className="col-span-1 text-white/30 font-mono text-sm">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  {/* Thumbnail + Title */}
                  <div className="col-span-4 flex items-center gap-3">
                    {/* Mini Thumbnail */}
                    <div className="relative w-12 h-16 flex-shrink-0 bg-white/5 rounded overflow-hidden">
                      {article.cover_url && (
                        <Image
                          src={article.cover_url}
                          alt={article.title || 'Cover'}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm text-white/80 font-serif truncate">
                        {article.title || 'Untitled Magazine'}
                      </h3>
                      {article.description && (
                        <p className="text-[10px] text-white/30 font-mono truncate mt-0.5">
                          {article.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="col-span-2">
                    {article.release_date ? (
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Calendar className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                        <span className="font-mono tracking-wide">
                          {new Date(article.release_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-white/20 font-mono">—</span>
                    )}
                  </div>

                  {/* Catalog ID */}
                  <div className="col-span-2">
                    <span className="text-xs font-mono text-white/40 tracking-wider">
                      {article.catalog_id || 'N/A'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-3 flex items-center justify-end gap-1">
                    {/* Curate Button - Mirror Edit */}
                    <Link
                      href={`/admin/editorial/${article.id}/curate`}
                      className="p-1.5 text-white/20 hover:text-lmsy-blue/60 hover:bg-lmsy-blue/5 transition-all rounded"
                      title="Curate Pages"
                    >
                      <Images className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>

                    <button
                      onClick={() => handleEdit(article)}
                      className="p-1.5 text-white/20 hover:text-lmsy-yellow/60 hover:bg-lmsy-yellow/5 transition-all rounded"
                    >
                      <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="p-1.5 text-white/20 hover:text-red-400/80 hover:bg-red-500/5 transition-all rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>

                  {/* Hover Border */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded"
                    style={{
                      border: '1px solid transparent',
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(56, 189, 248, 0.15)) border-box',
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
            <div className="col-span-12 lg:col-span-7 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-xs font-mono text-white/30 tracking-wider uppercase mb-3">
                  Magazine Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Magazine title..."
                  className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors text-lg"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                />
              </div>

              {/* Description/Excerpt */}
              <div>
                <label className="block text-xs font-mono text-white/30 tracking-wider uppercase mb-3">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Brief description..."
                  className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                />
              </div>

              {/* Release Date */}
              <div>
                <label className="block text-xs font-mono text-white/30 tracking-wider uppercase mb-3">
                  Release Date
                </label>
                <input
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/90 focus:outline-none focus:border-lmsy-yellow/40 transition-colors"
                />
              </div>

              {/* Note about upload */}
              <div className="p-4 bg-lmsy-yellow/5 border border-lmsy-yellow/20 rounded-lg">
                <p className="text-xs text-lmsy-yellow/80 font-mono">
                  ℹ️ For new magazines, click Save to proceed to the upload page where you can add the cover image and additional pages.
                </p>
              </div>
            </div>

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
                      <p className="text-white/20 text-sm">Cover via upload</p>
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
                    <span>{viewMode === 'create' ? 'Continue to Upload' : 'Save Changes'}</span>
                  </motion.button>
                  <button
                    onClick={() => setViewMode('list')}
                    className="px-4 py-3 rounded-lg border border-white/10 text-white/40 hover:text-white/60 hover:bg-white/5 transition-all duration-200"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
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
