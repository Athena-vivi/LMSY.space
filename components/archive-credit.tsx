'use client';

import { motion } from 'framer-motion';

/**
 * 🔒 ARCHIVE CREDIT
 *
 * Dynamic gratitude statement based on content category.
 * Automatically distinguishes between official resources and fan-captured materials.
 *
 * Logic:
 * - editorial/series → Official publishers (blue dot, Sonya's star color)
 * - appearance/journal → Fan-captured moments (yellow dot, Lookmhee's sun color)
 *
 * Usage: Place in project detail pages, editorial pages, etc.
 */
export function ArchiveCredit({
  category,
  variant = 'default',
}: {
  category: string;
  variant?: 'default' | 'compact' | 'minimal';
}) {
  // Determine content type
  const isOfficialContent = ['editorial', 'series'].includes(category);
  const isFanContent = ['appearance', 'journal', 'commercial'].includes(category);

  // Default to fan content if category doesn't match
  const showOfficialCredit = isOfficialContent;
  const showFanCredit = isFanContent || (!isOfficialContent && !isFanContent);

  // Colors based on content type
  const officialColor = 'text-lmsy-blue'; // Sonya's star color
  const fanColor = 'text-lmsy-yellow'; // Lookmhee's sun color

  // Dot animation colors
  const officialDotColor = 'bg-lmsy-blue';
  const fanDotColor = 'bg-lmsy-yellow';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className={`flex items-center gap-3 ${
        variant === 'compact' ? 'text-xs' : variant === 'minimal' ? 'text-[10px]' : 'text-sm'
      }`}
    >
      {/* Official Content Indicator - Blue Dot */}
      {showOfficialCredit && (
        <>
          <motion.div
            className="relative flex items-center"
            title="Official Content"
          >
            <motion.div
              className="w-1 h-1 rounded-full bg-lmsy-blue"
              animate={{
                opacity: [1, 0.4, 1],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>

          <p
            className={`font-serif italic ${officialColor} font-light tracking-wide`}
          >
            All media assets belong to the original publishers. Preserved for appreciation.
          </p>

          {/* Decorative Separator (only for default variant) */}
          {variant === 'default' && (
            <motion.div
              className="flex-1 h-px bg-gradient-to-r from-lmsy-blue/20 via-blue-400/20 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
            />
          )}
        </>
      )}

      {/* Fan Content Indicator - Yellow Dot */}
      {showFanCredit && (
        <>
          <motion.div
            className="relative flex items-center"
            title="Fan-Captured Content"
          >
            <motion.div
              className="w-1 h-1 rounded-full bg-lmsy-yellow"
              animate={{
                opacity: [1, 0.4, 1],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>

          <p
            className={`font-serif italic ${fanColor} font-light tracking-wide`}
          >
            Special thanks to the Besties who captured these fleeting moments.
          </p>

          {/* Decorative Separator (only for default variant) */}
          {variant === 'default' && (
            <motion.div
              className="flex-1 h-px bg-gradient-to-r from-lmsy-yellow/20 via-yellow-500/20 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
            />
          )}
        </>
      )}
    </motion.div>
  );
}

/**
 * Compact version for inline use
 */
export function ArchiveCreditCompact({ category }: { category: string }) {
  return <ArchiveCredit category={category} variant="compact" />;
}

/**
 * Minimal version for tight spaces
 */
export function ArchiveCreditMinimal({ category }: { category: string }) {
  return <ArchiveCredit category={category} variant="minimal" />;
}
