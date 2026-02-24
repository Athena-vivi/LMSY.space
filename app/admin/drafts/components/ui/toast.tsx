/**
 * Drafts Toast Component
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface DraftsToastProps {
  toast: {
    show: boolean;
    message: string;
    type: 'success' | 'error';
  };
}

export function DraftsToast({ toast }: DraftsToastProps) {
  return (
    <AnimatePresence>
      {toast.show && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 border font-mono text-xs tracking-wider"
          style={{
            backgroundColor: toast.type === 'success' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(220, 38, 38, 0.9)',
            borderColor: toast.type === 'success' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(220, 38, 38, 0.5)',
            boxShadow: toast.type === 'success'
              ? '0 0 20px rgba(251, 191, 36, 0.2), 0 0 40px rgba(251, 191, 36, 0.1)'
              : '0 0 20px rgba(220, 38, 38, 0.2)',
            color: toast.type === 'success' ? 'rgba(251, 191, 36, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          }}
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
