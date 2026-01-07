'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  title?: string;
  subtitle?: string;
  showWaveform?: boolean;
  onProgress?: (progress: number) => void;
  onEnded?: () => void;
  className?: string;
}

export function AudioPlayer({
  src,
  title,
  subtitle,
  showWaveform = true,
  onProgress,
  onEnded,
  className,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<number>(0);

  // Handle play/pause
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

  // Handle progress update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || 1;
      const newProgress = (current / total) * 100;

      setCurrentTime(current);
      setProgress(newProgress);
      progressRef.current = newProgress;

      if (onProgress) {
        onProgress(newProgress);
      }
    }
  };

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle ended
  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    if (onEnded) {
      onEnded();
    }
  };

  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;

    if (audioRef.current) {
      audioRef.current.currentTime = (percentage / 100) * duration;
      setProgress(percentage);
      progressRef.current = percentage;
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate waveform bars
  const waveformBars = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    height: Math.random() * 60 + 20,
  }));

  return (
    <div className={cn('relative', className)}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        muted={isMuted}
      />

      {/* Progress bar - Extremely minimalist */}
      <div
        className="relative h-[1px] w-full bg-white/10 cursor-pointer group mb-6"
        onClick={handleSeek}
      >
        <motion.div
          className="absolute top-0 left-0 h-full"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, rgba(251, 191, 36, 0.8) 0%, rgba(56, 189, 248, 0.8) 100%)',
          }}
          transition={{ duration: 0.1 }}
        />
        {/* Hover glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.1) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Play/Pause button */}
        <motion.button
          onClick={togglePlay}
          className="flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300 hover:scale-110"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
          whileHover={{
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.2), 0 0 40px rgba(56, 189, 248, 0.1)',
          }}
        >
          <AnimatePresence mode="wait">
            {isPlaying ? (
              <motion.div
                key="pause"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                <Pause className="h-4 w-4 text-white/70" strokeWidth={1.5} />
              </motion.div>
            ) : (
              <motion.div
                key="play"
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -90 }}
                transition={{ duration: 0.2 }}
              >
                <Play className="h-4 w-4 text-white/70 ml-0.5" strokeWidth={1.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Track info */}
        <div className="flex-1 mx-4">
          {title && (
            <p className="font-serif text-sm text-white/80 mb-0.5">{title}</p>
          )}
          {subtitle && (
            <p className="text-xs text-white/40 font-mono">{subtitle}</p>
          )}
        </div>

        {/* Time display */}
        <div className="text-xs font-mono text-white/30">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Mute toggle */}
        <motion.button
          onClick={() => setIsMuted(!isMuted)}
          className="ml-4 p-2 rounded-lg hover:bg-white/5 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <AnimatePresence mode="wait">
            {isMuted ? (
              <motion.div
                key="muted"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <VolumeX className="h-3.5 w-3.5 text-white/40" strokeWidth={1.5} />
              </motion.div>
            ) : (
              <motion.div
                key="unmuted"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Volume2 className="h-3.5 w-3.5 text-white/40" strokeWidth={1.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Waveform visualization - Subtle and elegant */}
      {showWaveform && isPlaying && (
        <div className="flex items-center justify-center gap-[2px] h-12 mt-4">
          {waveformBars.map((bar, index) => {
            // Create a wave effect that propagates across the bars
            const delay = index * 0.05;
            const isNearProgress = Math.abs((progress / 100) * waveformBars.length - index) < 3;

            return (
              <motion.div
                key={bar.id}
                className="w-[2px] rounded-full"
                style={{
                  height: `${bar.height * 0.3}%`,
                  background: isNearProgress
                    ? 'linear-gradient(180deg, rgba(251, 191, 36, 0.6) 0%, rgba(56, 189, 248, 0.6) 100%)'
                    : 'rgba(255, 255, 255, 0.15)',
                }}
                animate={{
                  height: isPlaying
                    ? `${bar.height * (0.3 + Math.sin(Date.now() / 500 + delay) * 0.2)}%`
                    : `${bar.height * 0.3}%`,
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Ambient player for homepage background music
interface AmbientPlayerProps {
  src: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  className?: string;
}

export function AmbientPlayer({ src, isPlaying, onTogglePlay, className }: AmbientPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(0.3); // Default to 30% volume

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        loop
        className="hidden"
      />

      {/* Minimal ambient control - "Interstellar Radio" */}
      <motion.button
        onClick={onTogglePlay}
        className={cn('relative group', className)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, rgba(56, 189, 248, 0.2) 50%, transparent 70%)',
          }}
        />

        <div className="relative w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-300"
          style={{
            borderColor: isPlaying ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.1)',
            background: isPlaying ? 'rgba(251, 191, 36, 0.1)' : 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <AnimatePresence mode="wait">
            {isPlaying ? (
              <motion.div
                key="playing"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-[2px]"
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-[2px] bg-lmsy-yellow rounded-full"
                    style={{ height: '8px' }}
                    animate={{
                      scaleY: [1, 0.5, 1],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="paused"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
              >
                <Play className="h-4 w-4 text-white/50" strokeWidth={1.5} fill="currentColor" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Subtle ring animation when playing */}
        {isPlaying && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border border-lmsy-yellow/30"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border border-lmsy-blue/20"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
                delay: 1,
              }}
            />
          </>
        )}
      </motion.button>
    </>
  );
}
