'use client';

import { motion } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';

/**
 * Back navigation (P4): performs a real history back when available;
 * otherwise falls back to the parent page or the homepage.
 * Logo opacity raised so the entry point is actually visible (P1).
 */
export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Parent route: strip the last path segment (detail -> list); '/' has none.
  const segments = pathname.split('/').filter(Boolean);
  const parentHref = segments.length > 1 ? `/${segments.slice(0, -1).join('/')}` : '/';

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Prefer real history back when the user navigated within the site.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(parentHref);
    }
  };

  return (
    <motion.a
      href="/"
      onClick={handleClick}
      className="flex items-center gap-4"
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
            className="object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-500"
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
            className="font-serif text-[11px] tracking-[0.2em] uppercase text-ink-2"
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
    </motion.a>
  );
}
