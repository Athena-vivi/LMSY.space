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

  // 播放/暂停控制 - 仅用于视觉演示，不实际播放音频
  const togglePlay = () => {
    // 不尝试播放音频，只切换状态用于动画
    setIsPlaying(!isPlaying);
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

  // 进度条更新 - 模拟进度动画
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            // 播放完成后自动切换到下一首
            playNext();
            return 0;
          }
          return prev + 0.5;
        });
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

  // 音轨切换时重置 - 仅重置进度，不加载音频
  useEffect(() => {
    setProgress(0);
    // 不实际加载音频文件，避免错误
  }, [currentTrackIndex]);

  // 音量控制
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  return (
    <>
      {/* 仅保留音频元素用于UI展示，不加载实际音频 */}
      <audio ref={audioRef} />

      {/* 左下角固定位置 - 空间化设计 */}
      <div className="fixed bottom-6 left-6 z-40 flex items-center gap-6">
        <AnimatePresence mode="wait" initial={false}>
          {!isExpanded ? (
            /* 收起状态：双环光环 */
            <motion.div
              key="collapsed"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ duration: 0.8, type: 'spring', stiffness: 200, damping: 25 }}
              className="relative cursor-pointer group select-none"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(true);
              }}
            >
              {/* 外环 - 黄色 */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: '80px',
                  height: '80px',
                  border: '1px solid rgba(251, 191, 36, 0.6)',
                  boxShadow: '0 0 20px rgba(251, 191, 36, 0.3), inset 0 0 20px rgba(251, 191, 36, 0.1)',
                }}
                animate={
                  isPlaying
                    ? {
                        rotate: 360,
                        borderColor: ['rgba(251, 191, 36, 0.6)', 'rgba(251, 191, 36, 0.8)', 'rgba(251, 191, 36, 0.6)'],
                      }
                    : {
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.02, 1],
                      }
                }
                transition={
                  isPlaying
                    ? {
                        duration: 20,
                        repeat: Infinity,
                        ease: 'linear',
                      }
                    : {
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }
                }
              />

              {/* 内环 - 蓝色 */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: '56px',
                  height: '56px',
                  border: '1px solid rgba(56, 189, 248, 0.6)',
                  boxShadow: '0 0 15px rgba(56, 189, 248, 0.3), inset 0 0 15px rgba(56, 189, 248, 0.1)',
                }}
                animate={
                  isPlaying
                    ? {
                        rotate: -360,
                        borderColor: ['rgba(56, 189, 248, 0.6)', 'rgba(56, 189, 248, 0.8)', 'rgba(56, 189, 248, 0.6)'],
                      }
                    : {
                        opacity: [0.4, 0.7, 0.4],
                        scale: [1, 1.03, 1],
                      }
                }
                transition={
                  isPlaying
                    ? {
                        duration: 15,
                        repeat: Infinity,
                        ease: 'linear',
                      }
                    : {
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 0.2,
                      }
                }
              />

              {/* Hover Tooltip - 磨砂玻璃质感 */}
              <motion.div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none whitespace-nowrap"
                initial={{ y: 10, opacity: 0 }}
                whileHover={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="relative px-4 py-2 rounded-lg backdrop-blur-xl border"
                  style={{
                    background: 'rgba(56, 189, 248, 0.1)',
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    boxShadow: '0 4px 16px rgba(56, 189, 248, 0.2)',
                  }}
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(56, 189, 248, 0.9)' }}>
                    Vinyl Player
                  </span>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            /* 展开状态：极简播放器 */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.4 }}
              className="relative"
            >
              <div
                className="backdrop-blur-xl rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                }}
              >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-3 border-b"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-lmsy-yellow animate-pulse" />
                    <p className="text-[10px] font-mono text-white/40 tracking-wider uppercase">Now Playing</p>
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/30 hover:text-white/60"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="p-5 space-y-5 w-[280px]">
                  {/* 专辑信息 */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden border flex-shrink-0"
                      style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      {currentTrack.cover ? (
                        <Image
                          src={currentTrack.cover}
                          alt={currentTrack.title}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20">
                          <p className="font-serif text-lg font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                            {currentTrack.artist[0]}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-sm text-white/90 truncate">{currentTrack.title}</h4>
                      <p className="text-xs text-white/40 truncate">{currentTrack.artist}</p>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="space-y-2">
                    <div
                      className="h-0.5 bg-white/10 rounded-full overflow-hidden cursor-pointer"
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
                    <div className="flex justify-between text-[8px] font-mono text-white/30">
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
                      <SkipBack className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>

                    <motion.button
                      onClick={togglePlay}
                      className="w-11 h-11 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {isPlaying ? (
                          <motion.div
                            key="pause"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ duration: 0.1 }}
                          >
                            <Pause className="h-4.5 w-4.5 text-white" strokeWidth={1.5} />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="play"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ duration: 0.1 }}
                          >
                            <Play className="h-4.5 w-4.5 text-white ml-0.5" strokeWidth={1.5} fill="currentColor" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>

                    <button
                      onClick={playNext}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/60"
                    >
                      <SkipForward className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>

                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white/60"
                    >
                      {isMuted ? (
                        <VolumeX className="h-3 w-3" strokeWidth={1.5} />
                      ) : (
                        <Volume2 className="h-3 w-3" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>

                  {/* 播放列表预览 */}
                  <div className="pt-4 border-t"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <p className="text-[8px] font-mono text-white/30 mb-2 tracking-wider uppercase">Up Next</p>
                    <div className="space-y-1">
                      {playlist.slice(currentTrackIndex + 1, currentTrackIndex + 3).map((track) => (
                        <div
                          key={track.id}
                          onClick={() => {
                            setCurrentTrackIndex(playlist.findIndex(t => t.id === track.id));
                          }}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group/track"
                        >
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border"
                            style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                          >
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
                            <p className="text-[9px] text-white/30 truncate">{track.artist}</p>
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

        {/* Text label - only show when not expanded */}
        {!isExpanded && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.5 }}
            className="font-mono text-[8px] text-white/20 tracking-[0.25em] uppercase pointer-events-none select-none"
          >
            Listen To The Resonance
          </motion.p>
        )}
      </div>
    </>
  );
}
