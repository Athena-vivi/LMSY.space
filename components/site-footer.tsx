'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Archive } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

export function SiteFooter() {
  const { language } = useLanguage();
  const router = useRouter();
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
      router.push('/admin');
    }
  }, [clickCount, lastClickTime, router]);

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-16 md:py-24">
          {/* Museum Statement */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <Archive className="h-8 w-8 text-foreground/40" />
            </div>

            <p className="font-serif text-lg md:text-xl text-foreground/70 leading-relaxed max-w-2xl mx-auto mb-4">
              Preserving the eternal light of Lookmhee & Sonya since 2025
            </p>

            <div className="font-mono text-xs md:text-sm text-muted-foreground/60 tracking-widest">
              CURATOR & ARCHIVIST: ASTRA
            </div>
          </div>

          {/* Divider */}
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-border to-transparent mx-auto mb-12" />

          {/* Quick Links */}
          <nav className="flex flex-wrap justify-center gap-8 mb-12">
            <Link href="/chronicle" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t(language, 'nav.chronicle')}
            </Link>
            <Link href="/exhibitions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t(language, 'nav.exhibitions')}
            </Link>
            <Link href="/editorial" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t(language, 'nav.editorial')}
            </Link>
            <Link href="/profiles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t(language, 'nav.duality')}
            </Link>
            <Link href="/copyright" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-lmsy-yellow/50 hover:decoration-lmsy-yellow">
              Copyright
            </Link>
          </nav>

          {/* Credits & Disclaimer */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <button
              onClick={handleCopyrightClick}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground/80 transition-colors cursor-pointer"
              aria-label="Copyright information"
            >
              © 2025 lmsy.space | <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent font-medium">Curated by Astra</span>. Made with love for LMSY & Besties.
            </button>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-lmsy-yellow/30 to-transparent mx-auto" />
            <p className="text-xs text-muted-foreground/50 leading-relaxed px-4">
              {t(language, 'footer.disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
