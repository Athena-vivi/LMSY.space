'use client';

import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { LocalizedLink as Link } from '@/components/localized-link';
import { Mail } from 'lucide-react';

/**
 * About page.
 *
 * Client component for one reason only: the copy has to follow the reader's
 * language, and `useLanguage()` is where a route's language lives. Nothing
 * here is fetched or interactive - the provider seeds the language from the
 * URL prefix during SSR, so /zh/about arrives as Chinese in the HTML a crawler
 * sees, which is what this page exists for (E-E-A-T: who runs the site, the
 * unofficial disclaimer, the rights-holder contact).
 *
 * Metadata cannot be exported from a client module, so the sibling layout.tsx
 * carries it - the same arrangement /copyright uses.
 *
 * Was hardcoded English until 2026-10-26, which meant the one page a rights
 * holder or a journalist is most likely to open stayed English on all five
 * language routes.
 */
export default function AboutPage() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                {t(language, 'about.title')}
              </span>
            </h1>
            {/* The site's own name is a proper noun - it is not translated. */}
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
                {t(language, 'about.whatTitle')}
              </h2>
              <p className="text-ink-2 leading-relaxed">
                {t(language, 'about.whatText1')}
              </p>
              <p className="text-ink-2 leading-relaxed mt-4">
                {t(language, 'about.whatText2')}
              </p>
            </div>

            <div className="bg-muted/20 rounded-2xl p-8 md:p-12 border border-border/50">
              <h2 className="font-serif text-2xl md:text-3xl font-bold mb-6">
                {t(language, 'about.disclaimerTitle')}
              </h2>
              <p className="text-ink-2 leading-relaxed">
                {t(language, 'about.disclaimerText')}
              </p>
            </div>

            <div className="bg-muted/30 rounded-2xl p-8 md:p-12 border border-border/50">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lmsy-blue/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-lmsy-blue" />
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold pt-2">
                  {t(language, 'about.contactTitle')}
                </h2>
              </div>
              <div className="pl-16 space-y-4">
                <p className="text-ink-2 leading-relaxed">
                  {t(language, 'about.contactText1')}
                </p>
                <p className="text-ink-2 leading-relaxed">
                  {t(language, 'about.contactText2')}
                </p>
                <a
                  href="mailto:copyright@lmsy.space"
                  className="inline-block font-serif text-lg text-lmsy-yellow hover:text-lmsy-blue transition-colors"
                >
                  copyright@lmsy.space
                </a>
                <p className="text-sm text-ink-2 pt-2">
                  {/* `about.seeAlso` ends with the space the sentence needs in
                      that language (Chinese does not take one), so the link
                      text can be the already-translated policy title. */}
                  {t(language, 'about.seeAlso')}
                  <Link
                    href="/copyright"
                    className="underline hover:text-ink transition-colors"
                  >
                    {t(language, 'copyright.title')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
