import type { Language } from '@/lib/languages';

// Generic month chapter titles for the project detail page (phase-4 batch 1,
// Task 4). Replaces the three hard-coded narrative titles ("Chapter I: The
// Premiere" etc.) that were written for one specific project's 2024 timeline.
// Pure + exported so it can be unit-tested without mounting the client
// component (the test imports this file directly with node --test, which is
// why it keeps its own locale map instead of importing lib/display-date.ts).

const LOCALES: Record<Language, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  th: 'th-TH',
};

// monthKey format: "YYYY-MM" (as produced by groupImagesIntoChapters).
// en: "August 2024" / zh: "2024年8月" / th: "สิงหาคม 2567" (Buddhist era).
export function formatChapterTitle(monthKey: string, language: Language): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return monthKey;
  }
  return new Intl.DateTimeFormat(LOCALES[language] ?? 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}
