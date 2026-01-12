'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-url';
import { MusicPlatformLinks } from '@/components/music-platform-links';

// Playlist with R2 preview snippets (30s high-quality previews)
const playlist = [
  {
    id: '1',
    title: 'Silent Resonance',
    artist: 'Sonya',
    cover: 'gallery/music/silent-resonance-cover.jpg',
    previewAudio: 'gallery/music/previews/silent-resonance-preview.mp3', // R2 30s preview
    duration: 30,
    platforms: {
      spotify: 'https://open.spotify.com/track/example1',
      appleMusic: 'https://music.apple.com/album/example1',
      youtubeMusic: 'https://music.youtube.com/watch?v=example1',
      netEase: 'https://music.163.com/#/song?id=example1',
    },
  },
  {
    id: '2',
    title: 'Golden Hour',
    artist: 'Lookmhee',
    cover: 'gallery/music/golden-hour-cover.jpg',
    previewAudio: 'gallery/music/previews/golden-hour-preview.mp3', // R2 30s preview
    duration: 30,
    platforms: {
      spotify: 'https://open.spotify.com/track/example2',
      appleMusic: 'https://music.apple.com/album/example2',
      youtubeMusic: 'https://music.youtube.com/watch?v=example2',
      netEase: 'https://music.163.com/#/song?id=example2',
    },
  },
  {
    id: '3',
    title: 'Duality',
    artist: 'LMSY',
    cover: 'gallery/music/duality-cover.jpg',
    previewAudio: 'gallery/music/previews/duality-preview.mp3', // R2 30s preview
    duration: 30,
    platforms: {
      spotify: 'https://open.spotify.com/track/example3',
      appleMusic: 'https://music.apple.com/album/example3',
      youtubeMusic: 'https://music.youtube.com/watch?v=example3',
      netEase: 'https://music.163.com/#/song?id=example3',
    },
  },
];

export function VinylPlayer() {
  const { language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [volume, setVolume] = useState(0.3);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentTrack = playlist[currentTrackIndex];

  // 播放/暂停控制 - 播放 R2 预览片段
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
    setIsPlaying(false);
  };

  // 下一首
  const playNext = () => {
    const newIndex = currentTrackIndex === playlist.length - 1 ? 0 : currentTrackIndex + 1;
    setCurrentTrackIndex(newIndex);
    setProgress(0);
    setIsPlaying(false);
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 进度条更新 - 使用真实音频进度
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const current = audio.currentTime;
      const total = audio.duration || 30;
      const newProgress = (current / total) * 100;
      setProgress(newProgress);

      // 预览播放完毕后循环
      if (current >= total) {
        playNext();
      }
    };

    const handleLoadedMetadata = () => {
      // 音频加载完成
    };

    const handleEnded = () => {
      playNext();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex]);

  // 音轨切换时加载新的预览音频
  useEffect(() => {
    if (audioRef.current) {
      setProgress(0);
      const audioUrl = getImageUrl(currentTrack.previewAudio);
      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }
    }
  }, [currentTrackIndex, currentTrack.previewAudio]);

  // 音量控制
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // 进度条点击跳转
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;

    if (audioRef.current) {
      const duration = audioRef.current.duration || 30;
      audioRef.current.currentTime = (percentage / 100) * duration;
      setProgress(percentage);
    }
  };

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && !target.closest('.vinyl-player-container')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      {/* Audio element for R2 preview playback */}
      <audio
        ref={audioRef}
        preload="metadata"
      />

      {/* 左下角固定位置 - 空间化设计 */}
      <div className="fixed bottom-6 left-6 z-40 flex items-center gap-6 vinyl-player-container">
        <AnimatePresence mode="wait" initial={false}>
          {!isOpen ? (
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
                setIsOpen(true);
              }}
            >
              {/* 外环 - 黄色 */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: '80px',
                  height: '80px',
                  border: '1px solid rgba(251, 191, 36, 0.6)',
                  filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4)) drop-shadow(0 0 16px rgba(251, 191, 36, 0.2)) drop-shadow(0 0 24px rgba(251, 191, 36, 0.1))',
                }}
                animate={
                  isPlaying
                    ? {
                        rotate: 360,
                        borderColor: ['rgba(251, 191, 36, 0.6)', 'rgba(251, 191, 36, 0.9)', 'rgba(251, 191, 36, 0.6)'],
                        filter: [
                          'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4)) drop-shadow(0 0 16px rgba(251, 191, 36, 0.2)) drop-shadow(0 0 24px rgba(251, 191, 36, 0.1))',
                          'drop-shadow(0 0 12px rgba(251, 191, 36, 0.6)) drop-shadow(0 0 24px rgba(251, 191, 36, 0.3)) drop-shadow(0 0 36px rgba(251, 191, 36, 0.15))',
                          'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4)) drop-shadow(0 0 16px rgba(251, 191, 36, 0.2)) drop-shadow(0 0 24px rgba(251, 191, 36, 0.1))',
                        ],
                      }
                    : {
                        opacity: [0.4, 0.7, 0.4],
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
                  filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.2)) drop-shadow(0 0 24px rgba(56, 189, 248, 0.1))',
                }}
                animate={
                  isPlaying
                    ? {
                        rotate: -360,
                        borderColor: ['rgba(56, 189, 248, 0.6)', 'rgba(56, 189, 248, 0.9)', 'rgba(56, 189, 248, 0.6)'],
                        filter: [
                          'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.2)) drop-shadow(0 0 24px rgba(56, 189, 248, 0.1)) brightness(1)',
                          'drop-shadow(0 0 12px rgba(56, 189, 248, 0.6)) drop-shadow(0 0 24px rgba(56, 189, 248, 0.3)) drop-shadow(0 0 36px rgba(56, 189, 248, 0.15)) brightness(1.5)',
                          'drop-shadow(0 0 8px rgba(56, 189, 248, 0.4)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.2)) drop-shadow(0 0 24px rgba(56, 189, 248, 0.1)) brightness(1)',
                        ],
                      }
                    : {
                        opacity: [0.5, 0.8, 0.5],
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

              {/* Hover Tooltip - 磨砂玻璃质感 - 显示在图标右侧 */}
              <motion.div
                className="absolute left-full top-1/2 -translate-y-1/2 ml-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none whitespace-nowrap"
              >
                <motion.div
                  className="relative px-2 py-1 rounded-md backdrop-blur-md"
                  style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                  initial={{ letterSpacing: '0.3em' }}
                  whileHover={{ letterSpacing: '0.15em' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <span className="text-[10px] text-white/70" style={{ fontFamily: 'var(--font-serif)' }}>
                    Listen To The Resonance
                  </span>
                </motion.div>
              </motion.div>
            </motion.div>
          ) : (
            /* 展开状态：极简播放器 - 星云中漂浮的半透控制台 */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.4 }}
              className="relative"
            >
              <div
                className="backdrop-blur-3xl rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                }}
              >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-3 border-b"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.04)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-lmsy-yellow animate-pulse" />
                    <p className="text-[10px] font-mono text-white/40 tracking-wider uppercase">Preview</p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/30 hover:text-white/60"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="p-5 space-y-5 w-[280px]">
                  {/* 专辑信息 */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden border flex-shrink-0"
                      style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                    >
                      {(() => {
                        const coverUrl = getImageUrl(currentTrack.cover);
                        return coverUrl ? (
                          <Image
                            src={coverUrl}
                            alt={currentTrack.title}
                            fill
                            className="object-cover"
                            sizes="56px"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20">
                            <p className="font-serif text-lg font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                              {currentTrack.artist[0]}
                            </p>
                          </div>
                        );
                      })()}
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
                      onClick={handleSeek}
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
                      <span>{formatTime((progress / 100) * (currentTrack.duration || 30))}</span>
                      <span>0:30</span>
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

                  {/* 播放列表预览 - 优化视觉权重 */}
                  <div className="pt-4 border-t"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.04)' }}
                  >
                    <p className="text-[7px] font-mono text-white/20 mb-2 tracking-wider uppercase">Up Next</p>
                    <div className="space-y-1">
                      {playlist.slice(currentTrackIndex + 1, currentTrackIndex + 3).map((track) => (
                        <div
                          key={track.id}
                          onClick={() => {
                            const newIndex = playlist.findIndex(t => t.id === track.id);
                            setCurrentTrackIndex(newIndex);
                            setIsPlaying(false);
                          }}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group/track"
                        >
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border"
                            style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                          >
                            {(() => {
                              const coverUrl = getImageUrl(track.cover);
                              return coverUrl ? (
                                <Image src={coverUrl} alt={track.title} fill className="object-cover" sizes="32px" unoptimized />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-lmsy-yellow/10 to-lmsy-blue/10">
                                  <p className="text-[8px] font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                                    {track.artist[0]}
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-thin font-serif text-white/50 truncate">{track.title}</p>
                            <p className="text-[9px] text-white/20 truncate">{track.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Platform Links - Support message */}
                  <MusicPlatformLinks
                    trackName={currentTrack.title}
                    platforms={currentTrack.platforms}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
