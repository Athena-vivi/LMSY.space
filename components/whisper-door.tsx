'use client';

import { LocalizedLink as Link } from '@/components/localized-link';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

/**
 * The bottom-left rings.
 *
 * Geometry is copied from the vinyl player that used to live here: the two
 * rings are centred on the fixed anchor point itself, so the circle is
 * cropped by the left and bottom edges and only about three quarters of it
 * shows. Do not wrap this in a sized box - that is what pushed the whole
 * thing 40px into the page the first time this was rewritten.
 *
 * The player behind it is gone: no audio, no panel, no playlist. The rings
 * are static (the old idle breathing belonged to playback) and clicking them
 * opens /whispers, where a visitor writes to the curator.
 *
 * Nothing sits in the bottom-right corner.
 */
export function WhisperDoor() {
  const { language } = useLanguage();

  return (
    <Link
      href="/whispers"
      aria-label={t(language, 'whispers.openForm')}
      className="fixed bottom-6 left-6 z-40 group block"
    >
      {/* outer ring - the amber one */}
      <span
        className="absolute left-1/2 top-1/2 block h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          border: '1px solid rgba(251, 191, 36, 0.6)',
          filter:
            'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4)) drop-shadow(0 0 16px rgba(251, 191, 36, 0.2)) drop-shadow(0 0 24px rgba(251, 191, 36, 0.1))',
        }}
      />

      {/* inner ring - the ice one */}
      <span
        className="absolute left-1/2 top-1/2 block h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          border: '1px solid rgba(56, 189, 248, 0.6)',
          filter:
            'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.2)) drop-shadow(0 0 24px rgba(56, 189, 248, 0.1))',
        }}
      />

      {/* hover label - to the right of the rings, always on screen */}
      <span
        className="pointer-events-none absolute left-full top-1/2 ml-12 -translate-y-1/2 whitespace-nowrap rounded-md px-2 py-1 opacity-0 backdrop-blur-md transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
      >
        <span className="text-[10px] text-ink-2" style={{ fontFamily: 'var(--font-serif)' }}>
          {t(language, 'whispers.openForm')}
        </span>
      </span>
    </Link>
  );
}
