'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { ArrowRight, Calendar } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Generate archive ID
  const generateArchiveId = (index: number, date: string) => {
    const year = new Date(date).getFullYear();
    const num = String(index + 1).padStart(2, '0');
    return `LMSY-ED-${year}-${num}`;
  };

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
    <div ref={containerRef} className="relative min-h-screen bg-background">
      {/* Scanning Line Texture Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
          }}
        />
      </div>

      {/* Hero Masthead - 顶级时尚刊物风格 */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Subtle ambient glow */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw]"
          style={{
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.03) 0%, rgba(56, 189, 248, 0.02) 50%, transparent 70%)',
            filter: 'blur(100px)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="text-center max-w-6xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Small Label */}
            <motion.p
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, letterSpacing: 'normal' }}
              transition={{ duration: 1, delay: 0.3 }}
              className="text-xs md:text-sm font-mono text-muted-foreground tracking-[0.4em] uppercase mb-8"
            >
              The Collection
            </motion.p>

            {/* Main Title - 超大号衬线体 */}
            <h1 className="font-serif text-[12vw] md:text-[10vw] lg:text-[9vw] font-light leading-[0.85] tracking-tight mb-8">
              <span className="block bg-gradient-to-r from-foreground via-foreground/90 to-foreground bg-clip-text text-transparent">
                THE
              </span>
              <span className="block italic font-light bg-gradient-to-r from-lmsy-yellow/80 via-lmsy-blue/60 to-lmsy-yellow/80 bg-clip-text text-transparent">
                EDITORIALS
              </span>
            </h1>

            {/* Decorative Line */}
            <motion.div
              className="mx-auto flex items-center justify-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-lmsy-yellow/50" />
              <div className="w-2 h-2 rotate-45 border border-lmsy-yellow/50" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-lmsy-blue/50" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Issues Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="space-y-32">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-center">
                  <div className="aspect-[3/4] rounded-sm bg-muted/20 animate-pulse" />
                  <div className="space-y-6">
                    <div className="h-6 w-48 bg-muted/20 rounded animate-pulse" />
                    <div className="h-16 w-3/4 bg-muted/20 rounded animate-pulse" />
                    <div className="h-24 w-full bg-muted/20 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : publications.length === 0 ? (
            /* 艺术化空状态 - Nascent State */
            <motion.div
              className="relative min-h-[60vh] flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
            >
              {/* 巨大的 'A' 字水印 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                  className="font-serif text-[40vw] font-light text-foreground/5 select-none"
                  animate={{
                    opacity: [0.03, 0.06, 0.03],
                    scale: [1, 1.02, 1],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  A
                </motion.div>
              </div>

              {/* 前景文字 */}
              <div className="relative text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="space-y-6"
                >
                  <p className="font-mono text-xs tracking-[0.5em] text-muted-foreground/60 uppercase">
                    Archive Status: Nascent
                  </p>
                  <div className="space-y-2">
                    <p className="font-serif text-2xl md:text-3xl text-foreground/40 font-light italic">
                      ISSUES ARE UNDER CURATION
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <div className="h-px w-12 bg-lmsy-yellow/30" />
                      <p className="font-mono text-sm text-lmsy-yellow/60 tracking-wider">
                        STANDBY FOR LIGHT
                      </p>
                      <div className="h-px w-12 bg-lmsy-blue/30" />
                    </div>
                  </div>
                </motion.div>

                {/* Decorative corner elements */}
                <div className="absolute top-0 left-0 w-32 h-32 border-l border-t border-foreground/5" />
                <div className="absolute bottom-0 right-0 w-32 h-32 border-r border-b border-foreground/5" />
              </div>
            </motion.div>
          ) : (
            /* 非对称两列布局的刊物卡片 */
            <div className="space-y-32 md:space-y-48">
              {publications.map((pub, index) => (
                <IssueCard
                  key={pub.id}
                  publication={pub}
                  index={index}
                  archiveId={generateArchiveId(index, pub.issue_date)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-20 border-t border-border/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground/40 uppercase mb-4">
              LMSY.SPACE · THE EDITORIALS
            </p>
            <p className="font-serif text-sm text-muted-foreground/60 italic">
              Curating moments of永恒 in print
            </p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}

interface IssueCardProps {
  publication: Publication;
  index: number;
  archiveId: string;
}

function IssueCard({ publication, index, archiveId }: IssueCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Parallax effect on scroll
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  // Alternate layout direction
  const isEven = index % 2 === 0;

  return (
    <motion.div
      ref={cardRef}
      style={{ y, opacity }}
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
      viewport={{ once: true, margin: '-100px' }}
      className="relative"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {/* Background color shift on hover */}
      <motion.div
        className="absolute inset-0 -z-10 rounded-sm opacity-0 transition-opacity duration-700"
        style={{
          background: isEven
            ? 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.03) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.03) 0%, transparent 70%)',
        }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      />

      <div className={`grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-center ${!isEven ? 'lg:grid-cols-[1.2fr_1fr]' : ''}`}>
        {/* Magazine Cover */}
        <div className={`${!isEven ? 'lg:order-2' : ''}`}>
          <Link href={`/editorial/${publication.slug}`} className="block group">
            <motion.div
              className="relative aspect-[3/4] overflow-hidden"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Cover Image */}
              <div className={`absolute inset-0 transition-opacity duration-1000 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}>
                <Image
                  src={publication.cover_url}
                  alt={publication.mag_name}
                  fill
                  className="object-cover"
                  onLoad={() => setImageLoaded(true)}
                />
              </div>

              {/* Loading state */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/50">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 border-2 border-foreground/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-2 h-2 bg-foreground/20 rounded-full animate-pulse" />
                      </div>
                      <p className="font-mono text-xs text-foreground/20 tracking-wider">LOADING</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

              {/* Frame border */}
              <div className="absolute inset-0 border border-foreground/10 pointer-events-none" />

              {/* Corner decorations */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-lmsy-yellow/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-lmsy-blue/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          </Link>
        </div>

        {/* Metadata Section */}
        <div className={`${!isEven ? 'lg:order-1' : ''} space-y-8`}>
          {/* Archive ID */}
          <motion.div
            initial={{ opacity: 0, x: isEven ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground/50 uppercase">
              {archiveId}
            </p>
          </motion.div>

          {/* Magazine Name - 超大号 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <Link href={`/editorial/${publication.slug}`} className="block group">
              <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light leading-tight">
                <span className="block text-foreground/90 group-hover:transition-colors duration-500">
                  {publication.mag_name.split(' ').map((word, i) => (
                    <span key={i} className="inline-block">
                      {word}
                      &nbsp;
                    </span>
                  ))}
                </span>
              </h2>
            </Link>
          </motion.div>

          {/* Date */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="flex items-center gap-4"
          >
            <div className="h-px w-12 bg-gradient-to-r from-lmsy-yellow/50 to-transparent" />
            <div className="flex items-center gap-3 text-muted-foreground/60">
              <Calendar className="w-4 h-4" strokeWidth={1} />
              <span className="font-mono text-sm tracking-wider uppercase">{formatDate(publication.issue_date)}</span>
            </div>
          </motion.div>

          {/* Curator's Note */}
          {publication.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="pl-6 border-l border-foreground/10">
                <p className="font-serif text-lg md:text-xl text-foreground/60 leading-relaxed font-light italic">
                  "{publication.description}"
                </p>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground/40 tracking-wider uppercase mt-4">
                Curator's Note
              </p>
            </motion.div>
          )}

          {/* View Issue Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <Link
              href={`/editorial/${publication.slug}`}
              className="inline-flex items-center gap-4 group/button"
            >
              <span className="font-mono text-xs tracking-[0.3em] text-muted-foreground/50 uppercase group-hover/button:text-foreground/80 transition-colors">
                View Full Issue
              </span>
              <div className="w-12 h-px bg-foreground/20 group-hover/button:w-20 group-hover/button:bg-foreground/40 transition-all duration-500" />
              <ArrowRight className="w-4 h-4 text-foreground/30 group-hover/button:text-foreground/60 group-hover/button:translate-x-1 transition-all duration-500" strokeWidth={1} />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
