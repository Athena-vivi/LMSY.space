'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { useLanguage } from '@/components/language-provider';

// Create context to control banner globally
interface BannerContextType {
  showBanner: () => void;
}

const BannerContext = createContext<BannerContextType>({
  showBanner: () => {},
});

export const useBanner = () => useContext(BannerContext);

const bannerContent = {
  en: {
    message: 'Welcome to this unfinished universe of love, dear Bestie. This place is becoming complete, little by little.',
  },
  zh: {
    message: '欢迎来到这个尚未完工的爱的宇宙，亲爱的 Bestie。这里正在一点点变得完整。',
  },
  th: {
    message: 'ยินดีต้อนรับสู่จักรวาลแห่งความรักที่ยังสร้างไม่เสร็จ เบสตี้ที่รัก ที่นี่กำลังค่อยๆ สมบูรณ์ขึ้น',
  },
};

export function ConstructionBanner() {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  // Function to show banner manually - using useCallback to maintain stable reference
  const showBanner = useCallback(() => {
    setIsVisible(true);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ showBanner }), [showBanner]);

  useEffect(() => {
    // Check if user has dismissed the banner
    const dismissed = localStorage.getItem('construction-banner-dismissed');
    if (!dismissed) {
      // Show banner after a short delay for elegance
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Remember dismissal for 7 days
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('construction-banner-dismissed', expiry.toString());
  };

  const content = bannerContent[language as keyof typeof bannerContent] || bannerContent.en;

  return (
    <BannerContext.Provider value={contextValue}>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -20, scaleY: 0.95 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed top-20 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
          >
            <div className="relative max-w-2xl pointer-events-auto">
              {/* Glassmorphism card */}
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

                {/* Inner content with dark background */}
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
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lmsy-yellow to-lmsy-blue flex items-center justify-center">
                            <span className="text-sm">✨</span>
                          </div>
                          {/* Glowing effect */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lmsy-yellow to-lmsy-blue blur-md opacity-50 animate-pulse" />
                        </div>
                      </motion.div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-base text-foreground/90 leading-relaxed font-serif">
                          {content.message}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-2 font-mono tracking-wider">
                          UNDER CONSTRUCTION
                        </p>
                      </div>

                      {/* Close button */}
                      <motion.button
                        onClick={handleDismiss}
                        className="flex-shrink-0 p-1 rounded-md hover:bg-muted transition-colors group"
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Decorative bottom line */}
                  <div className="h-0.5 bg-gradient-to-r from-transparent via-lmsy-blue/50 to-transparent" />
                </div>
              </motion.div>

              {/* Decorative sparkles */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-lmsy-yellow rounded-full"
                  initial={{
                    x: '-50%',
                    y: '-50%',
                    opacity: 0,
                  }}
                  animate={{
                    x: [`${-50 + i * 30}%`, `${150 + i * 30}%`],
                    y: [`${-50 + i * 20}%`, `${50 + i * 20}%`],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3 + i * 0.5,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: 'easeInOut',
                  }}
                  style={{
                    boxShadow: '0 0 6px 2px rgba(251, 191, 36, 0.5)',
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </BannerContext.Provider>
  );
}
