'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ImmersiveLoadingProps {
  onComplete: () => void;
  loading: boolean;
}

const DEFAULT_SPLASH_IMAGE = '/hero-reveal.jpg';

export default function ImmersiveLoading({ onComplete, loading }: ImmersiveLoadingProps) {
  const [splashImageUrl, setSplashImageUrl] = useState(DEFAULT_SPLASH_IMAGE);

  useEffect(() => {
    if (!loading) {
      // Start exit sequence
      const exitTimer = setTimeout(() => {
        onComplete();
      }, 2800);
      return () => clearTimeout(exitTimer);
    }
  }, [loading, onComplete]);

  useEffect(() => {
    let active = true;

    async function fetchSplashImage() {
      try {
        const response = await fetch('/api/site-content?key=homepage_hero', { cache: 'no-store' });
        if (!response.ok) return;

        const data = await response.json();
        const imageUrl =
          typeof data?.block?.image_url === 'string' && data.block.image_url.trim()
            ? data.block.image_url
            : DEFAULT_SPLASH_IMAGE;

        if (active) {
          setSplashImageUrl(imageUrl);
        }
      } catch (error) {
        console.error('[SITE_CONTENT] Failed to fetch homepage_hero splash image:', error);
      }
    }

    fetchSplashImage();

    return () => {
      active = false;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.1,
        filter: 'blur(20px)',
      }}
      transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* 核心视觉层：LMSY 字符门户 - 纯文字渐变方案 */}
      <div className="relative flex flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="relative font-sans font-[800] select-none pointer-events-none leading-none tracking-[-0.08em]"
          style={{
            fontSize: 'clamp(8rem, 22vw, 24rem)',
            backgroundImage: `url(${splashImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.15)) brightness(1.08) contrast(1.04)',
          }}
        >
          LMSY
        </motion.h1>

        {/* 装饰线条：随加载进度变长 */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '60%', opacity: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="h-[1px] bg-gradient-to-r from-transparent via-lmsy-yellow/40 to-transparent mt-4"
        />

        {/* 副标题：星轨间距排版 */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.5, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="text-[12px] md:text-[14px] tracking-[0.8em] font-light text-white uppercase mt-6 text-center pl-[0.8em]"
        >
          Entering The First Orbit
        </motion.p>
      </div>

      {/* 氛围层：背景微弱的星云 */}
      <div className="absolute inset-0 -z-10 opacity-20">
        <div className="absolute left-1/4 top-1/2 w-[40vw] h-[40vw] bg-lmsy-yellow/10 blur-[120px] rounded-full" />
        <div className="absolute right-1/4 top-1/2 w-[40vw] h-[40vw] bg-lmsy-blue/10 blur-[120px] rounded-full" />
      </div>
    </motion.div>
  );
}
