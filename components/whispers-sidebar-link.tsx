'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function WhispersSidebarLink() {
  const pathname = usePathname();
  const isActive = pathname === '/whispers';

  return (
    <Link
      href="/whispers"
      className="hidden md:block fixed left-0 top-1/2 -translate-y-1/2 z-30 group"
      style={{
        transform: 'translateY(-50%) rotate(-90deg)',
        transformOrigin: 'left center',
      }}
    >
      <motion.div
        className="relative flex items-center gap-3 px-4 py-2"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
      >
        {/* 文字 */}
        <motion.span
          className="font-mono text-[12px] uppercase tracking-widest whitespace-nowrap"
          style={{
            color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)',
          }}
          whileHover={{ color: 'rgba(255, 255, 255, 0.9)' }}
          transition={{ duration: 0.3 }}
        >
          Whispers
        </motion.span>

        {/* 渐变短线 - 悬停时出现 */}
        <motion.div
          className="h-px rounded-full"
          style={{
            width: '0px',
            background: 'linear-gradient(90deg, rgba(251, 191, 36, 0.8) 0%, rgba(56, 189, 248, 0.8) 100%)',
          }}
          whileHover={{ width: '40px' }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />

        {/* 激活状态指示器 */}
        {isActive && (
          <motion.div
            className="absolute top-1/2 left-0 w-1.5 h-1.5 rounded-full -translate-y-1/2"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.8) 0%, rgba(56, 189, 248, 0.8) 100%)',
              boxShadow: '0 0 10px rgba(251, 191, 36, 0.5), 0 0 20px rgba(56, 189, 248, 0.3)',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>
    </Link>
  );
}
