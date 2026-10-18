'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, ReactNode } from 'react';
import ImmersiveLoading from './immersive-loading';

interface LoadingWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * The splash photo, read on the server. Passing it down means the letterforms
   * are painted with the curator's photo on the first frame instead of opening
   * on a placeholder and swapping.
   */
  splashImageUrl?: string;
  /**
   * How long the intro splash stays on screen (ms). This is a deliberate brand
   * moment, so keep it short — it directly delays the first meaningful paint.
   * It used to be 1500ms + max(minDuration, elapsed) + 1200ms, i.e. the home
   * page waited ~3.7s before rendering anything.
   */
  minDuration?: number;
}

const MAX_SPLASH_MS = 1200;

export function LoadingWrapper({
  children,
  minDuration = 500,
  splashImageUrl = '',
}: LoadingWrapperProps) {
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const delay = Math.min(Math.max(minDuration, 0), MAX_SPLASH_MS);
    const timer = setTimeout(() => {
      setLoading(false);
      setShowContent(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [minDuration]);

  return (
    <>
      {/* Immersive Loading Screen */}
      <AnimatePresence>
        {!showContent && (
          <ImmersiveLoading
            loading={loading}
            initialImageUrl={splashImageUrl}
            onComplete={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
