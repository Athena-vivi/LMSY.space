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
    <footer
      className="border-t backdrop-blur-xl"
      style={{
        borderColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 md:py-8">
          {/* Copyright - single line. The old quick-link row duplicated the
              header navigation with retired URLs, so only the copyright
              notice and its policy page remain, side by side. */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
            <button
              onClick={handleCopyrightClick}
              className="text-[10px] text-ink-2 hover:text-ink transition-colors cursor-pointer font-light tracking-wide"
              aria-label="Copyright information"
            >
              © {new Date().getFullYear()} lmsy.space |{' '}
              <span className="text-ink-2">Curated by Astra. Made with love for LMSY & Besties.</span>
            </button>
            <span className="text-[10px] text-ink-2/50">·</span>
            <Link
              href="/copyright"
              className="text-[10px] font-light uppercase tracking-wider text-ink-2 transition-colors hover:text-ink"
            >
              {t(language, 'nav.copyright')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
