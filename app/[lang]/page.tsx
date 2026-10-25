import type { Metadata } from 'next';
import { pageLanguageAlternates } from '@/lib/seo';
import { routeLanguage } from '@/lib/i18n-path';

/**
 * /<lang> — the same homepage as /, re-exported from the root route; the
 * provider seeds the language from the URL prefix. The root page reads hero
 * media on the server per request, so the shell keeps its force-dynamic
 * segment config.
 *
 * Metadata here is canonical + hreflang only: the title and the site
 * description still come from the root layout, because no language version of
 * the site name and intro sentence has been written yet. The alternates are
 * not optional though — without them /zh reads as a duplicate of /.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  return pageLanguageAlternates(routeLanguage(rawLang), '/');
}

export { default } from '../page';
