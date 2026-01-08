'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Disc } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import Link from 'next/link';

// Mock data - In production, this will come from Supabase
const musicTracks = [
  {
    id: '1',
    title: 'Silent Resonance',
    subtitle: '静谧的共鸣',
    duration: '4:32',
    bpm: 120,
    coverUrl: '/images/music/silent-resonance.jpg',
    releaseDate: '2024-03-15',
    vocals: ['Sonya'],
    color: 'blue',
  },
  {
    id: '2',
    title: 'Golden Hour',
    subtitle: '黄金时刻',
    duration: '3:58',
    bpm: 128,
    coverUrl: '/images/music/golden-hour.jpg',
    releaseDate: '2024-04-20',
    vocals: ['Lookmhee'],
    color: 'yellow',
  },
  {
    id: '3',
    title: 'Duality',
    subtitle: '双生',
    duration: '5:15',
    bpm: 115,
    coverUrl: '/images/music/duality.jpg',
    releaseDate: '2024-05-10',
    vocals: ['Sonya', 'Lookmhee'],
    color: 'gradient',
  },
];

export default function ResonancePage() {
  const { language } = useLanguage();
  const [selectedTrack, setSelectedTrack] = useState<typeof musicTracks[0] | null>(null);
  const [waveSpeed, setWaveSpeed] = useState(1);

  return (
    <div className="relative min-h-screen" style={{ background: '#050505' }}>
      {/* Audio Grid Lines - 音频网格线 */}
      <div className="fixed inset-0 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="audioGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#audioGrid)" />
        </svg>
      </div>

      {/* Dynamic Wave Background - AudioRefraction */}
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
            <linearGradient id="waveGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(251, 191, 36, 0.05)" />
              <stop offset="50%" stopColor="rgba(56, 189, 248, 0.05)" />
              <stop offset="100%" stopColor="rgba(251, 191, 36, 0.05)" />
            </linearGradient>
          </defs>

          {/* Wave 1 - Yellow */}
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
            transition={{
              duration: 8 / waveSpeed,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Wave 2 - Blue */}
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
            transition={{
              duration: 10 / waveSpeed,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          />

          {/* Wave 3 - Mixed */}
          <motion.path
            d="M0,600 Q360,550 720,600 T1440,600"
            fill="none"
            stroke="url(#waveGradient3)"
            strokeWidth="0.8"
            opacity={0.3}
            animate={{
              d: [
                'M0,600 Q360,550 720,600 T1440,600',
                'M0,580 Q360,630 720,580 T1440,580',
                'M0,600 Q360,550 720,600 T1440,600',
              ],
            }}
            transition={{
              duration: 12 / waveSpeed,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
        </svg>
      </div>

      {/* Hero Section with Scanning Effect */}
      <section className="relative pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center mb-16"
          >
            <motion.p
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, letterSpacing: 'normal' }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className="text-xs md:text-sm font-mono text-white/20 tracking-[0.3em] uppercase mb-6"
            >
              The Soundscape Archive
            </motion.p>

            {/* Scanning Title Effect */}
            <div className="relative inline-block mb-6">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'linear' }}
              />
              <h1 className="font-serif text-6xl md:text-8xl font-light mb-8 tracking-[0.2em]" style={{ letterSpacing: '0.15em' }}>
                <span className="block text-white/90 relative z-10">RESONANCE</span>
              </h1>
            </div>

            <p className="text-lg md:text-xl text-white/30 font-light leading-relaxed max-w-2xl mx-auto">
              {language === 'th'
                ? 'เพลงไม่ได้ถูกสร้างมาเพื่อฟัง แต่เพื่อสั่นไหวไปด้วยกัน'
                : language === 'zh'
                ? '音乐不是用来听的，而是用来共振的'
                : 'Music is not for listening. It is for resonating.'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative px-6 pb-32">
        <div className="container mx-auto max-w-6xl">
          <AnimatePresence mode="wait">
            {selectedTrack ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="mb-16"
              >
                {/* Back button */}
                <Link
                  href="/resonance"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedTrack(null);
                    setWaveSpeed(1);
                  }}
                  className="mb-8 inline-flex items-center gap-3 text-white/30 hover:text-white/50 text-sm font-mono tracking-wider transition-colors group"
                >
                  <motion.span
                    animate={{ x: [0, -4, 0] }}
                    transition={{ duration: 0.3 }}
                  >
                    ←
                  </motion.span>
                  RETURN TO ARCHIVE
                </Link>

                <div className="grid lg:grid-cols-2 gap-12 items-start">
                  {/* Visual/Album Art */}
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative"
                  >
                    <div
                      className="aspect-square rounded-2xl overflow-hidden border relative group"
                      style={{
                        borderColor: selectedTrack.color === 'blue'
                          ? 'rgba(56, 189, 248, 0.2)'
                          : selectedTrack.color === 'yellow'
                          ? 'rgba(251, 191, 36, 0.2)'
                          : 'transparent',
                        borderWidth: '1px',
                      }}
                    >
                      {/* Ripple Effect on hover */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: selectedTrack.color === 'blue'
                            ? 'radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, transparent 70%)'
                            : selectedTrack.color === 'yellow'
                            ? 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, rgba(56, 189, 248, 0.15) 50%, transparent 70%)',
                        }}
                        initial={{ scale: 0, opacity: 0.5 }}
                        whileHover={{ scale: 1.5, opacity: 1 }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                      />

                      {/* Placeholder for album art */}
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-center">
                          <div
                            className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6 border relative"
                            style={{
                              borderColor: selectedTrack.color === 'blue'
                                ? 'rgba(56, 189, 248, 0.3)'
                                : 'rgba(251, 191, 36, 0.3)',
                              borderWidth: '1px',
                            }}
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            >
                              <Disc className="h-16 w-16"
                                style={{
                                  color: selectedTrack.color === 'blue'
                                    ? 'rgba(56, 189, 248, 0.4)'
                                    : 'rgba(251, 191, 36, 0.4)',
                                }}
                              />
                            </motion.div>
                          </div>
                          <p className="text-white/10 font-mono text-xs tracking-widest">
                            ALBUM_ART_PLACEHOLDER
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Track Details */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="space-y-8"
                  >
                    {/* Title with metadata */}
                    <div>
                      <h2 className="font-serif text-5xl md:text-6xl text-white/90 mb-4">
                        {selectedTrack.title}
                      </h2>
                      <p className="text-xl text-white/30 font-light mb-6">
                        {selectedTrack.subtitle}
                      </p>

                      {/* Professional Archive Metadata */}
                      <div className="flex items-center gap-6 text-xs font-mono text-white/20 tracking-wider">
                        <span>DURATION: {selectedTrack.duration}</span>
                        <span>•</span>
                        <span>BPM: {selectedTrack.bpm}</span>
                        <span>•</span>
                        <span>{selectedTrack.vocals.join(' + ')}</span>
                      </div>

                      <div className="flex items-center gap-3 mt-6">
                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                      </div>
                    </div>

                    {/* Audio Player Placeholder */}
                    <div className="p-6 rounded-2xl border backdrop-blur-xl"
                      style={{
                        borderColor: 'rgba(255, 255, 255, 0.05)',
                        background: 'rgba(255, 255, 255, 0.02)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                            style={{
                              borderColor: selectedTrack.color === 'blue'
                                ? 'rgba(56, 189, 248, 0.3)'
                                : 'rgba(251, 191, 36, 0.3)',
                            }}
                          >
                            <Play className="h-5 w-5 ml-0.5"
                              style={{
                                color: selectedTrack.color === 'blue'
                                  ? 'rgba(56, 189, 248, 0.6)'
                                  : 'rgba(251, 191, 36, 0.6)',
                              }}
                              fill="currentColor"
                            />
                          </div>
                          <div>
                            <p className="text-white/40 font-mono text-xs">NOW PLAYING</p>
                            <p className="text-white/80 text-sm">{selectedTrack.title}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white/20 font-mono text-xs">{selectedTrack.duration}</p>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: selectedTrack.color === 'blue'
                              ? 'rgba(56, 189, 248, 0.6)'
                              : selectedTrack.color === 'yellow'
                              ? 'rgba(251, 191, 36, 0.6)'
                              : 'linear-gradient(90deg, rgba(251, 191, 36, 0.6) 0%, rgba(56, 189, 248, 0.6) 100%)',
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: '35%' }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              /* Track List */
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {musicTracks.map((track, index) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      onClick={() => {
                        setSelectedTrack(track);
                        setWaveSpeed(3); // Speed up waves on selection
                      }}
                      className="group cursor-pointer"
                    >
                      {/* Track Card - 1:1 Square */}
                      <div
                        className="aspect-square rounded-2xl overflow-hidden border relative backdrop-blur-xl"
                        style={{
                          borderColor: 'rgba(255, 255, 255, 0.05)',
                          background: 'rgba(255, 255, 255, 0.01)',
                        }}
                      >
                        {/* Ripple Effect on hover */}
                        <motion.div
                          className="absolute inset-0 rounded-2xl"
                          style={{
                            background: track.color === 'blue'
                              ? 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, transparent 70%)'
                              : track.color === 'yellow'
                              ? 'radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%)'
                              : 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, rgba(56, 189, 248, 0.1) 50%, transparent 70%)',
                          }}
                          initial={{ scale: 0, opacity: 0 }}
                          whileHover={{ scale: 2, opacity: 1 }}
                          transition={{ duration: 2, ease: 'easeOut' }}
                        />

                        {/* Cover placeholder */}
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="text-center">
                            <div
                              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 border relative"
                              style={{
                                borderColor: track.color === 'blue'
                                  ? 'rgba(56, 189, 248, 0.3)'
                                  : 'rgba(251, 191, 36, 0.3)',
                                borderWidth: '1px',
                              }}
                            >
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                              >
                                <Disc className="h-12 w-12"
                                  style={{
                                    color: track.color === 'blue'
                                      ? 'rgba(56, 189, 248, 0.4)'
                                      : 'rgba(251, 191, 36, 0.4)',
                                  }}
                                />
                              </motion.div>
                            </div>
                            <p className="text-white/10 text-xs font-mono tracking-widest mb-2">
                              COVER_ART
                            </p>
                          </div>
                        </div>

                        {/* Track info overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                          <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                            <h3 className="font-serif text-2xl text-white/90 mb-2 tracking-tight">
                              {track.title}
                            </h3>
                            <p className="text-sm text-white/30 mb-4">
                              {track.subtitle}
                            </p>

                            {/* Professional metadata */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs font-mono text-white/20">
                                <span>DURATION</span>
                                <span className="text-white/40">{track.duration}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs font-mono text-white/20">
                                <span>BPM</span>
                                <span className="text-white/40">{track.bpm}</span>
                              </div>
                              <div className="h-px bg-white/5" />
                              <div className="flex items-center justify-between text-xs font-mono text-white/20">
                                <span>VOCALS</span>
                                <span className="text-white/40">{track.vocals.join(' + ')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
