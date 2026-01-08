'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import Image from 'next/image';
import { useState } from 'react';

interface Exhibition {
  id: string;
  slug: string;
  title: string;
  titleZh: string;
  coverImage: string;
  range: string;
  curatorNote: string;
}

// Temporary exhibition data - will be fetched from Supabase later
const exhibitions: Exhibition[] = [
  {
    id: '1',
    slug: 'indigo-dawn',
    title: 'Indigo Dawn',
    titleZh: '靛蓝黎明',
    coverImage: '', // Using gradient for now
    range: 'G-001 ~ G-042',
    curatorNote: 'An exploration of the threshold between night and day, where indigo dreams meet golden reality.',
  },
  {
    id: '2',
    slug: 'crystalline-moments',
    title: 'Crystalline Moments',
    titleZh: '结晶瞬间',
    coverImage: '',
    range: 'G-043 ~ G-089',
    curatorNote: 'Fleeting instants preserved in amber, where time stands still and memories crystallize.',
  },
  {
    id: '3',
    slug: 'sonic-landscapes',
    title: 'Sonic Landscapes',
    titleZh: '声景地貌',
    coverImage: '',
    range: 'G-090 ~ G-128',
    curatorNote: 'The visible rhythm of sound waves, where melody paints the canvas of silence.',
  },
];

function ExhibitionCard({ exhibition, index }: { exhibition: Exhibition; index: number }) {
  const { language } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const title = language === 'zh' ? exhibition.titleZh : exhibition.title;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/exhibitions/${exhibition.slug}`} className="block">
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-lmsy-yellow/20 via-lmsy-blue/20 to-lmsy-yellow/20 ${
            index % 3 === 0 ? 'aspect-[3/4]' : index % 3 === 1 ? 'aspect-square' : 'aspect-[4/3]'
          }`}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
                backgroundSize: '30px 30px',
              }}
            />
          </div>

          {/* Animated Gradient Background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-lmsy-yellow/30 to-lmsy-blue/30"
            animate={{
              scale: isHovered ? 1.1 : 1,
              opacity: isHovered ? 0.8 : 0.5,
            }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />

          {/* Content Overlay */}
          <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8">
            {/* Top: Collection Range */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className="flex items-center gap-2"
            >
              <div className="h-px w-8 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue" />
              <span className="text-xs md:text-sm font-mono text-foreground/70 tracking-wider">
                {exhibition.range}
              </span>
            </motion.div>

            {/* Bottom: Title and Curator Note */}
            <div className="space-y-3">
              <motion.h3
                className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold text-foreground"
                animate={{
                  y: isHovered ? -5 : 0,
                }}
                transition={{ duration: 0.3 }}
              >
                {title}
              </motion.h3>

              {/* Curator Note - Revealed on Hover */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{
                  opacity: isHovered ? 1 : 0,
                  height: isHovered ? 'auto' : 0,
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="backdrop-blur-sm bg-black/40 rounded-lg p-3 md:p-4 border border-lmsy-yellow/20">
                  <p className="text-xs md:text-sm text-white/90 leading-relaxed font-light italic">
                    {exhibition.curatorNote}
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Hover Glow Effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.1) 0%, rgba(56, 189, 248, 0.1) 100%)',
            }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          />

          {/* Decorative Border */}
          <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-br from-lmsy-yellow/30 via-lmsy-blue/30 to-lmsy-yellow/30 p-[2px]">
            <div className="absolute inset-0 rounded-2xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0)' }} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function ExhibitionsPage() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Ambient Background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-lmsy-yellow/10 via-transparent to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-lmsy-blue/10 via-transparent to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Exhibition Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-lmsy-yellow/10 to-lmsy-blue/10 border border-lmsy-yellow/30 mb-8"
            >
              <div className="w-2 h-2 rounded-full bg-lmsy-yellow animate-pulse" />
              <span className="text-xs font-medium tracking-widest uppercase">
                Curated Collections
              </span>
            </motion.div>

            {/* Title */}
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                {t(language, 'exhibitions.title')}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
              {t(language, 'exhibitions.subtitle')}
            </p>

            {/* Decorative Line */}
            <motion.div
              className="mx-auto w-24 h-1 bg-gradient-to-r from-lmsy-yellow via-lmsy-blue to-lmsy-yellow rounded-full mt-8"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            />
          </motion.div>
        </div>
      </section>

      {/* Exhibitions Grid - Asymmetric Layout */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {exhibitions.map((exhibition, index) => (
              <ExhibitionCard key={exhibition.id} exhibition={exhibition} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Curator's Note */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="relative">
              <div className="absolute -top-4 -left-4 text-6xl text-lmsy-yellow/20 font-serif">"</div>
              <blockquote className="text-lg md:text-xl text-foreground/80 leading-relaxed font-light italic">
                Each exhibition is a constellation of moments, carefully curated to reveal the hidden narratives
                within every frame. Here, we don't just display photographs—we orchestrate visual symphonies.
              </blockquote>
              <div className="absolute -bottom-4 -right-4 text-6xl text-lmsy-blue/20 font-serif">"</div>
            </div>
            <motion.div
              className="mt-8 flex items-center justify-center gap-3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-lmsy-yellow" />
              <span className="text-sm text-muted-foreground tracking-widest">CURATOR</span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-lmsy-blue" />
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
