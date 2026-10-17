'use client';

import { BackButton } from '@/components/back-button';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

/**
 * Client-side chrome for the chronicle page sidebar (badge, title, description,
 * meta rows). Extracted from the server page so UI strings can follow the
 * visitor's language.
 */
export function ChronicleChrome({ eventCount }: { eventCount: number }) {
  const { language } = useLanguage();

  return (
    <aside className="mb-12 xl:fixed xl:top-28 xl:left-14 xl:w-[220px] xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pr-3">
      <div className="mb-8">
        <BackButton />
      </div>

      <div className="mb-5 max-w-[220px]">
        <span className="inline-flex items-center rounded-full border border-lmsy-yellow/25 bg-lmsy-yellow/10 px-3 py-1 text-[10px] font-mono tracking-[0.22em] uppercase text-lmsy-yellow">
          {t(language, 'chronicle.badge')}
        </span>
      </div>

      <div className="mb-5 max-w-[220px]">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground md:text-3xl xl:text-[2rem]">
          {t(language, 'chronicle.title')}
        </h1>
      </div>

      <div className="mb-6 h-0.5 w-24 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue" />

      <div className="mb-6 max-w-[220px]">
        <p className="text-sm leading-7 text-ink-2">
          {t(language, 'chronicle.desc')}
        </p>
      </div>

      <div className="mb-6 max-w-[220px] border-l border-lmsy-blue/25 pl-4">
        <p className="text-sm leading-relaxed text-ink-2">
          {t(language, 'chronicle.hint')}
        </p>
      </div>

      <div className="max-w-[220px] space-y-3 border-t border-white/10 pt-5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-2">
          <span>{t(language, 'chronicle.entries')}</span>
          <span className="text-ink-2">{eventCount}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-2">
          <span>{t(language, 'chronicle.type')}</span>
          <span className="text-ink-2">{t(language, 'chronicle.published')}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-2">
          <span>{t(language, 'chronicle.view')}</span>
          <span className="text-ink-2">{t(language, 'chronicle.imageFirst')}</span>
        </div>
      </div>
    </aside>
  );
}
