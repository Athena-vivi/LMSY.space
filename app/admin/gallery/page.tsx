'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Search, Filter } from 'lucide-react';
import Image from 'next/image';
import { supabase, type GalleryItem } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('');

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setImages(data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    const { error } = await supabase.from('gallery').delete().eq('id', id);
    if (!error) {
      setImages(prev => prev.filter(img => img.id !== id));
    }
  };

  const filteredImages = images.filter(img =>
    (img.caption?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    (img.tag?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  ).filter(img => !filterTag || img.tag === filterTag);

  const uniqueTags = [...new Set(images.map(img => img.tag).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold text-foreground mb-2">
          Gallery Management
        </h1>
        <p className="text-muted-foreground">
          Manage all gallery images, tags, and metadata
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tag or caption..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-lmsy-yellow"
          />
        </div>

        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-lmsy-blue"
        >
          <option value="">All Tags</option>
          {uniqueTags.map(tag => (
            <option key={tag || ''} value={tag || ''}>{tag}</option>
          ))}
        </select>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredImages.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="group relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-border"
          >
            {item.image_url && (
              <Image
                src={item.image_url}
                alt={item.caption || item.tag || 'Gallery image'}
                fill
                className="object-cover"
              />
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                {item.tag && (
                  <span className="inline-block px-2 py-1 mb-2 text-xs bg-lmsy-yellow text-black rounded-full font-medium">
                    #{item.tag}
                  </span>
                )}
                {item.caption && (
                  <p className="text-white text-sm line-clamp-2">{item.caption}</p>
                )}
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => {/* TODO: Edit modal */}}
                  className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
                >
                  <Edit2 className="h-4 w-4 text-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredImages.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">No images found</p>
        </div>
      )}
    </div>
  );
}
