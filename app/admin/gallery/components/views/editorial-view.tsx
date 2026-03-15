'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Save, Loader2, Calendar, Images, Home } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCdnUrl, formatDate } from '../../utils';
import type { Project } from '@/lib/supabase';

interface EditorialViewProps {
  data: {
    projects: Project[];
  };
  loading: boolean;
}

type ViewMode = 'grid' | 'create' | 'edit';

export function EditorialView({ data, loading }: EditorialViewProps) {
  const articles = data.projects.filter((p) => p.category === 'editorial');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedArticle, setSelectedArticle] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    category: 'editorial',
    release_date: new Date().toISOString().split('T')[0],
    homepage_featured: false,
    homepage_excerpt: '',
    homepage_cover_url: '',
  });

  const handleCreate = () => {
    setSelectedArticle(null);
    setFormData({
      title: '',
      excerpt: '',
      category: 'editorial',
      release_date: new Date().toISOString().split('T')[0],
      homepage_featured: false,
      homepage_excerpt: '',
      homepage_cover_url: '',
    });
    setViewMode('create');
  };

  const handleEdit = (article: Project) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title || '',
      excerpt: article.description || '',
      category: article.category || 'editorial',
      release_date: article.release_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      homepage_featured: !!article.homepage_featured,
      homepage_excerpt: article.homepage_excerpt || '',
      homepage_cover_url: article.homepage_cover_url || '',
    });
    setViewMode('edit');
  };

  const getAuthHeaders = async (includeJson = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this editorial project?')) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/editorial?id=${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Delete failed');
      }

      window.location.reload();
    } catch (err) {
      console.error('[ADMIN_DELETE] Error:', err);
      alert('Failed to delete editorial');
    }
  };

  const handleSetHomepageFeature = async (article: Project) => {
    setSaving(true);

    try {
      const headers = await getAuthHeaders(true);
      const response = await fetch('/api/admin/editorial', {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          id: article.id,
          title: article.title,
          description: article.description,
          category: article.category,
          release_date: article.release_date,
          homepage_featured: !article.homepage_featured,
          homepage_excerpt: article.homepage_excerpt || article.description || '',
          homepage_cover_url: article.homepage_cover_url || article.cover_url || '',
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update Featured Interview');
      }

      window.location.reload();
    } catch (err) {
      console.error('[EDITORIAL_FEATURE] Error:', err);
      alert('Failed to update Featured Interview');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      if (viewMode === 'create') {
        window.location.href = `/admin/upload?type=magazine&title=${encodeURIComponent(formData.title)}&date=${formData.release_date}`;
        return;
      }

      if (selectedArticle) {
        const headers = await getAuthHeaders(true);
        const response = await fetch('/api/admin/editorial', {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            id: selectedArticle.id,
            title: formData.title,
            description: formData.excerpt,
            category: formData.category,
            release_date: formData.release_date,
            homepage_featured: formData.homepage_featured,
            homepage_excerpt: formData.homepage_excerpt,
            homepage_cover_url: formData.homepage_cover_url,
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Update failed');
        }

        window.location.reload();
      }
    } catch (err) {
      console.error('[ADMIN_SAVE] Error:', err);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-lmsy-yellow/60 animate-spin" />
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {viewMode === 'grid' && (
        <motion.div
          key="grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
          <div className="flex justify-end">
            <motion.button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-lmsy-yellow/30 rounded-lg text-lmsy-yellow/90 transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              <span className="text-sm font-medium">New Magazine</span>
            </motion.button>
          </div>

          {articles.length === 0 ? (
            <div className="text-center py-20 border border-dashed rounded-lg" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
              <p className="text-white/30 font-light">No magazines in archive</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {articles.map((article, index) => {
                const coverUrl = getCdnUrl(article.homepage_cover_url || article.cover_url || null);
                const summary = article.homepage_excerpt || article.description || '';

                return (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="group overflow-hidden rounded-xl border border-white/10 bg-black"
                  >
                    <div className="relative aspect-[4/5] bg-white/5">
                      {coverUrl ? (
                        <Image
                          src={coverUrl}
                          alt={article.title || 'Editorial cover'}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-mono text-white/20">
                          NO_COVER
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                      <div className="absolute top-3 left-3 flex gap-2">
                        {article.homepage_featured && (
                          <span className="px-2 py-1 border border-lmsy-yellow/40 bg-lmsy-yellow/15 text-[10px] font-mono text-lmsy-yellow">
                            FEATURED_INTERVIEW
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                        <h3 className="font-serif text-xl text-white/90">
                          {article.title || 'Untitled Magazine'}
                        </h3>
                        {article.release_date && (
                          <div className="flex items-center gap-2 text-[11px] font-mono text-white/50">
                            <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>{formatDate(article.release_date)}</span>
                          </div>
                        )}
                        {summary && (
                          <p className="line-clamp-2 text-sm text-white/55">
                            {summary}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 border-t border-white/10 bg-black/90">
                      <button
                        onClick={() => handleSetHomepageFeature(article)}
                        disabled={saving}
                        className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-mono border transition-all ${
                          article.homepage_featured
                            ? 'border-lmsy-yellow/40 text-lmsy-yellow bg-lmsy-yellow/10'
                            : 'border-white/15 text-white/60 hover:border-lmsy-yellow/30 hover:text-lmsy-yellow/80'
                        }`}
                      >
                        <Home className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {article.homepage_featured ? 'UNSET_FEATURED' : 'SET_FEATURED'}
                      </button>

                      <Link
                        href={`/admin/editorial/${article.id}/curate`}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-mono border border-white/15 text-white/60 hover:border-lmsy-blue/30 hover:text-lmsy-blue/80 transition-all"
                      >
                        <Images className="h-3.5 w-3.5" strokeWidth={1.5} />
                        CURATE
                      </Link>

                      <button
                        onClick={() => handleEdit(article)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-mono border border-white/15 text-white/60 hover:border-lmsy-yellow/30 hover:text-lmsy-yellow/80 transition-all"
                      >
                        <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        EDIT
                      </button>

                      <button
                        onClick={() => handleDelete(article.id)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-mono border border-white/15 text-white/60 hover:border-red-400/30 hover:text-red-400/80 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        DELETE
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <motion.div
          key="editor"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="grid grid-cols-12 gap-8"
        >
          <div className="col-span-12 lg:col-span-7 space-y-6">
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

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-mono text-white/40 tracking-wider uppercase">
                <input
                  type="checkbox"
                  checked={formData.homepage_featured}
                  onChange={(e) => setFormData({ ...formData, homepage_featured: e.target.checked })}
                  className="w-4 h-4"
                />
                Homepage Featured Interview
              </label>
              <input
                type="text"
                value={formData.homepage_excerpt}
                onChange={(e) => setFormData({ ...formData, homepage_excerpt: e.target.value })}
                placeholder="Homepage excerpt override..."
                className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
              />
              <input
                type="text"
                value={formData.homepage_cover_url}
                onChange={(e) => setFormData({ ...formData, homepage_cover_url: e.target.value })}
                placeholder="Homepage cover URL override..."
                className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
              />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <div className="sticky top-8 space-y-6">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-white/5 border" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white/20 text-sm">Cover via upload</p>
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={handleSave}
                  disabled={saving || !formData.title}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-black font-medium transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.9), rgba(56, 189, 248, 0.9))',
                    boxShadow: '0 0 30px rgba(251, 191, 36, 0.3), 0 0 60px rgba(56, 189, 248, 0.2)',
                  }}
                  whileHover={{ scale: saving ? 1 : 1.02 }}
                  whileTap={{ scale: 1 }}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" strokeWidth={1.5} />
                  )}
                  <span>{viewMode === 'create' ? 'Continue to Upload' : 'Save Changes'}</span>
                </motion.button>
                <button
                  onClick={() => setViewMode('grid')}
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
  );
}
