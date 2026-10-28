'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 10, x: '-50%' }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 left-1/2 z-[100] pointer-events-auto"
        >
          <div
            className="px-4 py-2.5 rounded-lg border backdrop-blur-md"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(56, 189, 248, 0.15))',
              borderColor: 'rgba(251, 191, 36, 0.3)',
              boxShadow: '0 0 20px rgba(251, 191, 36, 0.2), 0 0 40px rgba(56, 189, 248, 0.1)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.9), rgba(56, 189, 248, 0.9))',
                  boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)',
                }}
              />
              <p className="text-[10px] font-mono tracking-wider" style={{ color: 'rgba(251, 191, 36, 0.9)' }}>
                {message}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
