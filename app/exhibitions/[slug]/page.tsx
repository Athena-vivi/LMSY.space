'use client';

import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Camera } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

// Temporary exhibition data - will be fetched from Supabase based on slug
const exhibitionsData: Record<string, any> = {
  'indigo-dawn': {
    id: '1',
    slug: 'indigo-dawn',
    title: 'Indigo Dawn',
    titleZh: '靛蓝黎明',
    range: 'G-001 ~ G-042',
    curatorNote: 'An exploration of the threshold between night and day, where indigo dreams meet golden reality.',
    curatorNoteZh: '对昼夜门槛的探索，靛蓝的梦境与金色的现实在此交汇。',
    markdownContent: `
# Indigo Dawn

## 策展语 Curator's Note

In the quiet hours before sunrise, the world is painted in shades of indigo. This exhibition captures those fleeting moments—the threshold between night and day where reality softens and dreams emerge.

## The Collection

Each photograph in this series was captured during the "blue hour," that magical time when the sky transforms from deep indigo to soft golden hues. These 42 images form a visual narrative of transition, of becoming, of the perpetual dance between darkness and light.

## Artistic Vision

> "Photography is the art of capturing not just what we see, but what we feel in the spaces between moments."

The indigo palette represents more than just a color—it is the color of anticipation, of possibility, of the infinite potential that exists in the liminal spaces.
    `,
    images: [
      // Will be fetched from Supabase gallery table
      // where is_editorial = true AND tag = 'indigo-dawn'
    ],
  },
};

function MasonryImage({ src, index }: { src: string; index: number }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.05 }}
      className="relative overflow-hidden rounded-xl bg-muted/30 group"
      style={{
        gridColumn: index % 5 === 0 ? 'span 2' : index % 7 === 0 ? 'span 2 / row span 2' : 'span 1',
      }}
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20 transition-transform duration-700 group-hover:scale-110" />

      {/* Image - Placeholder for now */}
      {!src && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-4">
            <Camera className="w-8 h-8 mx-auto text-foreground/20 mb-2" />
            <p className="text-xs text-foreground/40">Image from Gallery</p>
          </div>
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Decorative Border */}
      <div className="absolute inset-0 rounded-xl border border-lmsy-yellow/20 group-hover:border-lmsy-blue/40 transition-colors duration-300" />
    </motion.div>
  );
}

export default function ExhibitionDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { language } = useLanguage();
  const [exhibition, setExhibition] = useState<any>(null);

  useEffect(() => {
    // Fetch exhibition data based on slug
    // For now, using static data
    const data = exhibitionsData[slug];
    if (data) {
      setExhibition(data);
    }
  }, [slug]);

  if (!exhibition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Exhibition not found</p>
          <Link href="/exhibitions" className="text-lmsy-yellow hover:underline">
            ← Back to Exhibitions
          </Link>
        </div>
      </div>
    );
  }

  const title = language === 'zh' ? exhibition.titleZh : exhibition.title;
  const curatorNote = language === 'zh' ? exhibition.curatorNoteZh : exhibition.curatorNote;

  return (
    <div className="min-h-screen bg-background">
      {/* Immersive Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-lmsy-yellow/5 via-background to-lmsy-blue/5" />
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-lmsy-yellow/10 via-transparent to-transparent"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Back Button */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-8"
            >
              <Link
                href="/exhibitions"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm tracking-wider">BACK TO EXHIBITIONS</span>
              </Link>
            </motion.div>

            {/* Collection Range */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-muted/30 border border-border/50 mb-8"
            >
              <Camera className="w-4 h-4 text-lmsy-yellow" />
              <span className="text-sm font-mono tracking-wider">{exhibition.range}</span>
            </motion.div>

            {/* Title - Gradual Fade In */}
            <motion.h1
              className="font-serif text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1 }}
            >
              <span className="bg-gradient-to-r from-lmsy-yellow via-lmsy-blue to-lmsy-yellow bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                {title}
              </span>
            </motion.h1>

            {/* Curator Note - Fade In */}
            <motion.blockquote
              className="text-lg md:text-xl lg:text-2xl text-foreground/70 leading-relaxed font-light italic max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1.2 }}
            >
              "{curatorNote}"
            </motion.blockquote>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 10, 0] }}
          transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-lmsy-yellow/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 rounded-full bg-lmsy-yellow" />
          </div>
        </motion.div>
      </section>

      {/* Curator's Essay - Magazine Style */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto"
          >
            {/* Paper Texture Background */}
            <div className="relative bg-background rounded-2xl shadow-xl overflow-hidden border border-border/50">
              {/* Decorative Header */}
              <div className="bg-gradient-to-r from-lmsy-yellow/10 to-lmsy-blue/10 px-8 py-6 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-px w-12 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue" />
                  <span className="text-xs tracking-widest text-muted-foreground uppercase">
                    Curator's Essay
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-lmsy-blue to-transparent" />
                </div>
              </div>

              {/* Markdown Content */}
              <div className="px-8 md:px-12 py-8 md:py-12 prose prose-lg max-w-none">
                <div className="font-serif text-foreground/90 leading-loose">
                  {/* Render markdown content - for now showing as plain text */}
                  <div className="whitespace-pre-wrap">{exhibition.markdownContent}</div>
                </div>
              </div>

              {/* Decorative Footer */}
              <div className="px-8 py-4 bg-muted/30 border-t border-border/50">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-lmsy-yellow" />
                  <span>Exhibition Archive</span>
                  <div className="w-2 h-2 rounded-full bg-lmsy-blue" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Gallery Collage - Masonry Layout */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                The Collection
              </span>
            </h2>
            <p className="text-muted-foreground">
              A dynamic collage of moments from {exhibition.range}
            </p>
          </motion.div>

          {/* Masonry Grid - Collage Layout */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[200px]">
            {/* Placeholder images - will be fetched from Supabase */}
            {Array.from({ length: 12 }).map((_, i) => (
              <MasonryImage key={i} src="" index={i} />
            ))}
          </div>

          {/* Load More */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-muted-foreground italic">
              Full collection available in Gallery with tag "{exhibition.slug}"
            </p>
          </motion.div>
        </div>
      </section>

      {/* Related Exhibitions */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-serif text-2xl md:text-3xl font-bold mb-4">Explore More</h2>
            <p className="text-muted-foreground">Discover other curated exhibitions</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {Object.entries(exhibitionsData)
              .filter(([key]) => key !== slug)
              .map(([key, data]: [string, any]) => (
                <Link
                  key={key}
                  href={`/exhibitions/${key}`}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20 p-8 border border-border/50 hover:border-lmsy-yellow/50 transition-all duration-300"
                >
                  <div className="relative z-10">
                    <h3 className="font-serif text-xl font-bold mb-2 group-hover:text-lmsy-yellow transition-colors">
                      {language === 'zh' ? data.titleZh : data.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">{data.range}</p>
                    <div className="flex items-center gap-2 text-sm text-foreground/70 group-hover:text-foreground transition-colors">
                      <span>Explore</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
