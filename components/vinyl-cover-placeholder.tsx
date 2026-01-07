'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Disc } from 'lucide-react';

interface VinylCoverPlaceholderProps {
  artist: string;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VinylCoverPlaceholder({ artist, title, size = 'md', className }: VinylCoverPlaceholderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-full h-full text-lg',
    lg: 'w-32 h-32 text-2xl',
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <div className="w-full h-full rounded-lg overflow-hidden border bg-gradient-to-br from-gray-900 to-black"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        {/* 背景渐变 */}
        <div className="absolute inset-0 bg-gradient-to-br from-lmsy-yellow/10 via-lmsy-blue/5 to-lmsy-yellow/10" />

        {/* 纹理层 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E")',
          }}
        />

        {/* 艺人首字母 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="font-serif font-bold bg-gradient-to-br from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
              {artist.charAt(0).toUpperCase()}
            </p>
          </div>
        </div>

        {/* 黑胶唱片图标 */}
        <div className="absolute bottom-2 right-2 opacity-20">
          <Disc className="h-4 w-4 text-white" strokeWidth={1} />
        </div>

        {/* 装饰性光晕 */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 20% 30%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 70%, rgba(56, 189, 248, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 30%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)',
            ],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </div>
  );
}

// 用于有实际图片封面时的包装组件
interface VinylCoverProps {
  src: string | null | undefined;
  alt: string;
  artist: string;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isPlaying?: boolean;
}

export function VinylCover({ src, alt, artist, title, size = 'md', className, isPlaying = false }: VinylCoverProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-full h-full',
    lg: 'w-32 h-32',
  };

  if (src) {
    return (
      <div className={`${sizeClasses[size]} ${className} relative rounded-lg overflow-hidden border`}
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <motion.div
          className="absolute inset-0"
          animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 128px) 100vw, 128px"
          />
        </motion.div>

        {/* 播放时的光晕效果 */}
        {isPlaying && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.2) 0%, transparent 70%)',
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </div>
    );
  }

  return <VinylCoverPlaceholder artist={artist} title={title} size={size} className={className} />;
}
