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
import { BackButton } from '@/components/back-button';

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
          {/* Back Button */}
          <div className="mb-8">
            <BackButton />
          </div>

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
                      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] cursor-pointer magazine-shadow"
                      onClick={() => openLightbox(item)}
                    >
                      {/* 🎨 Image with NATURAL aspect ratio - Gallery Grade Masonry */}
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.caption || item.tag || 'Gallery image'}
                          width={0}
                          height={0}
                          sizes="100vw"
                          className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                          placeholder={item.blur_data ? "blur" : "empty"}
                          blurDataURL={item.blur_data || undefined}
                          priority={index === 0}
                          unoptimized
                        />
                      ) : (
                        <div className={`w-full aspect-[3/4] bg-gradient-to-br ${gradients[index % gradients.length]}`} />
                      )}

                      {/* 🌌 Nebula Hover Glow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* 📖 Catalog Number - Always visible */}
                      <div className="absolute bottom-2 right-2 opacity-60 hover:opacity-100 transition-opacity">
                        <CompactCatalogNumber
                          id={item.id}
                          createdAt={item.created_at}
                          index={index}
                        />
                      </div>

                      {/* 🏷️ Tag Badge - Top Left */}
                      {item.tag && (
                        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="px-3 py-1 text-xs font-medium bg-black/50 backdrop-blur-sm rounded-full text-white/90 border border-white/10">
                            #{item.tag}
                          </span>
                        </div>
                      )}

                      {/* 🔍 Zoom Icon - Top Right */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-black/50 backdrop-blur-sm rounded-full p-2 border border-white/10">
                          <ZoomIn className="h-4 w-4 text-white" />
                        </div>
                      </div>

                      {/* 📝 Caption - Bottom */}
                      {item.caption && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <p className="text-white font-serif text-sm line-clamp-2 drop-shadow-lg">
                            {item.caption}
                          </p>
                        </div>
                      )}
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
