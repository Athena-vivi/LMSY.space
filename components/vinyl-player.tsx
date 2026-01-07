'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils';

// Mock playlist - 在生产环境中这将来自 Supabase
const playlist = [
  {
    id: '1',
    title: 'Silent Resonance',
    artist: 'Sonya',
    cover: '/images/music/silent-resonance-cover.jpg',
    audio: '/audio/silent-resonance.mp3',
    duration: 0,
  },
  {
    id: '2',
    title: 'Golden Hour',
    artist: 'Lookmhee',
    cover: '/images/music/golden-hour-cover.jpg',
    audio: '/audio/golden-hour.mp3',
    duration: 0,
  },
  {
    id: '3',
    title: 'Duality',
    artist: 'LMSY',
    cover: '/images/music/duality-cover.jpg',
    audio: '/audio/duality.mp3',
    duration: 0,
  },
];

export function VinylPlayer() {
  const { language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [volume, setVolume] = useState(0.3);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentTrack = playlist[currentTrackIndex];

  // 播放/暂停控制
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 上一首
  const playPrevious = () => {
    const newIndex = currentTrackIndex === 0 ? playlist.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(newIndex);
    setProgress(0);
  };

  // 下一首
  const playNext = () => {
    const newIndex = currentTrackIndex === playlist.length - 1 ? 0 : currentTrackIndex + 1;
    setCurrentTrackIndex(newIndex);
    setProgress(0);
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 进度条更新
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          const current = audioRef.current.currentTime;
          const duration = audioRef.current.duration || 1;
          const newProgress = (current / duration) * 100;
          setProgress(newProgress);
        }
      }, 100);
    } else if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, currentTrackIndex]);

  // 音轨切换时重置
  useEffect(() => {
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.src = currentTrack.audio;
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  }, [currentTrackIndex]);

  // 音量控制
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack.audio}
        onEnded={playNext}
        muted={isMuted}
      />

      {/* 左下角固定位置 */}
      <div className="fixed bottom-6 left-6 z-40">
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* 收起状态：黑胶唱片 */
            <motion.div
              key="collapsed"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="relative cursor-pointer group"
              onClick={() => setIsExpanded(true)}
            >
              {/* 外发光效果 */}
              <motion.div
                className="absolute inset-0 rounded-full blur-xl"
                style={{
                  background: 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, rgba(56, 189, 248, 0.3) 50%, transparent 70%)',
                }}
                animate={{
                  scale: isPlaying ? [1, 1.2, 1] : 1,
                  opacity: isPlaying ? [0.5, 0.8, 0.5] : 0.3,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* 黑胶唱片主体 */}
              <div
                className={cn(
                  'relative w-24 h-24 md:w-32 md:h-32 rounded-full border-2 overflow-hidden',
                  'bg-gradient-to-br from-gray-900 to-black shadow-2xl'
                )}
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                {/* 旋转的黑胶纹理 */}
                <motion.div
                  className="absolute inset-0"
                  animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                >
                  {/* 黑胶纹路 */}
                  <div className="absolute inset-0">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute rounded-full border border-gray-800/50"
                        style={{
                          width: `${100 - i * 10}%`,
                          height: `${100 - i * 10}%`,
                          top: `${i * 5}%`,
                          left: `${i * 5}%`,
                        }}
                      />
                    ))}
                  </div>

                  {/* 专辑封面 */}
                  <div className="absolute inset-[30%] rounded-full overflow-hidden border-4 border-gray-900">
                    {currentTrack.cover ? (
                      <Image
                        src={currentTrack.cover}
                        alt={currentTrack.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      /* 占位符 */
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20">
                        <div className="text-center">
                          <p className="font-serif text-2xl font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                            {currentTrack.artist[0]}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 中心孔 */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-900 border border-gray-700" />
                </motion.div>
              </div>

              {/* 播放状态指示器 */}
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-lmsy-yellow rounded-full flex items-center justify-center shadow-lg">
                <AnimatePresence mode="wait">
                  {isPlaying ? (
                    <motion.div
                      key="pause-indicator"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex gap-[2px]"
                    >
                      <motion.div
                        className="w-0.5 h-2 bg-black rounded-full"
                        animate={{ scaleY: [1, 0.5, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                      <motion.div
                        className="w-0.5 h-2 bg-black rounded-full"
                        animate={{ scaleY: [1, 0.5, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="play-indicator"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Play className="h-3 w-3 text-black fill-black" strokeWidth={2} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 悬停提示 */}
              <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/90 backdrop-blur-xl rounded-lg px-3 py-2 border border-white/10 whitespace-nowrap">
                  <p className="text-xs font-medium text-white/90">{currentTrack.title}</p>
                  <p className="text-[10px] text-white/50">{currentTrack.artist}</p>
                </div>
              </div>
            </motion.div>
          ) : (
            /* 展开状态：完整播放器 */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div
                className="bg-black/95 backdrop-blur-xl rounded-2xl border overflow-hidden"
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                {/* 头部：关闭按钮 */}
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-lmsy-yellow animate-pulse" />
                    <p className="text-xs font-mono text-white/40">NOW PLAYING</p>
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/60"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="p-4 space-y-4 w-[320px]">
                  {/* 专辑信息和进度 */}
                  <div className="flex items-center gap-4">
                    {/* 小专辑封面 */}
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                      <motion.div
                        className="absolute inset-0"
                        animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      >
                        {currentTrack.cover ? (
                          <Image
                            src={currentTrack.cover}
                            alt={currentTrack.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20">
                            <p className="font-serif text-xl font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                              {currentTrack.artist[0]}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </div>

                    {/* 歌曲信息 */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-sm text-white/90 truncate">{currentTrack.title}</h4>
                      <p className="text-xs text-white/40 truncate">{currentTrack.artist}</p>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="space-y-2">
                    <div
                      className="h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        if (audioRef.current) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const percentage = (x / rect.width) * 100;
                          audioRef.current.currentTime = (percentage / 100) * (audioRef.current.duration || 1);
                          setProgress(percentage);
                        }
                      }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          background: 'linear-gradient(90deg, rgba(251, 191, 36, 0.8) 0%, rgba(56, 189, 248, 0.8) 100%)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-white/30">
                      <span>{formatTime((progress / 100) * (audioRef.current?.duration || 0))}</span>
                      <span>{formatTime(audioRef.current?.duration || 0)}</span>
                    </div>
                  </div>

                  {/* 控制按钮 */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={playPrevious}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/60"
                    >
                      <SkipBack className="h-4 w-4" strokeWidth={1.5} />
                    </button>

                    <motion.button
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                      style={{
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                      whileHover={{
                        boxShadow: '0 0 20px rgba(251, 191, 36, 0.3), 0 0 40px rgba(56, 189, 248, 0.2)',
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {isPlaying ? (
                          <motion.div
                            key="pause"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Pause className="h-5 w-5 text-white" strokeWidth={1.5} />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="play"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Play className="h-5 w-5 text-white ml-0.5" strokeWidth={1.5} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>

                    <button
                      onClick={playNext}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/60"
                    >
                      <SkipForward className="h-4 w-4" strokeWidth={1.5} />
                    </button>

                    {/* 音量控制 */}
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/60"
                    >
                      {isMuted ? (
                        <VolumeX className="h-3.5 w-3.5" strokeWidth={1.5} />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>

                  {/* 播放列表预览 */}
                  <div className="pt-3 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <p className="text-[10px] font-mono text-white/30 mb-2">UP NEXT</p>
                    <div className="space-y-1">
                      {playlist.slice(currentTrackIndex + 1, currentTrackIndex + 3).map((track) => (
                        <div
                          key={track.id}
                          onClick={() => {
                            setCurrentTrackIndex(playlist.findIndex(t => t.id === track.id));
                          }}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                            {track.cover ? (
                              <Image src={track.cover} alt={track.title} fill className="object-cover" sizes="32px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-lmsy-yellow/10 to-lmsy-blue/10">
                                <p className="text-[8px] font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                                  {track.artist[0]}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/60 truncate">{track.title}</p>
                            <p className="text-[10px] text-white/30 truncate">{track.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
