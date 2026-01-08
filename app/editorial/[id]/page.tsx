'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { BackButton } from '@/components/back-button';
import { supabase } from '@/lib/supabase/client';

interface Magazine {
  id: string;
  title: string;
  category: string;
  cover_url: string;
  release_date: string;
  description: string | null;
  catalog_id: string | null;
  blur_data: string | null;
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  blur_data: string | null;
}

export default function EditorialDetailPage() {
  const params = useParams();
  const magazineId = params.id as string;

  const [magazine, setMagazine] = useState<Magazine | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [curatorNote, setCuratorNote] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMagazineData() {
      try {
        // Fetch magazine project
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', magazineId)
          .eq('category', 'magazine')
          .single();

        if (projectError) {
          console.error('Failed to fetch magazine:', projectError);
          return;
        }

        setMagazine(project);

        // Fetch gallery images linked to this project
        const { data: images, error: imagesError } = await supabase
          .from('gallery')
          .select('*')
          .eq('project_id', magazineId)
          .order('created_at', { ascending: true });

        if (imagesError) {
          console.error('Failed to fetch gallery images:', imagesError);
        } else {
          setGalleryImages(images || []);
        }

        // Set curator note (can be from project description or custom note)
        setCuratorNote(project.description);
      } catch (err) {
        console.error('Error fetching magazine data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (magazineId) {
      fetchMagazineData();
    }
  }, [magazineId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border border-white/10 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!magazine) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Magazine not found</p>
          <Link href="/editorial" className="text-lmsy-yellow/80 hover:text-lmsy-yellow">
            ← Back to Editorial
          </Link>
        </div>
      </div>
    );
  }

  const totalArtifacts = galleryImages.length + 1; // +1 for cover

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="relative z-10 px-6 py-8 md:px-12 md:py-12 border-b border-white/5">
        <div className="flex items-start justify-between max-w-7xl mx-auto">
          <BackButton />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-right"
          >
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2 text-white/90">
              {magazine.title}
            </h1>
            <p className="font-mono text-xs text-white/40 tracking-[0.3em]">
              {magazine.catalog_id || 'LMSY-ED'}
            </p>
          </motion.div>
        </div>
      </header>

      {/* Magazine Header Section */}
      <section className="relative px-6 py-16 md:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Date and Artifact Count */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <p className="font-mono text-4xl md:text-6xl font-bold text-white/90 mb-2">
                {formatDate(magazine.release_date)}
              </p>
              <p className="font-mono text-xs text-white/40 tracking-[0.2em] uppercase">
                Release Date
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl md:text-5xl font-bold text-lmsy-yellow/80">
                {totalArtifacts}
              </p>
              <p className="font-mono text-xs text-white/40 tracking-[0.2em] uppercase">
                Artifacts Preserved
              </p>
            </div>
          </motion.div>

          {/* Curator's Note */}
          {curatorNote && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-12 p-6 border border-white/10 rounded-lg bg-white/[0.02]"
            >
              <p className="font-mono text-[10px] text-lmsy-yellow/60 tracking-[0.2em] uppercase mb-3">
                Curator's Note
              </p>
              <p className="font-serif text-lg md:text-xl text-white/80 leading-relaxed">
                {curatorNote}
              </p>
            </motion.div>
          )}

          {/* Magazine Cover - Full Size */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="relative mb-16"
          >
            <div className="relative aspect-[3/4] w-full max-w-2xl mx-auto overflow-hidden rounded-lg bg-white/[0.02] border border-white/10">
              <Image
                src={magazine.cover_url}
                alt={magazine.title}
                fill
                className="object-contain"
                placeholder="blur"
                blurDataURL={magazine.blur_data || 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyL/wAARCADIAeAADAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Jj9T5r6JzH8qg9hjtiT0OqT5VoT8VfG8a8M+Jt0X05ZT6bqHKKqWpSmJySMipW0pJzaX4JMqopJlEYxjmUxlJcqWpSmQyOV5UqTlKUhlKcYyxnKCUooyinKcIyinCUYxjmOclSjmKcYynCUYxjmOclSnGMZzjlKcYynGMZzjlKUoRylKMUoypTFKMUwplylMUwplyjGMU5ylKMUoRylGMQ=='}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Gallery Section - Masonry Layout */}
      {galleryImages.length > 0 && (
        <section className="relative px-6 pb-20 md:px-12">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mb-8"
            >
              <h2 className="font-serif text-2xl md:text-3xl text-white/80 mb-2">
                Inside This Issue
              </h2>
              <p className="font-mono text-xs text-white/40 tracking-[0.2em] uppercase">
                {galleryImages.length} Pages Preserved
              </p>
            </motion.div>

            {/* Masonry Grid using CSS Columns */}
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              <AnimatePresence>
                {galleryImages.map((image, index) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
                    className="break-inside-avoid relative group"
                  >
                    <div className="relative overflow-hidden rounded-lg bg-white/[0.02] border border-white/10">
                      {/* Image - object-contain preserves full image */}
                      <div className="relative w-full">
                        <Image
                          src={image.image_url}
                          alt={image.caption || `Page ${index + 1}`}
                          width={800}
                          height={Math.max(600, 800 * (Math.random() * 0.5 + 0.75))} // Random height for masonry effect
                          className="w-full h-auto object-contain"
                          placeholder="blur"
                          blurDataURL={image.blur_data || 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyL/wAARCADIAeAADAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Jj9T5r6JzH8qg9hjtiT0OqT5VoT8VfG8a8M+Jt0X05ZT6bqHKKqWpSmJySMipW0pJzaX4JMqopJlEYxjmUxlJcqWpSmQyOV5UqTlKUhlKcYyxnKCUooyinKcIyinCUYxjmOclSjmKcYynCUYxjmOclSnGMZzjlKcYynGMZzjlKUoRylKMUoypTFKMUwplylMUwplyjGMU5ylKMUoRylGMQ=='}
                        />
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Caption */}
                      {image.caption && (
                        <motion.div
                          className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          initial={{ y: 10 }}
                          whileHover={{ y: 0 }}
                        >
                          <p className="font-mono text-xs text-white/90">
                            {image.caption}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-mono text-[10px] text-white/20 tracking-[0.3em] uppercase">
            LMSY.SPACE · MAGAZINE_ARCHIVE · {magazine.catalog_id || 'LMSY-ED'} · {totalArtifacts} ARTIFACTS
          </p>
        </div>
      </footer>
    </div>
  );
}
