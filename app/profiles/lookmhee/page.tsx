'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { Quote, BookOpen, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useRef } from 'react';

const books = [
  {
    title: 'The Art of Acting',
    author: 'Stella Adler',
    year: '2000',
    category: 'Craft',
  },
  {
    title: 'An Actor Prepares',
    author: 'Constantin Stanislavski',
    year: '1936',
    category: 'Foundation',
  },
  {
    title: 'Respect for Acting',
    author: 'Uta Hagen',
    year: '1973',
    category: 'Technique',
  },
];

const interviewExcerpts = [
  {
    question: 'On finding truth in performance',
    answer: 'Truth isn\'t something you perform. It\'s something you discover when you stop trying to be perfect. The camera captures everything—the hesitation, the breath, the thought behind the eyes. That\'s where the magic lives.',
  },
  {
    question: 'On the quiet moments',
    answer: 'I\'ve always been drawn to the spaces between words. In Thai culture, we understand that silence speaks volumes. A look can convey more than a page of dialogue. That\'s the language I want to master.',
  },
];

const works = [
  {
    title: 'Affair Series',
    year: '2024',
    role: 'Lead',
    description: 'A nuanced exploration of love and loss in modern Bangkok',
  },
  {
    title: 'The Silent Echo',
    year: '2023',
    role: 'Supporting',
    description: 'Award-winning performance as a mysterious antique dealer',
  },
];

export default function LookmheePage() {
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [1, 1, 0.3, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div ref={containerRef} className="relative min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #2A2522 0%, #1F1A17 50%, #151210 100%)',
      }}
    >
      {/* Subtle parchment texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E")',
        }}
      />

      {/* Back Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed top-6 left-6 z-50"
      >
        <Link
          href="/profiles"
          className="flex items-center gap-2 text-amber-200/40 hover:text-amber-200/70 transition-colors font-mono text-xs tracking-wider"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
          <span>RETURN TO DUALITY</span>
        </Link>
      </motion.div>

      {/* Hero Section - Classical Portrait */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Portrait Placeholder */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className="relative"
            >
              <div className="aspect-[3/4] rounded-sm overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.1) 0%, rgba(56, 189, 248, 0.05) 100%)',
                  border: '1px solid rgba(217, 119, 6, 0.2)',
                  boxShadow: '0 0 60px rgba(217, 119, 6, 0.1), 0 0 40px rgba(56, 189, 248, 0.05), inset 0 0 60px rgba(217, 119, 6, 0.05)',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-40 h-40 rounded-full bg-amber-900/20 flex items-center justify-center mx-auto mb-6 border"
                      style={{
                        borderColor: 'rgba(217, 119, 6, 0.3)',
                        boxShadow: '0 0 20px rgba(56, 189, 248, 0.1), inset 0 0 20px rgba(217, 119, 6, 0.1)',
                      }}
                    >
                      <span className="font-serif text-8xl font-bold text-amber-200/30">L</span>
                    </div>
                    <p className="text-amber-200/20 font-mono text-xs tracking-widest">
                      PORTRAIT_PLACEHOLDER
                    </p>
                  </div>
                </div>
                {/* Warm light leak effect with subtle blue hint */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-full bg-gradient-to-b from-amber-500/5 via-transparent to-transparent" />
                <div className="absolute bottom-0 right-0 w-1/3 h-1/2 bg-gradient-to-t from-sky-400/3 via-transparent to-transparent" />
              </div>

              {/* Decorative frame with blue accent */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 border border-amber-700/20" />
              <div className="absolute -top-4 -left-4 w-32 h-32 border border-amber-700/20" />
              <div className="absolute -bottom-4 -left-8 w-20 h-20 border border-sky-600/10" />
            </motion.div>

            {/* Name and Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="text-center lg:text-left"
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xs font-mono text-amber-200/40 tracking-[0.3em] uppercase mb-6"
              >
                The Library of Solitude
              </motion.p>

              <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl font-light text-amber-50/90 mb-6 leading-tight">
                LOOKMHEE
              </h1>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="space-y-4"
              >
                <p className="text-amber-100/60 font-light leading-relaxed text-lg">
                  {language === 'th'
                    ? 'ในที่เงียบสงบของห้องสมุด ฉันพบว่าตัวละครแต่ละตัวคือหนังสือที่รอให้เปิดอ่าน'
                    : language === 'zh'
                    ? '在图书馆的静谧中，我发现每个角色都是一本等待翻阅的书'
                    : 'In the quiet of the library, I find that each character is a book waiting to be read'}
                </p>

                <div className="flex items-center justify-center lg:justify-start gap-4 pt-4">
                  <div className="h-px w-12 bg-gradient-to-r from-amber-600/50 via-sky-500/30 to-transparent" />
                  <p className="text-amber-200/30 font-mono text-xs tracking-wider">
                    ACTRESS · READER · THINKER
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-amber-200/30 text-xs font-mono tracking-wider">DESCEND</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-8 bg-gradient-to-b from-amber-200/30 to-transparent"
          />
        </motion.div>
      </section>

      {/* Philosophy Quote */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <Quote className="h-12 w-12 text-amber-600/30 mx-auto mb-8" strokeWidth={1} />
            <blockquote className="font-serif text-3xl md:text-4xl leading-relaxed mb-8"
              style={{
                background: 'linear-gradient(90deg, rgba(254, 243, 199, 0.8) 0%, rgba(186, 230, 253, 0.6) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              &quot;The depth of a performance comes from stillness. In the silence between actions, truth reveals itself.&quot;
            </blockquote>
            <cite className="text-amber-200/40 font-mono text-sm tracking-wider not-italic">
              — On Craft and Presence
            </cite>
          </motion.div>
        </div>
      </section>

      {/* The Collection - Books */}
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="flex items-center gap-4 mb-4">
              <BookOpen className="h-5 w-5 text-amber-600/40" strokeWidth={1} />
              <h2 className="font-serif text-2xl text-amber-50/70">The Collection</h2>
            </div>
            <p className="text-amber-200/40 text-sm">Volumes that shape the craft</p>
            <div className="h-px w-24 mt-4 bg-gradient-to-r from-amber-600/20 via-sky-500/10 to-transparent" />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {books.map((book, index) => (
              <motion.div
                key={book.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group p-6 rounded-sm border transition-all duration-500 hover:bg-sky-950/20"
                style={{
                  borderColor: 'rgba(56, 189, 248, 0.15)',
                  boxShadow: '0 0 40px rgba(56, 189, 248, 0.05)',
                }}
              >
                <div className="mb-4">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-sky-600/50">
                    {book.category}
                  </span>
                </div>
                <h3 className="font-serif text-lg text-sky-50/80 mb-1">{book.title}</h3>
                <p className="text-sky-200/40 text-sm mb-2">{book.author}</p>
                <p className="font-mono text-xs text-sky-600/30">
                  {book.year}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interview Excerpts */}
      <section className="relative py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="font-serif text-2xl text-amber-50/70 mb-2">In Conversation</h2>
            <p className="text-amber-200/40 text-sm">Excerpts from deep interviews</p>
          </motion.div>

          <div className="space-y-12">
            {interviewExcerpts.map((excerpt, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className={`${index % 2 === 0 ? 'md:ml-0 md:mr-auto md:max-w-lg' : 'md:ml-auto md:mr-0 md:max-w-lg'} md:text-${index % 2 === 0 ? 'left' : 'right'}`}
              >
                <div className="relative pl-6"
                  style={{
                    borderLeft: index % 2 === 0 ? '1px solid rgba(56, 189, 248, 0.2)' : 'none',
                    borderRight: index % 2 === 1 ? '1px solid rgba(56, 189, 248, 0.2)' : 'none',
                  }}
                >
                  <p className="font-mono text-xs tracking-wider uppercase mb-4 text-sky-600/50">
                    {excerpt.question}
                  </p>
                  <p className="text-sky-100/70 leading-relaxed font-light">
                    {excerpt.answer}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Selected Works */}
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="font-serif text-2xl text-amber-50/70 mb-2">Selected Works</h2>
            <p className="text-amber-200/40 text-sm">A curated selection of performances</p>
          </motion.div>

          <div className="space-y-6">
            {works.map((work, index) => (
              <motion.div
                key={work.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group p-6 rounded-sm border hover:bg-sky-950/10 transition-all duration-300"
                style={{
                  borderColor: 'rgba(56, 189, 248, 0.15)',
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-serif text-xl text-sky-50/80">{work.title}</h3>
                      <span className="px-2 py-0.5 bg-sky-900/30 text-sky-600/60 font-mono text-[10px] tracking-wider uppercase rounded-sm">
                        {work.role}
                      </span>
                    </div>
                    <p className="text-sky-200/50 text-sm">{work.description}</p>
                  </div>
                  <div className="text-sky-600/30 font-mono text-xs tracking-wider">
                    {work.year}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-20 px-6 border-t border-amber-900/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <Link
              href="/profiles/sonya"
              className="inline-flex items-center gap-3 text-amber-200/40 hover:text-amber-200/70 transition-colors font-mono text-xs tracking-wider group"
            >
              <span>DISCOVER SONYA</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </Link>
            <div className="mt-8 pt-8 border-t border-amber-900/10">
              <p className="font-mono text-[10px] tracking-wider"
                style={{
                  background: 'linear-gradient(90deg, rgba(254, 243, 199, 0.2) 0%, rgba(186, 230, 253, 0.15) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                THE LIBRARY OF SOLITUDE · A QUIET SPACE FOR DEEP THOUGHT
              </p>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
