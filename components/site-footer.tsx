'use client';

import Link from 'next/link';
import { Archive } from 'lucide-react';

export function SiteFooter() {

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
              CURATOR & ARCHIVIST: ASTER
            </div>
          </div>

          {/* Divider */}
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-border to-transparent mx-auto mb-12" />

          {/* Quick Links */}
          <nav className="flex flex-wrap justify-center gap-8 mb-12">
            <Link href="/profiles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Profiles
            </Link>
            <Link href="/gallery" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Gallery
            </Link>
            <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Projects
            </Link>
            <Link href="/schedule" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Schedule
            </Link>
          </nav>

          {/* Credits */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground/60">
              © 2025 lmsy.space | <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent font-medium">Curated by Aster</span>. Made with love for LMSY & Besties.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
