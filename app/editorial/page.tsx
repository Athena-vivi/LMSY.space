'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { ArrowRight, Calendar, Camera } from 'lucide-react';

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

export default function EditorialPage() {
  const { language } = useLanguage();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPublications() {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('publications')
          .select('*')
          .order('issue_date', { ascending: false });

        if (error) {
          console.error('Error fetching publications:', error);
          setPublications([]);
        } else {
          setPublications(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
        setPublications([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPublications();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-gradient-radial from-lmsy-yellow/5 via-lmsy-blue/3 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Label */}
            <motion.span
              className="inline-block text-xs md:text-sm font-medium tracking-widest uppercase px-4 py-2 rounded-full border border-lmsy-yellow/30 text-lmsy-yellow bg-lmsy-yellow/5 mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {t(language, 'editorial.title').toUpperCase()}
            </motion.span>

            {/* Title */}
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                {t(language, 'editorial.title')}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground font-light">
              {t(language, 'editorial.subtitle')}
            </p>

            {/* Decorative Line */}
            <motion.div
              className="mx-auto mt-8 w-24 h-1 bg-gradient-to-r from-lmsy-yellow via-lmsy-blue to-lmsy-yellow rounded-full"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            />
          </motion.div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-2xl bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          ) : publications.length === 0 ? (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="max-w-md mx-auto">
                <Camera className="mx-auto w-16 h-16 text-muted-foreground/30 mb-6" />
                <h3 className="font-serif text-2xl font-bold text-foreground mb-4">
                  {t(language, 'editorial.noIssues')}
                </h3>
                <p className="text-muted-foreground">
                  {t(language, 'editorial.comingSoon')}
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {publications.map((pub, index) => (
                <PublicationCard
                  key={pub.id}
                  publication={pub}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

interface PublicationCardProps {
  publication: Publication;
  index: number;
}

function PublicationCard({ publication, index }: PublicationCardProps) {
  const { language } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'th' ? 'th-TH' : language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group"
    >
      <Link href={`/editorial/${publication.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted/30">
          {/* Cover Image with Fade-in */}
          <div className={`absolute inset-0 transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <Image
              src={publication.cover_url}
              alt={publication.mag_name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* Loading Placeholder */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/70 animate-pulse" />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

          {/* Duo Color Border */}
          <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-lmsy-yellow/30 via-lmsy-blue/30 to-lmsy-yellow/30 p-[2px]">
            <div className="absolute inset-0 rounded-2xl bg-background/0" />
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            {/* Magazine Name */}
            <motion.h3
              className="font-serif text-2xl md:text-3xl font-bold text-white mb-3"
              style={{
                background: 'linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(56, 189, 248) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {publication.mag_name}
            </motion.h3>

            {/* Date */}
            <div className="flex items-center gap-2 text-white/80 text-sm mb-3">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(publication.issue_date)}</span>
            </div>

            {/* Photographer */}
            {publication.credits?.photographer && (
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <Camera className="w-3 h-3" />
                <span>{publication.credits.photographer}</span>
              </div>
            )}

            {/* Arrow Indicator */}
            <motion.div
              className="flex items-center gap-2 text-white/80 mt-4"
              initial={{ x: 0 }}
              whileHover={{ x: 5 }}
            >
              <span className="text-xs tracking-wider">{t(language, 'editorial.viewIssue').toUpperCase()}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
