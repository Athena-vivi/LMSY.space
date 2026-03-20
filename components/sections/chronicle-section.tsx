'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/language-provider';
import { DEFAULT_MILESTONES_CONTENT, normalizeMilestonesContent } from '@/app/admin/settings/content-blocks';

interface MilestoneContent {
  sectionTitle: string;
  year2022: string;
  year2023: string;
  year2024: string;
  year2025: string;
  ongoing: string;
  bottomNote: string;
}

interface MilestoneProps {
  year: string;
  title: string;
  index: number;
  onHover: (isHovering: boolean, year: string) => void;
}

function Milestone({ year, title, index, onHover }: MilestoneProps) {
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const isInfinity = year === '∞';

  useEffect(() => {
    async function fetchMilestoneImage() {
      try {
        const response = await fetch('/api/milestones');
        if (!response.ok) return;

        const result = await response.json();
        if (result.success && result.data) {
          setFeaturedImage(result.data[year] || null);
        }
      } catch (error) {
        console.error(`[MILESTONE_${year}] Failed to fetch:`, error);
      }
    }

    fetchMilestoneImage();
  }, [year]);

  const content = (
    <motion.div
      className="relative flex flex-col items-center group cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      onHoverStart={() => onHover(true, year)}
      onHoverEnd={() => onHover(false, year)}
    >
      <motion.div
        className="relative mb-6"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="font-serif text-6xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-br from-white/90 to-white/60 bg-clip-text text-transparent">
          {year}
        </h3>

        <motion.div
          className="absolute inset-0 -z-10 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-60"
          style={{
            background: `radial-gradient(circle, ${isInfinity ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.2)'} 0%, transparent 70%)`,
          }}
        />
      </motion.div>

      <motion.div
        className={`relative mb-6 aspect-[3/4] w-full overflow-hidden rounded-lg border ${
          isInfinity
            ? 'border-lmsy-yellow/30 bg-lmsy-yellow/5'
            : 'border-white/10 bg-white/[0.03]'
        }`}
        whileHover={{ borderColor: isInfinity ? 'rgba(251, 191, 36, 0.5)' : 'rgba(255, 255, 255, 0.2)' }}
        transition={{ duration: 0.3 }}
      >
        {featuredImage ? (
          <>
            <Image
              src={featuredImage}
              alt={`${year} featured`}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <motion.div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="absolute bottom-4 left-4 right-4 text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className={`font-mono text-xs tracking-widest uppercase ${isInfinity ? 'text-lmsy-yellow/90' : 'text-white/80'}`}>
                {isInfinity ? 'Story Continues →' : 'Enter Archive →'}
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {isInfinity ? (
              <>
                <motion.div
                  className="relative"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <svg
                    className="h-24 w-24 text-lmsy-yellow/80"
                    viewBox="0 0 100 100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M 25 50 C 25 35, 45 35, 50 50 C 55 65, 75 65, 75 50 C 75 35, 55 35, 50 50 C 45 65, 25 65, 25 50 Z"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 bg-lmsy-yellow/40 blur-xl" />
                </motion.div>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-lmsy-yellow/30"
                    animate={{ scale: [1, 1.5, 2], opacity: [0.6, 0.3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i, ease: 'easeOut' }}
                  />
                ))}
              </>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10">
                <motion.div
                  className="h-12 w-12 rounded-full border border-white/20 border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            )}
          </div>
        )}
      </motion.div>

      <p className="max-w-[200px] text-center font-serif text-lg text-white/70 transition-colors group-hover:text-white/90 md:text-xl">
        {title}
      </p>
    </motion.div>
  );

  if (isInfinity) {
    return (
      <Link href="/exhibition" className="block flex-1">
        {content}
      </Link>
    );
  }

  return (
    <Link href={`/chronicle?year=${year}`} className="block flex-1">
      {content}
    </Link>
  );
}

export function ChronicleSection() {
  const { language } = useLanguage();
  const [hoveredYear, setHoveredYear] = useState<string | null>(null);
  const [content, setContent] = useState(DEFAULT_MILESTONES_CONTENT);

  useEffect(() => {
    async function fetchMilestonesContent() {
      try {
        const response = await fetch('/api/site-content?key=homepage_milestones', { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        if (!data.success || !data.block?.content_i18n) return;

        setContent(normalizeMilestonesContent(data.block.content_i18n));
      } catch (error) {
        console.error('[SITE_CONTENT] Failed to fetch homepage_milestones:', error);
      }
    }

    fetchMilestonesContent();
  }, []);

  const currentContent: MilestoneContent = content[language] || content.en;

  const milestones = [
    { year: '2022', title: currentContent.year2022 },
    { year: '2023', title: currentContent.year2023 },
    { year: '2024', title: currentContent.year2024 },
    { year: '2025', title: currentContent.year2025 },
    { year: '∞', title: currentContent.ongoing },
  ];

  const yearColors: Record<string, string> = {
    '2022': 'rgba(245, 158, 11, 0.08)',
    '2023': 'rgba(16, 185, 129, 0.08)',
    '2024': 'rgba(59, 130, 246, 0.08)',
    '2025': 'rgba(139, 92, 246, 0.08)',
    '∞': 'rgba(251, 191, 36, 0.08)',
  };

  return (
    <section
      className="relative overflow-hidden py-24 transition-colors duration-1000 md:py-32"
      style={{ background: hoveredYear ? yearColors[hoveredYear] : 'transparent' }}
    >
      <div className="absolute left-1/4 top-1/2 h-[40vw] w-[40vw] -translate-y-1/2 rounded-full bg-gradient-radial from-lmsy-yellow/3 via-transparent to-transparent blur-3xl pointer-events-none" />
      <div className="absolute right-1/4 top-1/2 h-[40vw] w-[40vw] -translate-y-1/2 rounded-full bg-gradient-radial from-lmsy-blue/3 via-transparent to-transparent blur-3xl pointer-events-none" />

      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: hoveredYear
            ? `radial-gradient(circle at 50% 50%, ${yearColors[hoveredYear]} 0%, transparent 70%)`
            : 'transparent',
        }}
        transition={{ duration: 1 }}
      />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-16 text-center md:mb-24"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-4 font-serif text-4xl font-bold md:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
              {currentContent.sectionTitle}
            </span>
          </h2>

          <motion.div
            className="mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-lmsy-yellow via-lmsy-blue to-lmsy-yellow"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
        </motion.div>

        <div className="relative">
          <div className="mx-auto hidden max-w-7xl grid-cols-5 gap-6 md:grid">
            {milestones.map((milestone, index) => (
              <Milestone
                key={milestone.year}
                year={milestone.year}
                title={milestone.title}
                index={index}
                onHover={(isHovering) => setHoveredYear(isHovering ? milestone.year : null)}
              />
            ))}
          </div>

          <div className="mx-auto grid max-w-md grid-cols-2 gap-4 md:hidden">
            {milestones.map((milestone, index) => (
              <Milestone
                key={milestone.year}
                year={milestone.year}
                title={milestone.title}
                index={index}
                onHover={(isHovering) => setHoveredYear(isHovering ? milestone.year : null)}
              />
            ))}
          </div>
        </div>

        <motion.p
          className="mt-16 text-center font-serif text-sm italic text-white/40 md:text-base"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
        >
          {currentContent.bottomNote}
        </motion.p>
      </div>
    </section>
  );
}
