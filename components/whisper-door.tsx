'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

/**
 * The bottom-left door.
 *
 * This slot used to hold the vinyl player: two concentric rings that opened a
 * control panel for three tracks whose audio never existed on the CDN. The
 * rings stay exactly where they were - only the payload changed. Clicking the
 * button now opens /whispers, where a visitor writes to the curator.
 *
 * Nothing sits in the bottom-right corner.
 */
export function WhisperDoor() {
  const { language } = useLanguage();

  return (
    <Link
      href="/whispers"
      aria-label={t(language, 'whispers.openForm')}
      className="fixed bottom-6 left-6 z-40 group block h-20 w-20 rounded-full"
    >
      {/* outer ring - the amber one */}
      <motion.span
        className="pointer-events-none absolute left-1/2 top-1/2 -ml-10 -mt-10 block h-20 w-20 rounded-full"
        style={{
          border: '1px solid rgba(251, 191, 36, 0.6)',
          filter:
            'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4)) drop-shadow(0 0 16px rgba(251, 191, 36, 0.2)) drop-shadow(0 0 24px rgba(251, 191, 36, 0.1))',
        }}
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* inner ring - the ice one */}
      <motion.span
        className="pointer-events-none absolute left-1/2 top-1/2 -ml-7 -mt-7 block h-14 w-14 rounded-full"
        style={{
          border: '1px solid rgba(56, 189, 248, 0.6)',
          filter:
            'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.2)) drop-shadow(0 0 24px rgba(56, 189, 248, 0.1))',
        }}
        animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.03, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      />

      {/* hover label - to the right of the rings, always on screen */}
      <span className="pointer-events-none absolute left-full top-1/2 ml-4 -translate-y-1/2 whitespace-nowrap rounded-md px-2 py-1 opacity-0 backdrop-blur-md transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
      >
        <span className="text-[10px] text-ink-2" style={{ fontFamily: 'var(--font-serif)' }}>
          {t(language, 'whispers.openForm')}
        </span>
      </span>
    </Link>
  );
}
