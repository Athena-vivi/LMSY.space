'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ImmersiveLoadingProps {
  onComplete: () => void;
  loading: boolean;
}

export default function ImmersiveLoading({ onComplete, loading }: ImmersiveLoadingProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Start exit sequence
      const exitTimer = setTimeout(() => {
        setShowContent(true);
        onComplete();
      }, 3200); // Extended to 3.2s to match the馆长专用版 animation timing
      return () => clearTimeout(exitTimer);
    }
  }, [loading, onComplete]);

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
      {/* 核心视觉层：LMSY 字符门户 */}
      <div className="relative flex flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="font-serif font-black select-none pointer-events-none text-transparent leading-none tracking-tighter"
          style={{
            // 响应式字号：确保在任何屏幕都不会溢出
            fontSize: 'clamp(8rem, 22vw, 24rem)',
            backgroundImage: `url(/hero-reveal.jpg)`,
            backgroundSize: 'cover', // 核心：保持比例不拉伸
            backgroundPosition: 'center 30%', // 调整这里以对准她们的脸部
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            // 增加发光感，让文字在黑暗中浮现
            filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.15)) brightness(1.1)',
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
