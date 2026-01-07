'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/components/theme-provider';
import { useEffect, useState } from 'react';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder during SSR
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs font-sans tracking-wider text-lmsy-yellow font-bold">DAY</span>
        <span className="text-muted-foreground/40 text-xs">/</span>
        <span className="text-xs font-sans tracking-wider text-muted-foreground/60">SPACE</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <motion.button
        onClick={() => setTheme('light')}
        className={`
          relative text-xs font-sans tracking-wider transition-all duration-300
          ${theme === 'light'
            ? 'text-lmsy-yellow font-bold'
            : 'text-muted-foreground/60 hover:text-foreground'
          }
        `}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.2 }}
      >
        DAY
        {theme !== 'light' && (
          <motion.span
            className="absolute bottom-0 left-0 right-0 h-px bg-foreground origin-left"
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.button>
      <span className="text-muted-foreground/40 text-xs">/</span>
      <motion.button
        onClick={() => setTheme('dark')}
        className={`
          relative text-xs font-sans tracking-wider transition-all duration-300
          ${theme === 'dark'
            ? 'text-lmsy-blue font-bold'
            : 'text-muted-foreground/60 hover:text-foreground'
          }
        `}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.2 }}
      >
        SPACE
        {theme !== 'dark' && (
          <motion.span
            className="absolute bottom-0 left-0 right-0 h-px bg-foreground origin-left"
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.button>
    </div>
  );
}
