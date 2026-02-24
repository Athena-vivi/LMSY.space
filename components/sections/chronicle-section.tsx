'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

interface MilestoneProps {
  year: string;
  titleKey: string;
  index: number;
  isLast: boolean;
  onHover: (isHovering: boolean, year: string) => void;
}

function Milestone({ year, titleKey, index, isLast, onHover }: MilestoneProps) {
  const { language } = useLanguage();
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const isInfinity = year === '∞';

  // Fetch milestone image for the year using public API
  useEffect(() => {
    const fetchMilestoneImage = async () => {
      try {
        const response = await fetch('/api/milestones');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setFeaturedImage(result.data[year] || null);
          }
        }
      } catch (error) {
        console.error(`[MILESTONE_${year}] Failed to fetch:`, error);
      }
    };

    fetchMilestoneImage();
  }, [year]);

  const yearColors: Record<string, string> = {
    '2022': 'from-amber-600/20 to-orange-600/20',
    '2023': 'from-emerald-600/20 to-teal-600/20',
    '2024': 'from-blue-600/20 to-indigo-600/20',
    '2025': 'from-violet-600/20 to-purple-600/20',
    '∞': 'from-lmsy-yellow/20 to-lmsy-blue/20',
  };

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
      {/* Large Serif Year */}
      <motion.div
        className="relative mb-6"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="font-serif text-6xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-br from-white/90 to-white/60 bg-clip-text text-transparent">
          {year}
        </h3>

        {/* Subtle Glow */}
        <motion.div
          className="absolute inset-0 blur-2xl -z-10 opacity-0 group-hover:opacity-60 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle, ${year === '∞' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.2)'} 0%, transparent 70%)`,
          }}
        />
      </motion.div>

      {/* Preview Slot - 3:4 Aspect Ratio */}
      <motion.div
        className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden mb-6 border ${
          isInfinity
            ? 'border-lmsy-yellow/30 bg-lmsy-yellow/5'
            : 'border-white/10 bg-white/[0.03]'
        }`}
        whileHover={{ borderColor: isInfinity ? 'rgba(251, 191, 36, 0.5)' : 'rgba(255, 255, 255, 0.2)' }}
        transition={{ duration: 0.3 }}
      >
        {featuredImage ? (
          // Show configured image
          <>
            <Image
              src={featuredImage}
              alt={`${year} featured`}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {/* Overlay on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
            <motion.div
              className="absolute bottom-4 left-4 right-4 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={{ y: 10 }}
              whileHover={{ y: 0 }}
            >
              <span className={`font-mono text-xs tracking-widest uppercase ${
                isInfinity ? 'text-lmsy-yellow/90' : 'text-white/80'
              }`}>
                {isInfinity ? 'Story Continues →' : 'Enter Archive →'}
              </span>
            </motion.div>
          </>
        ) : (
          // Show placeholder
          <div className="absolute inset-0 flex items-center justify-center">
            {isInfinity ? (
              // Infinity symbol animation (no image configured)
              <>
                <motion.div
                  className="relative"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <svg
                    className="w-24 h-24 text-lmsy-yellow/80"
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
                  <div className="absolute inset-0 blur-xl bg-lmsy-yellow/40" />
                </motion.div>
                {/* Pulsing rings */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-lmsy-yellow/30"
                    animate={{
                      scale: [1, 1.5, 2],
                      opacity: [0.6, 0.3, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 1,
                      ease: 'easeOut',
                    }}
                  />
                ))}
                <motion.div
                  className="absolute bottom-4 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <span className="font-mono text-xs text-lmsy-yellow/90 tracking-widest uppercase">
                    Story Continues →
                  </span>
                </motion.div>
              </>
            ) : (
              // Loading spinner for years
              <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
                <motion.div
                  className="w-12 h-12 rounded-full border border-white/20 border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Milestone Title */}
      <p className="font-serif text-lg md:text-xl text-white/70 text-center max-w-[200px] group-hover:text-white/90 transition-colors">
        {t(language, titleKey as any)}
      </p>
    </motion.div>
  );

  // Wrap in Link for all items
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

  const milestones = [
    { year: '2022', titleKey: 'chronicle.2022' },
    { year: '2023', titleKey: 'chronicle.2023' },
    { year: '2024', titleKey: 'chronicle.2024' },
    { year: '2025', titleKey: 'chronicle.2025' },
    { year: '∞', titleKey: 'chronicle.ongoing' },
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
      className="relative py-24 md:py-32 overflow-hidden transition-colors duration-1000"
      style={{
        background: hoveredYear ? yearColors[hoveredYear] : 'transparent',
      }}
    >
      {/* Ambient Glow */}
      <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-gradient-radial from-lmsy-yellow/3 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-gradient-radial from-lmsy-blue/3 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Dynamic background overlay on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: hoveredYear
            ? `radial-gradient(circle at 50% 50%, ${yearColors[hoveredYear]} 0%, transparent 70%)`
            : 'transparent',
        }}
        transition={{ duration: 1 }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16 md:mb-24"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
              {t(language, 'chronicle.title')}
            </span>
          </h2>

          {/* Decorative Line */}
          <motion.div
            className="mx-auto w-24 h-1 bg-gradient-to-r from-lmsy-yellow via-lmsy-blue to-lmsy-yellow rounded-full"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
        </motion.div>

        {/* Timeline - Grid Layout with Preview Slots */}
        <div className="relative">
          {/* Desktop: Horizontal Grid */}
          <div className="hidden md:grid grid-cols-5 gap-6 max-w-7xl mx-auto">
            {milestones.map((milestone, index) => (
              <Milestone
                key={milestone.year}
                {...milestone}
                index={index}
                isLast={index === milestones.length - 1}
                onHover={(isHovering) => setHoveredYear(isHovering ? milestone.year : null)}
              />
            ))}
          </div>

          {/* Mobile: Vertical Grid */}
          <div className="md:hidden grid grid-cols-2 gap-4 max-w-md mx-auto">
            {milestones.map((milestone, index) => (
              <Milestone
                key={milestone.year}
                {...milestone}
                index={index}
                isLast={index === milestones.length - 1}
                onHover={(isHovering) => setHoveredYear(isHovering ? milestone.year : null)}
              />
            ))}
          </div>
        </div>

        {/* Bottom Note */}
        <motion.p
          className="text-center mt-16 text-sm md:text-base text-white/40 italic font-serif"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
        >
          Every moment is a constellation in their universe
        </motion.p>
      </div>
    </section>
  );
}
