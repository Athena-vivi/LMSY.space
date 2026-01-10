'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ImmersiveLoadingProps {
  onComplete: () => void;
  loading: boolean;
}

export default function ImmersiveLoading({ onComplete, loading }: ImmersiveLoadingProps) {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Start exit sequence
      const exitTimer = setTimeout(() => {
        setShowContent(true);
      }, 500);
      return () => clearTimeout(exitTimer);
    }

    // Simulate loading progress
    const duration = 2500; // 2.5 seconds total
    const interval = 50;
    const increment = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [loading]);

  const handleAnimationComplete = () => {
    if (showContent) {
      onComplete();
    }
  };

  return (
    <AnimatePresence mode="wait" onExitComplete={handleAnimationComplete}>
      {loading || !showContent ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
          }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden"
        >
          {/* Nebula Background - Rotating Halos */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Amber Nebula - Rotating Clockwise */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]"
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 60,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0) 70%)',
                  filter: 'blur(80px)',
                }}
              />
            </motion.div>

            {/* Blue Nebula - Rotating Counter-Clockwise */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]"
              animate={{
                rotate: -360,
              }}
              transition={{
                duration: 45,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0) 70%)',
                  filter: 'blur(60px)',
                }}
              />
            </motion.div>

            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  backgroundSize: '256px 256px',
                }}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="relative z-10 text-center px-8">
            {/* LMSY Typography with Background Clip */}
            <motion.div
              initial={{ scale: 1, opacity: 0.6, filter: 'blur(20px)' }}
              animate={{
                scale: 1 + (progress / 100) * 0.1, // 1.0 -> 1.1
                opacity: 0.6 + (progress / 100) * 0.4, // 0.6 -> 1.0
                filter: `blur(${20 - (progress / 100) * 20}px)`, // 20px -> 0px
              }}
              exit={{
                opacity: 0,
                scale: 1.2,
              }}
              transition={{
                duration: 0.1,
                ease: 'linear',
              }}
              className="mb-12"
            >
              <div className="relative inline-block">
                {/* Background Image for Text Clip */}
                <div
                  className="absolute inset-0 -m-4"
                  style={{
                    backgroundImage: 'url(/hero-reveal.jpg.jpg), linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    backgroundSize: 'cover, 200% 200%',
                    backgroundPosition: 'center, 0% 50%',
                    filter: `brightness(${30 + (progress / 100) * 70}%)`, // Dark to bright
                  }}
                />

                {/* Text with Background Clip */}
                <h1
                  className="relative font-serif text-[12rem] md:text-[16rem] lg:text-[20rem] font-bold leading-none tracking-tighter"
                  style={{
                    fontFamily: 'var(--font-playfair-display), Playfair Display, serif',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: 'transparent',
                    textShadow: '0 0 80px rgba(0,0,0,0.5)',
                  }}
                >
                  LMSY
                </h1>
              </div>
            </motion.div>

            {/* Subtitle with Scanning Effect */}
            <div className="relative overflow-hidden">
              {/* Static Text */}
              <p className="font-mono text-[10px] md:text-xs text-white/30 tracking-[0.4em] uppercase">
                ENTERING THE FIRST ORBIT
              </p>

              {/* Scanning Line */}
              <motion.div
                className="absolute inset-0"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: 0.5,
                }}
              >
                <div
                  className="h-full w-[2px] bg-gradient-to-b from-transparent via-lmsy-yellow/60 to-transparent"
                  style={{
                    boxShadow: '0 0 20px 2px rgba(251, 191, 36, 0.4)',
                  }}
                />
              </motion.div>
            </div>

            {/* Loading Progress Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-16 w-48 mx-auto"
            >
              <div className="h-px bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-lmsy-yellow to-lmsy-blue"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="flex justify-between mt-2 font-mono text-[8px] text-white/20">
                <span>LOADING</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </motion.div>
          </div>

          {/* Corner Accents */}
          <div className="absolute inset-8 pointer-events-none">
            {/* Top Left */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.3, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="absolute top-0 left-0 w-16 h-16 border-l border-t border-lmsy-yellow/30"
            />

            {/* Bottom Right */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.3, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="absolute bottom-0 right-0 w-16 h-16 border-r border-b border-lmsy-blue/30"
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
