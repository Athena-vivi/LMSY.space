'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Archive } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { supabase } from '@/lib/supabase';

export function SiteFooter() {
  const { language } = useLanguage();
  const [artifactCount, setArtifactCount] = useState(0);

  useEffect(() => {
    async function fetchStats() {
      // Count total artifacts across all collections
      const [galleryCount, projectCount, scheduleCount] = await Promise.all([
        supabase.from('gallery').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('schedule').select('*', { count: 'exact', head: true }),
      ]);

      const total = (galleryCount.count || 0) + (projectCount.count || 0) + (scheduleCount.count || 0);
      setArtifactCount(total);
    }

    fetchStats();
  }, []);

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Logo & Description */}
            <div>
              <h3 className="font-serif text-2xl font-bold text-primary mb-4">LMSY</h3>
              <p className="text-sm text-muted-foreground">
                {t(language, 'footer.tagline')}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-medium mb-4">{t(language, 'footer.quickLinks')}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/profiles" className="text-muted-foreground hover:text-primary transition-colors">
                    {t(language, 'nav.profiles')}
                  </Link>
                </li>
                <li>
                  <Link href="/gallery" className="text-muted-foreground hover:text-primary transition-colors">
                    {t(language, 'nav.gallery')}
                  </Link>
                </li>
                <li>
                  <Link href="/projects" className="text-muted-foreground hover:text-primary transition-colors">
                    {t(language, 'nav.projects')}
                  </Link>
                </li>
                <li>
                  <Link href="/schedule" className="text-muted-foreground hover:text-primary transition-colors">
                    {t(language, 'nav.schedule')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="font-medium mb-4">{t(language, 'footer.followUs')}</h4>
              <div className="flex gap-4">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                  <span className="sr-only">{t(language, 'footer.instagram')}</span>
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span className="sr-only">{t(language, 'footer.twitter')}</span>
                </a>
              </div>
            </div>
          </div>

          <Separator className="my-8" />

          {/* Museum Stats */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 text-xs md:text-sm font-mono text-muted-foreground/60 tracking-wide">
              <Archive className="h-4 w-4" />
              <span>Currently Preserving</span>
              <span className="font-bold text-foreground/80">{artifactCount}</span>
              <span>Artifacts of LMSY</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {t(language, 'footer.copyright', { year: new Date().getFullYear() })}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {t(language, 'footer.madeWith')} <Heart className="h-4 w-4 fill-primary text-primary" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
