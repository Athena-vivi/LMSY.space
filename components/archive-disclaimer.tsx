'use client';

import { motion } from 'framer-motion';

/**
 * 🔒 ARCHIVE DISCLAIMER
 *
 * Global gratitude statement for all exhibition pages.
 * A tribute to the Besties who capture these fleeting moments.
 *
 * This component automatically appears in:
 * - Project detail pages
 * - Editorial/magazine pages
 * - Any archival content display
 *
 * Usage: Simply import and place in the masthead or intro section
 */
export function ArchiveDisclaimer({ variant = 'default' }: { variant?: 'default' | 'compact' | 'minimal' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className={`flex items-center gap-3 ${
        variant === 'compact' ? 'text-xs' : variant === 'minimal' ? 'text-[10px]' : 'text-sm'
      }`}
    >
      {/* 🔴🔵 Animated Status Indicator - Blinking Duo-Color Dot */}
      <div className="relative flex items-center">
        <motion.div
          className="absolute w-1 h-1 rounded-full bg-lmsy-yellow"
          animate={{
            opacity: [1, 0.3, 1],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="w-1 h-1 rounded-full bg-lmsy-blue"
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [1.2, 1, 1.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
      </div>

      {/* Gratitude Text */}
      <p
        className={`font-serif italic text-lmsy-yellow/60 font-light tracking-wide ${
          variant === 'compact' ? 'leading-relaxed' : 'leading-relaxed'
        }`}
      >
        Special thanks to the Besties who captured these fleeting moments.
      </p>

      {/* Decorative Separator (only for default variant) */}
      {variant === 'default' && (
        <motion.div
          className="flex-1 h-px bg-gradient-to-r from-lmsy-yellow/20 via-lmsy-blue/20 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        />
      )}
    </motion.div>
  );
}

/**
 * Compact version for inline use
 */
export function ArchiveDisclaimerCompact() {
  return <ArchiveDisclaimer variant="compact" />;
}

/**
 * Minimal version for tight spaces
 */
export function ArchiveDisclaimerMinimal() {
  return <ArchiveDisclaimer variant="minimal" />;
}
