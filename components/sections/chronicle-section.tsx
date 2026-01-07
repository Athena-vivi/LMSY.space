'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

interface MilestoneProps {
  year: string;
  titleKey: string;
  index: number;
  isLast: boolean;
}

function Milestone({ year, titleKey, index, isLast }: MilestoneProps) {
  const { language } = useLanguage();

  return (
    <motion.div
      className="relative flex flex-col items-center"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      {/* Year Label - Duo Color Gradient */}
      <motion.div
        className="relative mb-6"
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative px-6 py-3 rounded-full bg-gradient-to-r from-lmsy-yellow/10 to-lmsy-blue/10 border border-lmsy-yellow/30 backdrop-blur-sm">
          <span className="font-serif text-2xl md:text-3xl font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
            {year}
          </span>
        </div>

        {/* Glow Effect */}
        <motion.div
          className="absolute inset-0 rounded-full blur-xl -z-10"
          style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.5,
          }}
        />
      </motion.div>

      {/* Milestone Title */}
      <p className="font-serif text-base md:text-lg text-foreground/80 text-center max-w-[150px]">
        {t(language, titleKey as any)}
      </p>

      {/* Connector Line (not for last item) */}
      {!isLast && (
        <div className="hidden md:block absolute top-1/2 left-[60%] w-[80%] h-px -z-10">
          <div className="h-full bg-gradient-to-r from-lmsy-yellow/50 via-lmsy-blue/50 to-lmsy-yellow/50">
            <motion.div
              className="h-full bg-gradient-to-r from-transparent via-white/60 to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
                delay: index * 0.6,
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function ChronicleSection() {
  const { language } = useLanguage();

  const milestones = [
    { year: '2022', titleKey: 'chronicle.2022' },
    { year: '2023', titleKey: 'chronicle.2023' },
    { year: '2024', titleKey: 'chronicle.2024' },
    { year: '2025', titleKey: 'chronicle.2025' },
    { year: '∞', titleKey: 'chronicle.ongoing' },
  ];

  return (
    <section className="relative py-24 md:py-32 bg-muted/20 overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }} />
      </div>

      {/* Ambient Glow */}
      <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-gradient-radial from-lmsy-yellow/3 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-gradient-radial from-lmsy-blue/3 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

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

        {/* Timeline */}
        <div className="relative">
          {/* Desktop: Horizontal Timeline */}
          <div className="hidden md:block">
            <div className="flex items-start justify-between gap-8 max-w-6xl mx-auto">
              {milestones.map((milestone, index) => (
                <Milestone
                  key={milestone.year}
                  {...milestone}
                  index={index}
                  isLast={index === milestones.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Mobile: Vertical Timeline */}
          <div className="md:hidden max-w-md mx-auto">
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-lmsy-yellow via-lmsy-blue to-lmsy-yellow" />

              {milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.year}
                  className="relative pl-16 pb-12 last:pb-0"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  {/* Year Badge */}
                  <div className="absolute left-0 top-0 w-12 h-12 rounded-full bg-gradient-to-br from-lmsy-yellow to-lmsy-blue flex items-center justify-center shadow-lg">
                    <span className="text-sm font-bold text-white">
                      {milestone.year === '∞' ? '∞' : milestone.year.slice(-2)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="pt-2">
                    <span className="font-serif text-lg text-foreground/90">
                      {t(language, milestone.titleKey as any)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <motion.p
          className="text-center mt-16 text-sm md:text-base text-muted-foreground italic"
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
