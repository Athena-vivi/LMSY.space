'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function ArchiveLoading() {
  const [isLoading, setIsLoading] = useState(true);
  const [catalogNumbers, setCatalogNumbers] = useState<string[]>([]);
  const [logoProgress, setLogoProgress] = useState(0);
  const [textSpacing, setTextSpacing] = useState(0.8);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate random catalog numbers
  useEffect(() => {
    const generateCatalogId = () => {
      const year = 2020 + Math.floor(Math.random() * 7); // 2020-2026
      const sequence = Math.floor(Math.random() * 999).toString().padStart(3, '0');
      return `LMSY-G-${year}-${sequence}`;
    };

    const interval = setInterval(() => {
      const newNumbers = Array.from({ length: 8 }, () => generateCatalogId());
      setCatalogNumbers(newNumbers);
    }, 80);

    return () => clearInterval(interval);
  }, []);

  // Logo stroke animation
  useEffect(() => {
    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setLogoProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Start exit sequence after logo completes
        setTimeout(() => {
          setIsLoading(false);
        }, 800);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  // Letter spacing animation (slow contraction)
  useEffect(() => {
    const duration = 2500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: start at 0.8em, slowly contract to 0.5em
      const spacing = 0.8 - (progress * 0.3);
      setTextSpacing(spacing);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  // Calculate SVG path length
  const logoPathLength = 440; // Approximate length of the dual gate logo
  const strokeDashoffset = logoPathLength * (1 - logoProgress);

  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.1,
            filter: 'blur(20px)',
          }}
          transition={{
            duration: 1.5,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden"
        >
          {/* Glowing Dual Gate Logo */}
          <div className="relative mb-16">
            {/* Outer glow */}
            <div
              className="absolute inset-0 blur-3xl opacity-40"
              style={{
                background: 'radial-gradient(circle, rgba(251, 191, 36, 0.8) 0%, rgba(56, 189, 248, 0.4) 50%, transparent 70%)',
              }}
            />

            {/* SVG Logo with stroke animation */}
            <svg
              className="relative w-32 h-32"
              viewBox="0 0 100 100"
              fill="none"
            >
              <defs>
                {/* Gradient for the stroke */}
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FBBF24" stopOpacity="1" />
                  <stop offset="50%" stopColor="#38BDF8" stopOpacity="1" />
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="1" />
                </linearGradient>

                {/* Glow filter */}
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Left Gate */}
              <path
                d="M 20 10 L 20 90 M 20 10 L 35 10 M 20 90 L 35 90"
                stroke="url(#logoGradient)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={logoPathLength / 2}
                strokeDashoffset={strokeDashoffset}
                filter="url(#glow)"
                style={{
                  transition: 'stroke-dashoffset 0.1s linear',
                }}
              />

              {/* Right Gate */}
              <path
                d="M 80 10 L 80 90 M 80 10 L 65 10 M 80 90 L 65 90"
                stroke="url(#logoGradient)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={logoPathLength / 2}
                strokeDashoffset={strokeDashoffset}
                filter="url(#glow)"
                style={{
                  transition: 'stroke-dashoffset 0.1s linear',
                }}
              />

              {/* Center connection lines */}
              <path
                d="M 35 30 L 65 30 M 35 50 L 65 50 M 35 70 L 65 70"
                stroke="url(#logoGradient)"
                strokeWidth="0.5"
                strokeLinecap="round"
                strokeDasharray={logoPathLength / 2}
                strokeDashoffset={strokeDashoffset + 100}
                opacity="0.6"
                style={{
                  transition: 'stroke-dashoffset 0.1s linear',
                }}
              />
            </svg>

            {/* Pulsing inner glow */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>

          {/* Atmospheric Text */}
          <motion.h1
            className="font-serif text-white/90 text-lg tracking-widest uppercase"
            style={{
              letterSpacing: `${textSpacing}em`,
            }}
            animate={{
              opacity: [0, 1, 1],
            }}
            transition={{
              duration: 1.5,
              times: [0, 0.5, 1],
            }}
          >
            Entering the First Orbit
          </motion.h1>

          {/* Catalog Numbers Stream */}
          <div className="absolute bottom-24 left-0 right-0 overflow-hidden">
            <motion.div
              className="flex justify-center gap-6 font-mono text-[10px]"
              animate={{
                opacity: [0, 0.4, 0.4, 0],
              }}
              transition={{
                duration: 2,
                times: [0, 0.3, 0.7, 1],
              }}
            >
              {catalogNumbers.map((number, index) => (
                <motion.span
                  key={`${number}-${index}`}
                  className="text-lmsy-yellow/60 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  animate={{
                    y: [10, 0, -10],
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: index * 0.1,
                    ease: 'easeInOut',
                  }}
                  style={{
                    fontFamily: '"Courier New", monospace',
                    textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
                  }}
                >
                  {number}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* Subtle scanline effect */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.1) 2px, rgba(255, 255, 255, 0.1) 4px)',
              backgroundSize: '100% 4px',
              animation: 'scanline 8s linear infinite',
            }}
          />

          <style jsx>{`
            @keyframes scanline {
              0% {
                transform: translateY(0);
              }
              100% {
                transform: translateY(4px);
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
