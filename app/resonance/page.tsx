'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Disc, Quote as QuoteIcon } from 'lucide-react';
import { AudioPlayer } from '@/components/audio-player';
import { useLanguage } from '@/components/language-provider';

// Mock data - In production, this will come from Supabase
const musicTracks = [
  {
    id: '1',
    title: 'Silent Resonance',
    subtitle: '静谧的共鸣',
    audioUrl: '/audio/track1.mp3',
    coverUrl: '/images/music/silent-resonance.jpg',
    visualUrl: '/images/music/silent-resonance-visual.jpg',
    releaseDate: '2024-03-15',
    vocals: ['Sonya'],
    lyrics: {
      th: 'ในที่เงียบสงบของหัวใจ เราได้ยินเสียงของดาว...',
      zh: '在心灵的静谧中 我们听见星辰的声音...',
      en: 'In the quiet of the heart, we hear the stars...',
    },
    poeticContext: 'The first moment of understanding between two souls',
    interviewQuotes: [
      {
        speaker: 'Sonya',
        quote: 'This song was written in a moment of complete surrender. I stopped trying to be perfect and just let the sound flow through me.',
        context: 'Recording session, March 2024',
      },
    ],
  },
  {
    id: '2',
    title: 'Golden Hour',
    subtitle: '黄金时刻',
    audioUrl: '/audio/track2.mp3',
    coverUrl: '/images/music/golden-hour.jpg',
    visualUrl: '/images/music/golden-hour-visual.jpg',
    releaseDate: '2024-04-20',
    vocals: ['Lookmhee'],
    lyrics: {
      th: 'แสงแห่งความทรงจำ ส่องประกายในทางที่ไม่มีที่สิ้นสุด...',
      zh: '记忆之光 在无尽的道路上闪耀...',
      en: 'The light of memory shines on the endless path...',
    },
    poeticContext: 'Where past and present embrace in warmth',
    interviewQuotes: [
      {
        speaker: 'Lookmhee',
        quote: 'The melody came to me during twilight. That magical hour when day and night hold each other.',
        context: 'Behind the lyrics, April 2024',
      },
    ],
  },
  {
    id: '3',
    title: 'Duality',
    subtitle: '双生',
    audioUrl: '/audio/track3.mp3',
    coverUrl: '/images/music/duality.jpg',
    visualUrl: '/images/music/duality-visual.jpg',
    releaseDate: '2024-05-10',
    vocals: ['Sonya', 'Lookmhee'],
    lyrics: {
      th: 'สองหัวใจ หนึ่งความฝัน สองเสียง หนึ่งเพลง...',
      zh: '两心 一梦 两声 一曲...',
      en: 'Two hearts, one dream. Two voices, one song...',
    },
    poeticContext: 'The moment two frequencies synchronize perfectly',
    interviewQuotes: [
      {
        speaker: 'Sonya',
        quote: 'When we sang together, I felt something shift. Our voices weren\'t just harmonizing—they were resonating.',
        context: 'Duality recording, May 2024',
      },
      {
        speaker: 'Lookmhee',
        quote: 'This is not a duet. It\'s a conversation that happens without words.',
        context: 'Same interview',
      },
    ],
  },
];

export default function ResonancePage() {
  const { language } = useLanguage();
  const [selectedTrack, setSelectedTrack] = useState<typeof musicTracks[0] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Dynamic Mesh Gradient Background - Adapted from profiles page */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-40">
          {/* Yellow nebula */}
          <motion.div
            className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(251, 191, 36, 0) 70%)',
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Blue nebula */}
          <motion.div
            className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(56, 189, 248, 0) 70%)',
            }}
            animate={{
              x: [0, -100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Intersection glow */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, rgba(56, 189, 248, 0.2) 50%, transparent 70%)',
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      </div>

      {/* Hero Section */}
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
              className="text-xs md:text-sm font-mono text-white/40 tracking-[0.3em] uppercase mb-6"
            >
              The Soundscape Archive
            </motion.p>
            <h1 className="font-serif text-6xl md:text-8xl font-bold mb-8 tracking-tight">
              <span className="block bg-gradient-to-r from-lmsy-yellow via-white to-lmsy-blue bg-clip-text text-transparent">
                RESONANCE
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 font-light leading-relaxed max-w-2xl mx-auto">
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
          {/* Selected Track Detail */}
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
                <button
                  onClick={() => {
                    setSelectedTrack(null);
                    setIsPlaying(false);
                  }}
                  className="mb-8 text-white/40 hover:text-white/60 text-sm font-mono tracking-wider transition-colors"
                >
                  ← RETURN TO ARCHIVE
                </button>

                <div className="grid lg:grid-cols-2 gap-12 items-start">
                  {/* Visual/Album Art */}
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden border-2 relative"
                      style={{
                        borderColor: selectedTrack.vocals.includes('Sonya')
                          ? 'rgba(56, 189, 248, 0.3)'
                          : 'rgba(251, 191, 36, 0.3)',
                        boxShadow: selectedTrack.vocals.includes('Sonya')
                          ? '0 0 60px rgba(56, 189, 248, 0.2)'
                          : '0 0 60px rgba(251, 191, 36, 0.2)',
                      }}
                    >
                      {/* Placeholder for album art */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Disc className="h-32 w-32 text-white/10 mx-auto mb-6" />
                          <p className="text-white/20 font-mono text-xs tracking-widest">
                            ALBUM_ART_PLACEHOLDER
                          </p>
                        </div>
                      </div>

                      {/* Vinyl texture overlay */}
                      <div className="absolute inset-0 opacity-[0.02]"
                        style={{
                          backgroundImage: 'repeating-radial-gradient(circle at center, transparent 0, transparent 2px, #000 3px)',
                        }}
                      />
                    </div>
                  </motion.div>

                  {/* Track Details & Player */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="space-y-8"
                  >
                    {/* Title */}
                    <div>
                      <h2 className="font-serif text-5xl md:text-6xl text-white/90 mb-4">
                        {selectedTrack.title}
                      </h2>
                      <p className="text-xl text-white/40 font-light">
                        {selectedTrack.subtitle}
                      </p>
                      <div className="flex items-center gap-3 mt-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-lmsy-yellow/50 to-lmsy-blue/50" />
                        <p className="text-xs font-mono text-white/30">
                          {selectedTrack.vocals.join(' + ')}
                        </p>
                      </div>
                    </div>

                    {/* Audio Player */}
                    <div className="p-6 rounded-2xl border backdrop-blur-xl"
                      style={{
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        background: 'rgba(255, 255, 255, 0.03)',
                      }}
                    >
                      <AudioPlayer
                        src={selectedTrack.audioUrl}
                        title={selectedTrack.title}
                        subtitle={selectedTrack.vocals.join(' + ')}
                        onProgress={() => {}}
                        onEnded={() => setIsPlaying(false)}
                      />
                    </div>

                    {/* Poetic Context */}
                    <div>
                      <p className="text-white/60 leading-relaxed font-light italic border-l-2 pl-4"
                        style={{
                          borderColor: selectedTrack.vocals.includes('Sonya')
                            ? 'rgba(56, 189, 248, 0.4)'
                            : 'rgba(251, 191, 36, 0.4)',
                        }}
                      >
                        {selectedTrack.poeticContext}
                      </p>
                    </div>

                    {/* Lyrics Preview */}
                    <div>
                      <h3 className="font-serif text-sm text-white/40 mb-3 font-mono tracking-wider uppercase">
                        Lyrics Preview
                      </h3>
                      <div className="space-y-4 text-white/60 font-light leading-relaxed">
                        <p className="text-sm text-white/30 font-mono mb-2">THAI</p>
                        <p className="pl-4">{selectedTrack.lyrics.th.substring(0, 100)}...</p>
                        <p className="text-sm text-white/30 font-mono mb-2 mt-4">ENGLISH</p>
                        <p className="pl-4">{selectedTrack.lyrics.en.substring(0, 100)}...</p>
                      </div>
                    </div>

                    {/* Interview Quotes */}
                    {selectedTrack.interviewQuotes.length > 0 && (
                      <div>
                        <h3 className="font-serif text-sm text-white/40 mb-4 font-mono tracking-wider uppercase flex items-center gap-2">
                          <QuoteIcon className="h-4 w-4" />
                          In Conversation
                        </h3>
                        <div className="space-y-4">
                          {selectedTrack.interviewQuotes.map((quote, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="p-4 rounded-lg border"
                              style={{
                                borderColor: 'rgba(255, 255, 255, 0.08)',
                                background: 'rgba(255, 255, 255, 0.02)',
                              }}
                            >
                              <p className="text-xs font-mono text-white/30 mb-2">
                                {quote.speaker} · {quote.context}
                              </p>
                              <p className="text-white/70 font-light leading-relaxed italic">
                                "{quote.quote}"
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
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
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {musicTracks.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    onClick={() => setSelectedTrack(track)}
                    className="group relative aspect-[4/5] rounded-2xl overflow-hidden border cursor-pointer backdrop-blur-xl"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    {/* Cover placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border"
                          style={{
                            borderColor: track.vocals.includes('Sonya')
                              ? 'rgba(56, 189, 248, 0.3)'
                              : 'rgba(251, 191, 36, 0.3)',
                            background: track.vocals.includes('Sonya')
                              ? 'rgba(56, 189, 248, 0.1)'
                              : 'rgba(251, 191, 36, 0.1)',
                          }}
                        >
                          <Disc className="h-10 w-10"
                            style={{
                              color: track.vocals.includes('Sonya')
                                ? 'rgba(56, 189, 248, 0.5)'
                                : 'rgba(251, 191, 36, 0.5)',
                            }}
                          />
                        </div>
                        <p className="text-white/20 text-xs font-mono tracking-wider">
                          COVER_PLACEHOLDER
                        </p>
                      </div>
                    </div>

                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Track info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <h3 className="font-serif text-2xl text-white/90 mb-1">
                          {track.title}
                        </h3>
                        <p className="text-sm text-white/40 mb-3">
                          {track.subtitle}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-mono text-white/30">
                            {track.vocals.join(' + ')}
                          </p>
                          <div className="w-10 h-10 rounded-full border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{
                              borderColor: 'rgba(255, 255, 255, 0.2)',
                              background: 'rgba(0, 0, 0, 0.5)',
                            }}
                          >
                            <Play className="h-4 w-4 text-white/70 ml-0.5" strokeWidth={1.5} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: track.vocals.includes('Sonya')
                          ? 'radial-gradient(circle at center, rgba(56, 189, 248, 0.1) 0%, transparent 70%)'
                          : 'radial-gradient(circle at center, rgba(251, 191, 36, 0.1) 0%, transparent 70%)',
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
