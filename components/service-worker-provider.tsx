'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export function ServiceWorkerProvider() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Register service worker with updateViaCache: 'none' to prevent browser caching
      navigator.serviceWorker
        .register('/sw.js', {
          updateViaCache: 'none',
        })
        .then((registration) => {
          console.log('[SW] Registered with scope:', registration.scope);

          // Check for updates immediately
          registration.update();

          // Listen for new service worker installation
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;

            if (newWorker) {
              console.log('[SW] New version found');

              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version is available and waiting
                  console.log('[SW] New version ready to activate');
                  setShowUpdateBanner(true);
                }
              });
            }
          });

          // Periodic check for updates (every 5 minutes)
          const intervalId = setInterval(() => {
            if (!registration.waiting) {
              registration.update();
            }
          }, 5 * 60 * 1000);

          return () => clearInterval(intervalId);
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
        });

      // Listen for controller change - new SW took control
      const handleControllerChange = () => {
        console.log('[SW] Controller changed, reloading page');
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);

    // Send message to waiting service worker to skip waiting
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SKIP_WAITING',
      });
    }

    // Force reload after a short delay
    setTimeout(() => {
      window.location.reload(true);
    }, 1000);
  };

  const handleDismiss = () => {
    setShowUpdateBanner(false);
  };

  return (
    <>
      <AnimatePresence>
        {showUpdateBanner && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed top-0 left-0 right-0 z-[100] flex justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto max-w-2xl">
              {/* Glassmorphism banner */}
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="relative overflow-hidden rounded-lg backdrop-blur-md border border-lmsy-yellow/30 shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
                }}
              >
                {/* Animated gradient border */}
                <div className="absolute inset-0 opacity-50">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-lmsy-yellow via-lmsy-blue to-lmsy-yellow"
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    style={{
                      backgroundSize: '200% 200%',
                    }}
                  />
                </div>

                {/* Inner content */}
                <div className="relative bg-background/95 backdrop-blur-sm rounded-lg">
                  {/* Decorative top line */}
                  <div className="h-0.5 bg-gradient-to-r from-lmsy-yellow via-lmsy-blue to-lmsy-yellow">
                    <motion.div
                      className="h-full bg-white/50"
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                  </div>

                  {/* Message content */}
                  <div className="px-6 py-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <motion.div
                        className="flex-shrink-0 mt-0.5"
                        animate={{
                          rotate: [0, 5, -5, 0],
                          scale: isUpdating ? [1, 1.2, 1] : 1,
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lmsy-yellow to-lmsy-blue flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          {/* Glowing effect */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lmsy-yellow to-lmsy-blue blur-md opacity-50 animate-pulse" />
                        </div>
                      </motion.div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-base text-foreground/90 leading-relaxed font-serif">
                          {isUpdating
                            ? '发现新藏品，正在刷新空间...'
                            : '发现新藏品，点击按钮立即更新'}
                        </p>
                        {!isUpdating && (
                          <p className="text-xs text-muted-foreground/60 mt-2 font-mono tracking-wider">
                            NEW VERSION AVAILABLE
                          </p>
                        )}
                      </div>

                      {/* Update/Close button */}
                      <motion.button
                        onClick={isUpdating ? undefined : handleUpdate}
                        disabled={isUpdating}
                        className={`flex-shrink-0 px-4 py-2 rounded-md font-medium transition-all ${
                          isUpdating
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-white hover:shadow-lg hover:shadow-lmsy-yellow/20'
                        }`}
                        whileHover={!isUpdating ? { scale: 1.05 } : {}}
                        whileTap={!isUpdating ? { scale: 0.95 } : {}}
                      >
                        {isUpdating ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <Sparkles className="w-4 h-4" />
                          </motion.div>
                        ) : (
                          '立即更新'
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Decorative bottom line */}
                  <div className="h-0.5 bg-gradient-to-r from-transparent via-lmsy-blue/50 to-transparent" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
