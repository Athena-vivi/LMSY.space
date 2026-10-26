import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/components/language-provider';
import { ServiceWorkerProvider } from '@/components/service-worker-provider';
import { FrontendChrome } from '@/components/frontend-chrome';
import { AuthProvider } from '@/components/auth-provider';
import { JsonLd } from '@/components/json-ld';
import { websiteJsonLd } from '@/lib/json-ld';
import type { Language } from '@/lib/languages';

/**
 * Everything between <body> and the route content, shared by both root
 * layouts: the English one (app/(en)/layout.tsx) and the language one
 * (app/[lang]/layout.tsx). One definition, so the two cannot drift apart.
 *
 * `lang` seeds the language provider. On prefixed routes it matches the URL
 * prefix; the provider still reads the pathname during SSR, so the very first
 * HTML is already in the right language.
 */
export function SiteChrome({
  lang,
  children,
}: {
  lang: Language;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Structured data for rich results — every page's SSR HTML carries it */}
      <JsonLd data={websiteJsonLd()} />
      <ServiceWorkerProvider />
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="lmsy-theme">
          <LanguageProvider defaultLanguage={lang}>
            {/* Front-end chrome wraps route content: header above, footer below; hidden on /admin */}
            <FrontendChrome>
              <main className="flex-1">{children}</main>
            </FrontendChrome>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </>
  );
}
