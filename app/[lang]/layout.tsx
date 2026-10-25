import type { Language } from '@/lib/languages';

/**
 * app/[lang] — language-prefixed shell routes (i18n routing plan step 2).
 *
 * The layout itself is a pure passthrough: the language truth source is the
 * URL prefix, consumed by LanguageProvider via usePathname (works during SSR,
 * so /zh/editorial renders Chinese in the very first HTML). What this segment
 * contributes is route validation:
 *
 * - generateStaticParams pre-builds the four language shells;
 * - dynamicParams = false makes any other value (/fr/editorial, /xx/...) a
 *   clean 404 instead of a dynamic render.
 *
 * There is deliberately no /zh → / redirect page: bare prefixes stay 404 until
 * a root-language landing is decided (adding redirects needs sign-off).
 */
export const ROUTE_LANGUAGES: readonly Language[] = ['zh', 'th', 'es', 'pt'];

export function generateStaticParams() {
  return ROUTE_LANGUAGES.map((lang) => ({ lang }));
}

export const dynamicParams = false;

export default function LangLayout({ children }: { children: React.ReactNode }) {
  return children;
}
