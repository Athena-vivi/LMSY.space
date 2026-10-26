import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import '@fontsource-variable/inter';
import '@fontsource-variable/playfair-display';
import '../globals.css';
import { SiteChrome } from '@/components/site-chrome';
import { siteMetadata } from '@/lib/site-metadata';
import { ROUTE_LANGUAGES, routeLanguage } from '@/lib/i18n-path';
import { SPLASH_INIT_SCRIPT } from '@/lib/splash-intro';

const mono = GeistMono;

/**
 * app/[lang] — root layout for the language-prefixed routes (i18n plan step 2,
 * finished in step 6).
 *
 * This is a *root* layout, not a nested one: <html lang> can only be set here,
 * and a /zh or /pt page must not carry lang="en" in its SSR HTML. That is why
 * the English routes live in a route group of their own (app/(en)/) — groups
 * do not change URLs, they only let two sibling root layouts exist.
 *
 * What this segment contributes beyond the language:
 *
 * - generateStaticParams pre-builds the four language shells;
 * - dynamicParams = false makes any other value (/fr/editorial, /xx/...) a
 *   clean 404 instead of a dynamic render;
 * - the same SiteChrome and the same metadata builder as the English root, so
 *   the site description, the keywords and the Open Graph locale are the ones
 *   of the language in the URL.
 */
export function generateStaticParams() {
  return ROUTE_LANGUAGES.map((lang) => ({ lang }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return siteMetadata(routeLanguage(lang));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const language = routeLanguage(lang);

  return (
    <html lang={language} suppressHydrationWarning>
      <body
        className={`${mono.variable} antialiased`}
        style={{ backgroundColor: '#030303', color: 'rgba(255, 255, 255, 0.9)' }}
      >
        <script dangerouslySetInnerHTML={{ __html: SPLASH_INIT_SCRIPT }} />
        <SiteChrome lang={language}>{children}</SiteChrome>
      </body>
    </html>
  );
}
