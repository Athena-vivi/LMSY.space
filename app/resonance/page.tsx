'use client';

import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { BackButton } from '@/components/back-button';

/**
 * Resonance placeholder (phase-4 batch 2, Task 4).
 *
 * The previous page rendered three fabricated tracks (fake tempo, duration,
 * vocal credits and a non-functional player). There is no real music data
 * source and no announced release, so the route now honestly says Coming
 * Soon. The route, nav seat and sitemap entry are kept so external links
 * do not break.
 */
export default function ResonancePage() {
  const { language } = useLanguage();

  return (
    <div className="relative min-h-screen">
      {/* Ambient wave background - kept from the original design, purely decorative */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(251, 191, 36, 0.1)" />
              <stop offset="100%" stopColor="rgba(251, 191, 36, 0)" />
            </linearGradient>
            <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0.1)" />
            </linearGradient>
          </defs>
          <motion.path
            d="M0,300 Q360,250 720,300 T1440,300"
            fill="none"
            stroke="url(#waveGradient1)"
            strokeWidth="1"
            opacity={0.4}
            animate={{
              d: [
                'M0,300 Q360,250 720,300 T1440,300',
                'M0,280 Q360,330 720,280 T1440,280',
                'M0,300 Q360,250 720,300 T1440,300',
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            d="M0,450 Q360,400 720,450 T1440,450"
            fill="none"
            stroke="url(#waveGradient2)"
            strokeWidth="1"
            opacity={0.4}
            animate={{
              d: [
                'M0,450 Q360,400 720,450 T1440,450',
                'M0,470 Q360,420 720,470 T1440,470',
                'M0,450 Q360,400 720,450 T1440,450',
              ],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />
        </svg>
      </div>

      <section className="relative pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <BackButton />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center"
          >
            <p className="text-xs md:text-sm font-mono text-ink-2 tracking-[0.3em] uppercase mb-6">
              The Soundscape Archive
            </p>
            <h1 className="font-serif text-6xl md:text-8xl font-light mb-8 text-ink" style={{ letterSpacing: '0.15em' }}>
              RESONANCE
            </h1>
            <p className="text-lg md:text-xl text-ink-2 font-light leading-relaxed max-w-2xl mx-auto">
              {language === 'th'
                ? 'เพลงไม่ได้ถูกสร้างมาเพื่อฟัง แต่เพื่อสั่นไหวไปด้วยกัน'
                : language === 'zh'
                ? '音乐不是用来听的，而是用来共振的'
                : 'Music is not for listening. It is for resonating.'}
            </p>
          </motion.div>

          {/* Coming Soon - the only claim this page makes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto mt-20 max-w-xl rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-12 text-center backdrop-blur-xl"
          >
            <motion.div
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-lmsy-yellow/30 bg-lmsy-yellow/5"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Music className="h-7 w-7 text-lmsy-yellow/80" strokeWidth={1.5} />
            </motion.div>
            <p className="font-serif text-3xl font-bold text-ink mb-4">
              {t(language, 'resonance.comingSoon')}
            </p>
            <p className="text-sm leading-relaxed text-ink-2">
              {t(language, 'resonance.comingSoonDesc')}
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
