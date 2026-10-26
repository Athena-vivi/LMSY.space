import type { Metadata } from 'next';
import { getTranslation } from '@/lib/languages';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'About',
  description: getTranslation('en', 'meta.about'),
  path: '/about',
});

/**
 * About page — intentionally a server component (no 'use client').
 * Its whole purpose is E-E-A-T for search engines: who runs the site,
 * the unofficial disclaimer, and the rights-holder contact must be in
 * the SSR HTML. Copy is static English, matching the SSR language.
 */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-gradient-radial from-lmsy-yellow/5 via-lmsy-blue/3 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                About
              </span>
            </h1>
            <p className="text-lg md:text-xl text-ink-2 font-light">
              LMSY Fan Archive
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="bg-muted/20 rounded-2xl p-8 md:p-12 border border-border/50">
              <h2 className="font-serif text-2xl md:text-3xl font-bold mb-6">
                What this site is
              </h2>
              <p className="text-ink-2 leading-relaxed">
                LMSY Fan Archive is an unofficial fan-run archive for the Thai
                GL duo LMSY — Lookmhee Punyapat Wangpongsathaporn and Sonya
                Saranphat Pedersen.
              </p>
              <p className="text-ink-2 leading-relaxed mt-4">
                This site is a collection effort: photos, magazine editorials,
                events and records are organized into a browsable archive, with
                each entry catalogued by date and source.
              </p>
            </div>

            <div className="bg-muted/20 rounded-2xl p-8 md:p-12 border border-border/50">
              <h2 className="font-serif text-2xl md:text-3xl font-bold mb-6">
                Unofficial disclaimer
              </h2>
              <p className="text-ink-2 leading-relaxed">
                This site is maintained by Astra and is not affiliated with,
                endorsed by, or connected to LMSY, their agency (CHANGE2561),
                or any official fan club.
              </p>
            </div>

            <div className="bg-muted/30 rounded-2xl p-8 md:p-12 border border-border/50">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lmsy-blue/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-lmsy-blue" />
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold pt-2">
                  Copyright &amp; contact
                </h2>
              </div>
              <div className="pl-16 space-y-4">
                <p className="text-ink-2 leading-relaxed">
                  All photographs and content belong to their respective
                  copyright holders. Images are credited to their original
                  sources wherever possible and are presented here for archival
                  and appreciation purposes only.
                </p>
                <p className="text-ink-2 leading-relaxed">
                  If you are a rights holder and would like something removed
                  or credited differently, please reach out:
                </p>
                <a
                  href="mailto:copyright@lmsy.space"
                  className="inline-block font-serif text-lg text-lmsy-yellow hover:text-lmsy-blue transition-colors"
                >
                  copyright@lmsy.space
                </a>
                <p className="text-sm text-ink-2 pt-2">
                  See also the{' '}
                  <Link
                    href="/copyright"
                    className="underline hover:text-ink transition-colors"
                  >
                    Copyright Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
