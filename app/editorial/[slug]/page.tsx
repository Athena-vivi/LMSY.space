'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { ArrowLeft, ArrowRight, Calendar, Camera, Scissors, Sparkles } from 'lucide-react';
import { X } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Publication {
  id: string;
  mag_name: string;
  slug: string;
  issue_date: string;
  cover_url: string;
  images: string[];
  credits: Record<string, string>;
  description: string;
}

export default function EditorialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPublication() {
      if (!params.slug) return;

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('publications')
          .select('*')
          .eq('slug', params.slug)
          .single();

        if (error) {
          console.error('Error fetching publication:', error);
        } else {
          setPublication(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPublication();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!publication) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-serif text-2xl mb-4">Publication not found</h2>
          <Link href="/editorial" className="text-lmsy-blue hover:underline">
            Back to Editorial
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'th' ? 'th-TH' : language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/editorial"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t(language, 'editorial.backToGallery')}</span>
            </Link>

            <h1 className="font-serif text-sm tracking-widest uppercase text-muted-foreground">
              Editorial
            </h1>
          </div>
        </div>
      </header>

      {/* Hero - Cover Image */}
      <section className="pt-20">
        <div className="relative aspect-[3/4] md:aspect-[16/9] w-full overflow-hidden">
          <Image
            src={publication.cover_url}
            alt={publication.mag_name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
                {publication.mag_name}
              </h1>
              <div className="flex items-center gap-2 text-white/80">
                <Calendar className="w-4 h-4" />
                <span className="text-sm md:text-base">{formatDate(publication.issue_date)}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Description */}
      {publication.description && (
        <section className="py-16 md:py-24 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="max-w-4xl mx-auto text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="font-serif text-xl md:text-2xl lg:text-3xl text-foreground/90 leading-relaxed italic">
                "{publication.description}"
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* Credits Section */}
      <section className="py-12 md:py-16 border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-2xl md:text-3xl font-bold mb-8 text-center">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                Credits
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(publication.credits || {}).map(([key, value], index) => (
                <motion.div
                  key={key}
                  className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border/50"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20 flex items-center justify-center">
                    {key === 'photographer' && <Camera className="w-5 h-5 text-lmsy-yellow" />}
                    {key === 'stylist' && <Scissors className="w-5 h-5 text-lmsy-blue" />}
                    {!['photographer', 'stylist'].includes(key) && <Sparkles className="w-5 h-5 text-lmsy-yellow" />}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {t(language, `editorial.${key}` as any) || key}
                    </p>
                    <p className="font-medium text-foreground">{value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Image Gallery */}
      {publication.images && publication.images.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
              {publication.images.map((imageUrl, index) => (
                <motion.div
                  key={index}
                  className="group relative aspect-[3/4] overflow-hidden rounded-2xl cursor-pointer"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <Image
                    src={imageUrl}
                    alt={`${publication.mag_name} - Image ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                  {/* View Indicator */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs">
                      Click to enlarge
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImageIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedImageIndex(null)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageIndex(null);
              }}
              className="absolute top-4 right-4 p-2 text-white hover:text-lmsy-yellow transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation */}
            {selectedImageIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(selectedImageIndex - 1);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white hover:text-lmsy-yellow transition-colors"
              >
                <ArrowLeft className="w-8 h-8" />
              </button>
            )}

            {selectedImageIndex < (publication.images?.length || 0) - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(selectedImageIndex + 1);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white hover:text-lmsy-yellow transition-colors"
              >
                <ArrowRight className="w-8 h-8" />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={selectedImageIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl max-h-[90vh] w-full"
            >
              <Image
                src={publication.images?.[selectedImageIndex] || publication.cover_url}
                alt="Enlarged view"
                width={1200}
                height={1600}
                className="w-full h-full object-contain"
              />
            </motion.div>

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm">
              {selectedImageIndex + 1} / {publication.images?.length || 1}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
