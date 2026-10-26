'use client';

import { usePathname } from 'next/navigation';
import { useLanguage } from '@/components/language-provider';
import { stripLangPrefix } from '@/lib/i18n-path';
import { t } from '@/lib/languages';

/**
 * Route-level loading fallback.
 *
 * Rendered while a server component segment is streaming. Kept intentionally
 * lightweight (no animation library) so it appears immediately. It reads the
 * language from the provider, so /zh/... waits in Chinese — the old version
 * had the English string baked in.
 *
 * The homepage is the exception: it brings its own door. The splash curtain is
 * painted black and arrives with the page, so a spinner plus "Loading archive"
 * during that gap read as a second, smaller door standing in front of the real
 * one. The homepage waits on a bare black field instead — the curtain's own
 * colour — so the wordmark is the first thing that appears.
 */
export default function Loading() {
  const pathname = usePathname();
  const { language } = useLanguage();

  if (stripLangPrefix(pathname) === '/') {
    return <div className="min-h-screen bg-black" aria-hidden="true" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 rounded-full border-2 border-white/15 border-t-lmsy-yellow animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm text-ink-2 font-mono tracking-widest uppercase">
          {t(language, 'site.loading')}
        </p>
      </div>
    </div>
  );
}
