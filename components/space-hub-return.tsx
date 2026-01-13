'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

/**
 * 🌌 SPACE HUB RETURN - Image Logo Anchor
 *
 * A unified return component featuring the lmsy-logo.png image.
 * Used across exhibition categories and project detail pages.
 *
 * Features:
 * - Default opacity 20%, 100% on hover
 * - "Back to Space Hub" text reveals on hover
 * - Warp-to-center animation on click
 */
export function SpaceHubReturn() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Link
      href="/"
      className="fixed top-8 left-8 z-40"
    >
      <motion.div
        className="relative group cursor-pointer"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* 🖼️ Image Logo */}
        <div className="relative h-10 w-10">
          <Image
            src="/lmsy-logo.png"
            alt="LMSY Logo"
            fill
            className="object-contain opacity-20 group-hover:opacity-100 transition-opacity duration-500"
            sizes="40px"
            priority
          />
        </div>

        {/* 📝 Hover Text - Right side */}
        <motion.div
          className="absolute left-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none whitespace-nowrap"
          initial={{ x: -5 }}
          whileHover={{ x: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <span
            className="font-serif text-[9px] tracking-[0.35em] uppercase text-white/50"
            style={{
              fontFamily: 'Playfair Display, serif',
            }}
          >
            Back to Space Hub
          </span>
        </motion.div>

        {/* 🌌 Enhanced Glow on Hover */}
        <motion.div
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, rgba(251, 191, 36, 0.2) 40%, rgba(0, 0, 0, 0) 70%)',
            filter: 'blur(8px)',
          }}
        />
      </motion.div>
    </Link>
  );
}
