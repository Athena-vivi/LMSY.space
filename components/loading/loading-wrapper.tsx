'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, ReactNode } from 'react';
import ImmersiveLoading from './immersive-loading';

interface LoadingWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  minDuration?: number; // Minimum time to show loading (ms)
}

export function LoadingWrapper({ children, fallback, minDuration = 2000 }: LoadingWrapperProps) {
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const startTime = Date.now();

    // Simulate initial loading
    const timer = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);

      setTimeout(() => {
        setLoading(false);
        setTimeout(() => {
          setShowContent(true);
        }, 1200); // Wait for exit animation
      }, remaining);
    }, 1500);

    return () => clearTimeout(timer);
  }, [minDuration]);

  return (
    <>
      {/* Immersive Loading Screen */}
      <AnimatePresence>
        {!showContent && (
          <ImmersiveLoading loading={loading} onComplete={() => {}} />
        )}
      </AnimatePresence>

      {/* Main Content with Split Transition */}
      <AnimatePresence mode="wait">
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="min-h-screen"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
