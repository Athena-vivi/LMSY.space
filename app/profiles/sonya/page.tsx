'use client';

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import Link from 'next/link';
import { Quote, Activity, ArrowLeft, Music, Disc } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { AudioPlayer } from '@/components/audio-player';
import { useRef, useEffect, useState } from 'react';

const performances = [
  {
    title: 'Rhythm of Dreams',
    year: '2024',
    type: 'Contemporary',
    description: 'Solo performance blending classical Thai dance with modern movement',
  },
  {
    title: 'Neon Nights',
    year: '2023',
    type: 'Ensemble',
    description: 'Award-winning choreography for Bangkok Dance Festival',
  },
];

const philosophyPoints = [
  {
    title: 'Movement as Language',
    text: 'Every gesture is a sentence, every leap a paragraph. The body speaks what words cannot express.',
  },
  {
    title: 'Energy Transfer',
    text: 'Performance is about channeling energy—from the music, from the space, from the audience—and letting it flow through you.',
  },
  {
    title: 'Breaking Boundaries',
    text: 'Classical technique gives you the foundation. Breaking it gives you freedom. The magic lives in the tension between.',
  },
];

const galleryMoments = [
  { id: 1, title: 'Dynamic Pose' },
  { id: 2, title: 'Flow State' },
  { id: 3, title: 'Peak Moment' },
  { id: 4, title: 'Stillness in Motion' },
];

// Waveform Visualization Component
function WaveformVisualization() {
  const [waveform] = useState(Array.from({ length: 40 }, () => Math.random() * 0.5 + 0.5));

  return (
    <div className="flex items-center justify-center gap-1 h-32">
      {waveform.map((height, index) => (
        <motion.div
          key={index}
          className="w-1 bg-gradient-to-t from-sky-400/60 to-cyan-300/40 rounded-full"
          style={{
            height: `${height * 100}%`,
          }}
          animate={{
            height: [`${height * 80}%`, `${height * 120}%`, `${height * 80}%`],
          }}
          transition={{
            duration: 1.5 + Math.random() * 0.5,
            repeat: Infinity,
            delay: index * 0.05,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export default function SonyaPage() {
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const y1 = useTransform(smoothProgress, [0, 0.5], ['0%', '-50%']);
  const y2 = useTransform(smoothProgress, [0, 1], ['0%', '-100%']);
  const opacity = useTransform(smoothProgress, [0, 0.3, 0.7], [1, 0.8, 0.4]);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-black overflow-hidden">
      {/* Dynamic Aurora Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Cyan aurora wave */}
        <motion.div
          className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.3) 0%, rgba(6, 182, 212, 0.1) 40%, transparent 70%)',
            y: y1,
          }}
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Yellow aurora wave */}
        <motion.div
          className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.25) 0%, rgba(245, 158, 11, 0.1) 40%, transparent 70%)',
            y: y2,
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -60, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Intersection glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, rgba(251, 191, 36, 0.1) 30%, transparent 60%)',
            opacity,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-sky-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Back Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed top-6 left-6 z-50"
      >
        <Link
          href="/profiles"
          className="flex items-center gap-2 text-sky-300/40 hover:text-sky-300/70 transition-colors font-mono text-xs tracking-wider"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
          <span>RETURN TO DUALITY</span>
        </Link>
      </motion.div>

      {/* Hero Section - Dynamic Portrait */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Name and Title - Asymmetric Layout */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="order-2 lg:order-1"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-6"
              >
                <p className="text-xs font-mono text-sky-300/40 tracking-[0.3em] uppercase mb-2">
                  The Pulse of Vibrance
                </p>
              </motion.div>

              <h1 className="font-serif text-7xl md:text-8xl lg:text-9xl font-bold text-sky-50/90 mb-6 leading-none">
                <motion.span
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="block bg-gradient-to-r from-sky-400 via-cyan-300 to-yellow-400 bg-clip-text text-transparent"
                >
                  SONYA
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-sky-100/60 font-light leading-relaxed text-lg mb-6"
              >
                {language === 'th'
                  ? 'ร่างกายคือภาษา การเต้นคือคำพูด และทุกท่วงท่าคือเรื่องราว'
                  : language === 'zh'
                  ? '身体是语言，舞蹈是话语，每个姿态都是故事'
                  : 'The body is language. Dance is speech. Every gesture tells a story.'}
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex items-center gap-6"
              >
                <Activity className="h-4 w-4 text-sky-400/60" strokeWidth={2} />
                <p className="text-sky-300/30 font-mono text-xs tracking-wider">
                  DANCER · CHOREOGRAPHER · MOVER
                </p>
              </motion.div>

              {/* Waveform Visualization */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4, duration: 0.8 }}
                className="mt-12 p-6 rounded-2xl border border-sky-500/10 bg-sky-950/10 backdrop-blur-sm"
              >
                <WaveformVisualization />
                <p className="text-center text-sky-300/20 font-mono text-[10px] tracking-wider mt-4">
                  ENERGY_IN_MOTION
                </p>
              </motion.div>
            </motion.div>

            {/* Portrait Placeholder - Diagonal Layout */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotate: -3 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ duration: 1.2, delay: 0.4 }}
              className="relative order-1 lg:order-2"
            >
              <div
                className="aspect-[3/4] rounded-2xl overflow-hidden relative"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(251, 191, 36, 0.1) 100%)',
                  border: '2px solid rgba(34, 211, 238, 0.3)',
                  boxShadow: '0 0 60px rgba(34, 211, 238, 0.2), 0 0 100px rgba(251, 191, 36, 0.1)',
                }}
              >
                {/* Dynamic gradient overlay */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(45deg, rgba(34, 211, 238, 0.1) 0%, transparent 50%, rgba(251, 191, 36, 0.1) 100%)',
                  }}
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-40 h-40 rounded-full bg-sky-400/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border-2 border-sky-300/40">
                      <span className="font-serif text-8xl font-bold text-sky-300">S</span>
                    </div>
                    <p className="text-sky-300/30 font-mono text-xs tracking-widest">
                      MOTION_PORTRAIT
                    </p>
                  </div>
                </div>

                {/* Corner accents */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-sky-400/50 rounded-tl-lg" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-yellow-400/50 rounded-br-lg" />
              </div>

              {/* Floating accent */}
              <motion.div
                className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(34, 211, 238, 0.2) 0%, transparent 70%)',
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-sky-300/30 text-xs font-mono tracking-wider">DIVE DEEPER</span>
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-10 bg-gradient-to-b from-sky-300/40 to-transparent"
          />
        </motion.div>
      </section>

      {/* Dynamic Quote */}
      <section className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Quote className="h-16 w-16 text-sky-400/40 mx-auto mb-8" strokeWidth={1} />
            </motion.div>
            <blockquote className="font-serif text-4xl md:text-5xl text-sky-50/90 leading-relaxed mb-8">
              &quot;Movement is not just what you do—it&apos;s who you are. Every cell in your body holds a story waiting to be told.&quot;
            </blockquote>
            <cite className="text-sky-300/50 font-mono text-sm tracking-wider not-italic">
              — On the Art of Expression
            </cite>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Grid - Asymmetric Layout */}
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12 flex items-center gap-4"
          >
            <Music className="h-6 w-6 text-sky-400/50" strokeWidth={1.5} />
            <h2 className="font-serif text-3xl text-sky-50/80">Core Philosophy</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {philosophyPoints.map((point, index) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.15,
                  type: 'spring',
                  stiffness: 100,
                }}
                viewport={{ once: true }}
                className="group p-8 rounded-2xl border relative overflow-hidden"
                style={{
                  borderColor: index === 1
                    ? 'rgba(34, 211, 238, 0.3)'
                    : 'rgba(34, 211, 238, 0.15)',
                  background: index === 1
                    ? 'rgba(34, 211, 238, 0.05)'
                    : 'transparent',
                }}
                whileHover={{
                  scale: 1.02,
                  borderColor: 'rgba(34, 211, 238, 0.4)',
                }}
              >
                {/* Animated background for middle card */}
                {index === 1 && (
                  <motion.div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.2) 0%, transparent 70%)',
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}

                <div className="relative z-10">
                  <h3 className="font-serif text-xl text-sky-50/80 mb-4">{point.title}</h3>
                  <p className="text-sky-100/60 leading-relaxed font-light">{point.text}</p>
                </div>

                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16">
                  <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-sky-400/30" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Performance Gallery - Masonry-style */}
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="font-serif text-3xl text-sky-50/80 mb-2">Gallery Moments</h2>
            <p className="text-sky-300/40 text-sm">Captured in motion</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {galleryMoments.map((moment, index) => (
              <motion.div
                key={moment.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  type: 'spring',
                  stiffness: 200,
                }}
                viewport={{ once: true }}
                className={`relative aspect-[3/4] rounded-xl overflow-hidden border group cursor-pointer ${
                  index % 3 === 0 ? 'md:row-span-2 md:aspect-[3/8]' : ''
                }`}
                style={{
                  borderColor: 'rgba(34, 211, 238, 0.2)',
                  background: `linear-gradient(${135 + index * 20}deg, rgba(34, 211, 238, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%)`,
                }}
                whileHover={{
                  scale: 1.05,
                  borderColor: 'rgba(34, 211, 238, 0.4)',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="text-center">
                    <p className="text-sky-300/60 font-mono text-[10px] tracking-wider mb-2">
                      0{moment.id}
                    </p>
                    <p className="text-sky-50/80 font-serif text-sm">{moment.title}</p>
                  </div>
                </div>

                {/* Hover glow effect */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.2) 0%, transparent 70%)',
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Stage - Music & Sound */}
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12 flex items-center gap-4"
          >
            <Music className="h-6 w-6 text-sky-400/50" strokeWidth={1.5} />
            <h2 className="font-serif text-3xl text-sky-50/80">The Stage</h2>
          </motion.div>

          {/* Featured Track - Sonya's Solo */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative p-8 rounded-2xl border overflow-hidden"
            style={{
              borderColor: 'rgba(34, 211, 238, 0.3)',
              background: 'rgba(34, 211, 238, 0.03)',
            }}
          >
            {/* Animated background */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.1) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center">
              {/* Album Art */}
              <div className="relative">
                <div className="aspect-square rounded-xl overflow-hidden border"
                  style={{
                    borderColor: 'rgba(34, 211, 238, 0.2)',
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Disc className="h-24 w-24 text-sky-400/20 mx-auto mb-4" />
                      <p className="text-sky-300/30 font-mono text-xs tracking-wider">
                        ALBUM_ART
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rotating vinyl effect */}
                <motion.div
                  className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full border-2 border-dashed opacity-30"
                  style={{ borderColor: 'rgba(34, 211, 238, 0.4)' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                />
              </div>

              {/* Track Info & Player */}
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-mono text-sky-400/50 tracking-wider uppercase mb-2">
                    Solo Performance
                  </p>
                  <h3 className="font-serif text-4xl text-sky-50/90 mb-2">
                    Silent Resonance
                  </h3>
                  <p className="text-lg text-sky-300/60 font-light">
                    静谧的共鸣
                  </p>
                </div>

                <p className="text-sky-100/60 leading-relaxed font-light italic border-l-2 pl-4"
                  style={{ borderColor: 'rgba(34, 211, 238, 0.4)' }}
                >
                  &quot;The first moment of understanding between two souls—where silence speaks louder than words, and the heart finds its own frequency.&quot;
                </p>

                {/* Mini Audio Player */}
                <div className="p-4 rounded-xl backdrop-blur-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <AudioPlayer
                    src="/audio/silent-resonance.mp3"
                    title="Silent Resonance"
                    subtitle="Sonya Solo"
                    showWaveform={true}
                  />
                </div>

                <Link
                  href="/resonance"
                  className="inline-flex items-center gap-2 text-sky-300/50 hover:text-sky-300/80 transition-colors font-mono text-xs tracking-wider group"
                >
                  <span>VIEW FULL DISCOGRAPHY</span>
                  <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Selected Performances */}
      <section className="relative py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="font-serif text-3xl text-sky-50/80 mb-2">Performances</h2>
            <p className="text-sky-300/40 text-sm">Featured works</p>
          </motion.div>

          <div className="space-y-6">
            {performances.map((work, index) => (
              <motion.div
                key={work.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="group p-8 rounded-2xl border hover:border-sky-400/40 transition-all duration-300 relative overflow-hidden"
                style={{
                  borderColor: 'rgba(34, 211, 238, 0.2)',
                  background: 'rgba(34, 211, 238, 0.02)',
                }}
                whileHover={{
                  scale: 1.02,
                  background: 'rgba(34, 211, 238, 0.05)',
                }}
              >
                {/* Animated background */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(34, 211, 238, 0.05) 50%, transparent 100%)',
                  }}
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-serif text-2xl text-sky-50/90">{work.title}</h3>
                      <span className="px-3 py-1 bg-sky-500/20 text-sky-300/80 font-mono text-xs tracking-wider uppercase rounded-full border border-sky-400/30">
                        {work.type}
                      </span>
                    </div>
                    <p className="text-sky-100/50 text-sm">{work.description}</p>
                  </div>
                  <div className="text-sky-400/50 font-mono text-sm tracking-wider">
                    {work.year}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-20 px-6 border-t border-sky-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <Link
              href="/profiles/lookmhee"
              className="inline-flex items-center gap-3 text-sky-300/40 hover:text-sky-300/70 transition-colors font-mono text-xs tracking-wider group"
            >
              <span>DISCOVER LOOKMHEE</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </Link>
            <div className="mt-8 pt-8 border-t border-sky-900/20">
              <p className="text-sky-300/20 font-mono text-[10px] tracking-wider">
                THE PULSE OF VIBRANCE · WHERE ENERGY MEETS ARTISTRY
              </p>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
