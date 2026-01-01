'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/components/theme-provider';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

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
        <motion.span
          className="absolute bottom-0 left-0 right-0 h-px bg-foreground origin-left"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
          style={{ display: theme === 'light' ? 'none' : 'block' }}
        />
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
        <motion.span
          className="absolute bottom-0 left-0 right-0 h-px bg-foreground origin-left"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
          style={{ display: theme === 'dark' ? 'none' : 'block' }}
        />
      </motion.button>
    </div>
  );
}
