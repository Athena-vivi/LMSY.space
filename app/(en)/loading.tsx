'use client';

import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

/**
 * Route-level loading fallback.
 *
 * Rendered while a server component segment is streaming. Kept intentionally
 * lightweight (no animation library) so it appears immediately. It reads the
 * language from the provider, so /zh/... waits in Chinese — the old version
 * had the English string baked in.
 */
export default function Loading() {
  const { language } = useLanguage();

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
