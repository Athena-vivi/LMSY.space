'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { Quote } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { useRef } from 'react';

const quotes = {
  lookmhee: [
    {
      text: "Every character teaches you something about yourself that you never knew before.",
      context: "On Acting",
    },
    {
      text: "The best stories are the ones that make you feel something real.",
      context: "Affair Series",
    },
  ],
  sonya: [
    {
      text: "When you truly understand a character, they become a part of you forever.",
      context: "On Performance",
    },
    {
      text: "Music and movement have their own language that words can't capture.",
      context: "Artistic Expression",
    },
  ],
};

export default function ProfilesPage() {
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const lookmheeX = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const sonyaX = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const lookmheeOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0.3]);
  const sonyaOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0.3]);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden bg-black">
      {/* Dynamic Mesh Gradient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-40">
          {/* Yellow nebula */}
          <motion.div
            className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(251, 191, 36, 0) 70%)',
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Blue nebula */}
          <motion.div
            className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(56, 189, 248, 0) 70%)',
            }}
            animate={{
              x: [0, -100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Intersection glow */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, rgba(56, 189, 248, 0.2) 50%, transparent 70%)',
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.p
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, letterSpacing: 'normal' }}
              transition={{ duration: 1.2, delay: 0.5 }}
              className="text-xs md:text-sm font-mono text-white/40 tracking-[0.3em] uppercase mb-6"
            >
              The Resonance
            </motion.p>
            <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl font-bold mb-8 tracking-tight">
              <span className="block bg-gradient-to-r from-lmsy-yellow via-white to-lmsy-blue bg-clip-text text-transparent">
                DUALITY
              </span>
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="text-lg md:text-xl text-white/60 font-light leading-relaxed mb-12"
            >
              {language === 'th'
                ? 'สองลึกถึงเส้นที่เชื่อมโยงระหว่างสองหัวใจ'
                : language === 'zh'
                ? '探索连接两颗心的看不见的线'
                : 'Where two souls converge in perfect harmony'}
            </motion.p>

            {/* Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.2 }}
              className="flex items-center justify-center gap-2 text-white/40 text-xs font-mono tracking-wider"
            >
              <span>SCROLL</span>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Overlapping Profiles Section */}
      <section className="relative py-32 min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Lookmhee's Side */}
          <motion.div
            style={{
              x: lookmheeX,
              opacity: lookmheeOpacity,
            }}
            className="relative mb-32 md:mb-0 md:absolute md:top-0 md:left-0 md:w-1/2 md:pr-12"
          >
            <div className="relative">
              {/* Quote */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: '-100px' }}
                className="relative mb-8 pl-8"
              >
                <Quote className="absolute left-0 top-0 h-8 w-8 text-lmsy-yellow/40" strokeWidth={1} />
                <blockquote className="font-serif text-2xl md:text-3xl text-white/90 leading-relaxed italic pl-8">
                  "{quotes.lookmhee[0].text}"
                </blockquote>
                <p className="text-xs font-mono text-lmsy-yellow/60 tracking-wider uppercase mt-4 pl-8">
                  {quotes.lookmhee[0].context}
                </p>
              </motion.div>

              {/* Card */}
              <Link href="/profiles/lookmhee">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  className="group relative"
                >
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-lmsy-yellow/30"
                    style={{
                      boxShadow: '0 0 40px rgba(251, 191, 36, 0.15)',
                    }}
                  >
                    {/* Placeholder gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-lmsy-yellow/20 via-lmsy-yellow/10 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-lmsy-yellow/20 backdrop-blur-sm flex items-center justify-center mb-6 mx-auto border-2 border-lmsy-yellow/40">
                          <span className="font-serif text-6xl md:text-7xl font-bold text-lmsy-yellow">L</span>
                        </div>
                      </div>
                    </div>
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  <div className="mt-6 text-center">
                    <h3 className="font-serif text-3xl md:text-4xl font-bold text-white/90 mb-2">
                      LOOKMHEE
                    </h3>
                    <p className="text-sm text-lmsy-yellow/60 font-mono tracking-wider uppercase">
                      The Library of Solitude
                    </p>
                  </div>
                </motion.div>
              </Link>
            </div>
          </motion.div>

          {/* Sonya's Side */}
          <motion.div
            style={{
              x: sonyaX,
              opacity: sonyaOpacity,
            }}
            className="relative md:absolute md:top-0 md:right-0 md:w-1/2 md:pl-12"
          >
            <div className="relative">
              {/* Quote */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: '-100px' }}
                className="relative mb-8 pr-8 text-right"
              >
                <Quote className="absolute right-0 top-0 h-8 w-8 text-lmsy-blue/40" strokeWidth={1} />
                <blockquote className="font-serif text-2xl md:text-3xl text-white/90 leading-relaxed italic pr-8">
                  "{quotes.sonya[0].text}"
                </blockquote>
                <p className="text-xs font-mono text-lmsy-blue/60 tracking-wider uppercase mt-4 pr-8">
                  {quotes.sonya[0].context}
                </p>
              </motion.div>

              {/* Card */}
              <Link href="/profiles/sonya">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  className="group relative"
                >
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-lmsy-blue/30"
                    style={{
                      boxShadow: '0 0 40px rgba(56, 189, 248, 0.15)',
                    }}
                  >
                    {/* Placeholder gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-lmsy-blue/20 via-lmsy-blue/10 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-lmsy-blue/20 backdrop-blur-sm flex items-center justify-center mb-6 mx-auto border-2 border-lmsy-blue/40">
                          <span className="font-serif text-6xl md:text-7xl font-bold text-lmsy-blue">S</span>
                        </div>
                      </div>
                    </div>
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  <div className="mt-6 text-center">
                    <h3 className="font-serif text-3xl md:text-4xl font-bold text-white/90 mb-2">
                      SONYA
                    </h3>
                    <p className="text-sm text-lmsy-blue/60 font-mono tracking-wider uppercase">
                      The Pulse of Vibrance
                    </p>
                  </div>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The Unspoken Language Section */}
      <section className="relative py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="font-serif text-4xl md:text-5xl font-light text-white/90 mb-6">
              The Unspoken Language
            </h2>
            <p className="text-white/60 leading-relaxed">
              {language === 'th'
                ? 'ภาษาที่ไม่ต้องพูด ก็เข้าใจกัน'
                : language === 'zh'
                ? '无需言语的默契'
                : 'Where words become unnecessary, and connection speaks for itself'}
            </p>
          </motion.div>

          {/* Animated placeholder for 4K GIFs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: item * 0.2 }}
                viewport={{ once: true }}
                className="group relative aspect-video rounded-xl overflow-hidden border border-white/10"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(56, 189, 248, 0.1) 100%)',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-white/30 text-xs font-mono tracking-wider">
                      4K GIF PLACEHOLDER
                    </p>
                    <p className="text-white/20 text-[10px] mt-2">
                      Moment #{item}
                    </p>
                  </div>
                </div>
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.1) 0%, transparent 70%)',
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
