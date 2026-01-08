'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { supabase, type GalleryItem } from '@/lib/supabase';
import Lightbox from './lightbox';
import { CompactCatalogNumber } from '@/components/catalog-number';

const gradients = [
  'from-lmsy-yellow/20 to-lmsy-yellow/5',
  'from-lmsy-blue/20 to-lmsy-blue/5',
  'from-purple-500/20 to-purple-500/5',
  'from-pink-500/20 to-pink-500/5',
  'from-amber-500/20 to-amber-500/5',
];

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [lightboxImage, setLightboxImage] = useState<GalleryItem | null>(null);
  const { language } = useLanguage();

  // Fetch images from Supabase
  useEffect(() => {
    async function fetchImages() {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('gallery')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          // Silently handle error - likely not configured yet
          setImages([]);
        } else {
          setImages(data || []);
        }
      } catch (err) {
        // Catch any network or initialization errors
        setImages([]);
      } finally {
        setLoading(false);
      }
    }

    fetchImages();
  }, []);

  const tags = [
    { key: 'gallery.tagAll', value: 'All' },
    { key: 'gallery.tagFashion', value: 'Fashion' },
    { key: 'gallery.tagBehindTheScene', value: 'BehindTheScene' },
    { key: 'gallery.tagAffair', value: 'Affair' },
    { key: 'gallery.tagMagazine', value: 'Magazine' },
  ];

  const filteredImages = selectedTag === 'All'
    ? images
    : images.filter(item => item.tag === selectedTag);

  const openLightbox = useCallback((image: GalleryItem) => {
    setLightboxImage(image);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
  }, []);

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
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6 font-bold text-foreground tracking-tight">
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
                className={`px-6 py-2.5 text-sm font-medium transition-all duration-300 rounded-full border ${
                  selectedTag === tag.value
                    ? 'bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground border-transparent shadow-lg shadow-lmsy-yellow/20'
                    : 'bg-muted text-muted-foreground border-border hover:border-lmsy-blue hover:text-lmsy-blue'
                }`}
              >
                #{t(language, tag.key as any)}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-lg bg-muted animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Masonry Gallery with Lazy Loading */}
      {!loading && (
        <section className="pb-24 md:pb-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              layout
              className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6"
            >
              <AnimatePresence>
                {filteredImages.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="break-inside-avoid"
                  >
                    <div
                      className="group relative overflow-hidden rounded-lg border-2 border-border magazine-shadow cursor-pointer"
                      onClick={() => openLightbox(item)}
                    >
                      {/* Image with Lazy Loading and Blur-up */}
                      <div className="relative aspect-[3/4] bg-muted">
                        {item.image_url ? (
                          <>
                            {/* Blur placeholder */}
                            <div
                              className={`absolute inset-0 bg-gradient-to-br ${gradients[index % gradients.length]} blur-xl`}
                            />

                            {/* Actual image */}
                            <Image
                              src={item.image_url}
                              alt={item.caption || item.tag || 'Gallery image'}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                              loading="lazy"
                              placeholder="blur"
                              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+OjMLzvtADmF0br/iI2p09qeH0Sti2cYR2u0bkjZTgH4++NJ9e6t/Ps2bpJ0H396kN1tJbNk4yJ+YGqZ1T6TTN+qyJ6m5cVZKXaSOpOjPqLxP0l0qCzkkFh6RHAKHnKlC0c="
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                          </>
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index % gradients.length]}`} />
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Catalog Number - Always Visible */}
                        <div className="absolute bottom-2 right-2 opacity-60 hover:opacity-100 transition-opacity">
                          <CompactCatalogNumber
                            id={item.id}
                            createdAt={item.created_at}
                            index={index}
                          />
                        </div>

                        {/* Tag Badge */}
                        {item.tag && (
                          <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="px-3 py-1 text-xs font-medium bg-white/90 backdrop-blur rounded-full text-foreground">
                              #{item.tag}
                            </span>
                          </div>
                        )}

                        {/* Zoom Icon on Hover */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-white/90 backdrop-blur rounded-full p-2 shadow-lg">
                            <ZoomIn className="h-4 w-4 text-foreground" />
                          </div>
                        </div>

                        {/* Caption */}
                        {item.caption && (
                          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                            <p className="text-white font-serif text-lg drop-shadow-lg">
                              {item.caption}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Empty State / Under Construction */}
            {!loading && filteredImages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="max-w-md mx-auto">
                  {/* Animated Sparkle Icon */}
                  <motion.div
                    className="mx-auto w-16 h-16 mb-6"
                    animate={{
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <div className="relative w-full h-full">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lmsy-yellow to-lmsy-blue blur-md opacity-50 animate-pulse" />
                      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-lmsy-yellow to-lmsy-blue flex items-center justify-center">
                        <span className="text-3xl">✨</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Message */}
                  <h3 className="font-serif text-2xl font-bold text-foreground mb-4">
                    {language === 'zh' ? '画廊建设中' : language === 'th' ? 'หอศิลป์กำลังสร้าง' : 'Gallery Under Construction'}
                  </h3>
                  <p className="text-muted-foreground text-lg mb-6">
                    {language === 'zh'
                      ? '我们正在精心策划每一张照片，敬请期待...'
                      : language === 'th'
                      ? 'เรากำลังคัดสรรภาพถ่ายทุกภาพอย่างพิถีพิถัน อดใจรอสักครู่...'
                      : 'We are carefully curating every photo. Stay tuned...'}
                  </p>

                  {/* Decorative Line */}
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-lmsy-yellow" />
                    <div className="w-2 h-2 rounded-full bg-lmsy-yellow animate-pulse" />
                    <div className="h-px w-16 bg-gradient-to-l from-transparent to-lmsy-blue" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <Lightbox
            image={lightboxImage}
            images={filteredImages}
            onClose={closeLightbox}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
