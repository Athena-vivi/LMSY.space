'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressBarProps {
  /**
   * Show the progress bar
   */
  isAnimating: boolean;
}

/**
 * NProgress-style thin progress bar for page transitions and interactions
 * Height: 2px, Yellow-Blue gradient
 * Positioned at the top of the screen
 */
export function NProgressBar({ isAnimating }: ProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isAnimating) {
      setIsVisible(true);
      setProgress(0);

      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 100);

      // Complete animation
      const completeTimeout = setTimeout(() => {
        setProgress(100);
        clearInterval(interval);

        // Hide after completion
        setTimeout(() => {
          setIsVisible(false);
        }, 300);
      }, 800);

      return () => {
        clearInterval(interval);
        clearTimeout(completeTimeout);
      };
    } else {
      // Reset if not animating
      setProgress(0);
    }
  }, [isAnimating]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-[9999] h-[2px]"
        >
          {/* Progress bar with yellow-blue gradient */}
          <motion.div
            className="h-full bg-gradient-to-r from-lmsy-yellow via-lmsy-blue to-lmsy-yellow shadow-[0_0_10px_rgba(253,224,71,0.5),0_0_20px_rgba(96,165,250,0.3)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
