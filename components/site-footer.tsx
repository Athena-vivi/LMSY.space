'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { useAuth } from '@/components/auth-provider';
import { t } from '@/lib/languages';

export function SiteFooter() {
  const { language } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleCopyrightClick = useCallback(() => {
    const now = Date.now();
    const timeDiff = now - lastClickTime;

    // Reset count if more than 2 seconds between clicks
    if (timeDiff > 2000) {
      setClickCount(1);
    } else {
      setClickCount(prev => prev + 1);
    }

    setLastClickTime(now);

    // Navigate to admin after 3 clicks within 2 seconds
    if (clickCount + 1 === 3) {
      setClickCount(0);
      // Navigate based on auth status
      if (user) {
        router.push('/admin');
      } else {
        router.push('/admin/login');
      }
    }
  }, [clickCount, lastClickTime, user, router]);

  return (
    <footer className="border-t bg-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 md:py-8">
          {/* Quick Links - First Row */}
          <nav className="flex flex-wrap justify-center gap-6 mb-4">
            <Link
              href="/chronicle"
              className="text-[10px] md:text-xs font-light text-white/30 hover:text-white/60 transition-colors tracking-wider uppercase"
            >
              {t(language, 'nav.chronicle')}
            </Link>
            <span className="text-[10px] text-white/20">•</span>
            <Link
              href="/exhibitions"
              className="text-[10px] md:text-xs font-light text-white/30 hover:text-white/60 transition-colors tracking-wider uppercase"
            >
              {t(language, 'nav.exhibitions')}
            </Link>
            <span className="text-[10px] text-white/20">•</span>
            <Link
              href="/editorial"
              className="text-[10px] md:text-xs font-light text-white/30 hover:text-white/60 transition-colors tracking-wider uppercase"
            >
              {t(language, 'nav.editorial')}
            </Link>
            <span className="text-[10px] text-white/20">•</span>
            <Link
              href="/profiles"
              className="text-[10px] md:text-xs font-light text-white/30 hover:text-white/60 transition-colors tracking-wider uppercase"
            >
              {t(language, 'nav.duality')}
            </Link>
            <span className="text-[10px] text-white/20">•</span>
            <Link
              href="/copyright"
              className="text-[10px] md:text-xs font-light text-white/30 hover:text-white/60 transition-colors tracking-wider uppercase"
            >
              Copyright
            </Link>
          </nav>

          {/* Copyright - Single Line */}
          <div className="text-center">
            <button
              onClick={handleCopyrightClick}
              className="text-[10px] text-white/20 hover:text-white/40 transition-colors cursor-pointer font-light tracking-wide"
              aria-label="Copyright information"
            >
              © 2025 lmsy.space | <span className="text-white/30">Curated by Astra. Made with love for LMSY & Besties.</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
