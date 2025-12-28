'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

// Sample gallery data - will be replaced with Supabase data
const galleryItems = [
  { id: '1', image_url: '', caption: 'Behind the scenes', tag: 'BehindTheScene', is_featured: true },
  { id: '2', image_url: '', caption: 'Fashion shoot', tag: 'Fashion', is_featured: true },
  { id: '3', image_url: '', caption: 'Affair promotion', tag: 'Affair', is_featured: false },
  { id: '4', image_url: '', caption: 'Magazine cover', tag: 'Magazine', is_featured: true },
  { id: '5', image_url: '', caption: 'Casual moments', tag: 'BehindTheScene', is_featured: false },
  { id: '6', image_url: '', caption: 'Red carpet', tag: 'Fashion', is_featured: true },
  { id: '7', image_url: '', caption: 'On set memories', tag: 'Affair', is_featured: false },
  { id: '8', image_url: '', caption: 'Photo diary', tag: 'BehindTheScene', is_featured: true },
  { id: '9', image_url: '', caption: 'Style moments', tag: 'Fashion', is_featured: false },
];

const gradients = [
  'from-rose-100 to-rose-200',
  'from-amber-100 to-amber-200',
  'from-pink-100 to-pink-200',
  'from-purple-100 to-purple-200',
  'from-orange-100 to-orange-200',
];

export default function GalleryPage() {
  const [selectedTag, setSelectedTag] = useState('All');
  const { language } = useLanguage();

  const tags = [
    { key: 'gallery.tagAll', value: 'All' },
    { key: 'gallery.tagFashion', value: 'Fashion' },
    { key: 'gallery.tagBehindTheScene', value: 'BehindTheScene' },
    { key: 'gallery.tagAffair', value: 'Affair' },
    { key: 'gallery.tagMagazine', value: 'Magazine' },
  ];

  const filteredItems = selectedTag === 'All'
    ? galleryItems
    : galleryItems.filter(item => item.tag === selectedTag);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="pt-24 pb-8 md:pt-32 md:pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6">
              {t(language, 'gallery.title')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              {t(language, 'gallery.description')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tag Filter */}
      <section className="pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-wrap gap-3"
          >
            {tags.map((tag) => (
              <button
                key={tag.value}
                onClick={() => setSelectedTag(tag.value)}
                className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  selectedTag === tag.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                }`}
              >
                #{t(language, tag.key as any)}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Masonry Gallery */}
      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            layout
            className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6"
          >
            <AnimatePresence>
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="break-inside-avoid"
                >
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="group relative overflow-hidden rounded-sm magazine-shadow cursor-pointer">
                        <div className={`relative aspect-[3/4] bg-gradient-to-br ${gradients[index % gradients.length]} dark:opacity-80`}>
                          {/* Placeholder gradient for images */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                        </div>

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Caption */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <span className="text-champagne text-xs font-medium tracking-wider">
                            #{item.tag}
                          </span>
                          <p className="text-white font-serif text-lg mt-1">{item.caption}</p>
                        </div>

                        {/* Search Icon on Hover */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-white/90 backdrop-blur rounded-full p-2">
                            <Search className="h-4 w-4 text-foreground" />
                          </div>
                        </div>
                      </div>
                    </DialogTrigger>

                    <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-none">
                      <div className="relative aspect-[3/4] w-full bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-950/30 rounded-sm overflow-hidden">
                        {/* Full size placeholder */}
                        <button
                          onClick={() => (document.querySelector('[data-state="open"]') as HTMLElement)?.click()}
                          className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur rounded-full p-2 hover:bg-white transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-8 left-8 right-8">
                          <span className="text-champagne text-sm font-medium tracking-wider">
                            #{item.tag}
                          </span>
                          <p className="text-white font-serif text-2xl mt-2 drop-shadow-lg">{item.caption}</p>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {filteredItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-muted-foreground">{t(language, 'gallery.noImages')}</p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
