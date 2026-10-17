/**
 * Pure helpers for the Chronicle timeline (phase-4 batch 2).
 * Kept free of path aliases so node --test can exercise them directly.
 */

/** "YYYY.MM.DD" display form, locale-neutral (as the old timeline used). */
export function formatChronicleDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '.');
}

/** Minimal shape the year extraction needs. */
interface Dated {
  date: string;
}

/** Years that actually contain at least one event (for the year filter UI). */
export function extractYears(events: Dated[]): string[] {
  return Array.from(new Set(events.map((e) => e.date.slice(0, 4)))).sort().reverse();
}
