'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

interface ChronicleChromeProps {
  eventCount: number;
  imageCount: number;
  availableYears: string[];
  activeYear: string | null;
}

/**
 * Client-side chrome for the chronicle page sidebar (badge, title, year
 * filter, meta rows). The year filter drives the ?year=YYYY param that the
 * homepage milestone cards link to.
 */
export function ChronicleChrome({ eventCount, imageCount, availableYears, activeYear }: ChronicleChromeProps) {
  const { language } = useLanguage();

  return (
    <aside className="mb-12 xl:fixed xl:top-28 xl:left-14 xl:w-[220px] xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pr-3">
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

      {/* Year filter: only years that actually contain events are offered.
          The active year links back to the unfiltered view. */}
      {availableYears.length > 0 && (
        <div className="mb-6 max-w-[220px]">
          <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.22em] text-ink-2">
            {t(language, 'chronicle.yearFilter')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableYears.map((year) =>
              year === activeYear ? (
                <Link
                  key={year}
                  href="/chronicle"
                  className="rounded-full border border-transparent bg-gradient-to-r from-lmsy-yellow to-lmsy-blue px-3 py-1 text-xs font-medium text-ink"
                >
                  {year} ✕
                </Link>
              ) : (
                <Link
                  key={year}
                  href={`/chronicle?year=${year}`}
                  className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-ink-2 transition-colors hover:border-lmsy-blue hover:text-lmsy-blue"
                >
                  {year}
                </Link>
              )
            )}
          </div>
        </div>
      )}

      <div className="max-w-[220px] space-y-3 border-t border-white/10 pt-5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-2">
          <span>{t(language, 'chronicle.entries')}</span>
          <span className="text-ink-2">{eventCount}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-2">
          <span>{t(language, 'chronicle.type')}</span>
          <span className="text-ink-2">{t(language, 'chronicle.sourceLabel')}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-2">
          <span>{t(language, 'chronicle.view')}</span>
          <span className="text-ink-2">{imageCount}</span>
        </div>
      </div>
    </aside>
  );
}
