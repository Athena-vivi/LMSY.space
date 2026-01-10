'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export function SimpleLogo() {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/5" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-center">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative h-8 w-8 md:h-9 md:w-9">
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(56, 189, 248, 0.3) 100%)',
                  filter: 'blur(8px)',
                }}
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <Image
                src="/lmsy-logo.png"
                alt="LMSY Logo"
                fill
                className="object-contain relative z-10"
                sizes="32px"
                priority
              />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
