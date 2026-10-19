/**
 * Date span of a project's images (phase 9).
 *
 * A theme project has no single anchor date - it is whatever dates its images
 * happen to carry. Rather than asking the curator to type a range (which would
 * drift the moment a new photo arrives), the span is derived from
 * gallery_assets.event_date at read time.
 *
 * Rules:
 *   - only real `YYYY-MM-DD` values count; NULL means "date not confirmed" and
 *     is skipped, never replaced by created_at or the collection date
 *   - a project with no dated image has no span at all, and callers fall back
 *     to their own "date unknown" copy
 *
 * Pure module - the only import is another pure formatter, so node --test can
 * exercise it directly.
 */

import { formatDisplayDate, type DisplayLanguage } from './display-date.ts';

export interface ProjectSpan {
  /** Earliest confirmed image date, `YYYY-MM-DD`. */
  start: string;
  /** Latest confirmed image date, `YYYY-MM-DD`. */
  end: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface DatedAssetRow {
  project_id: string | null;
  event_date: string | null;
}

/**
 * Collapse every project's dated assets into one span per project.
 * Undated rows are ignored - "unknown" is not a date.
 */
export function aggregateProjectSpans(rows: DatedAssetRow[]): Record<string, ProjectSpan> {
  const spans: Record<string, ProjectSpan> = {};

  for (const row of rows) {
    const projectId = row.project_id;
    const raw = row.event_date;
    if (!projectId || typeof raw !== 'string') continue;

    const day = raw.slice(0, 10);
    if (!ISO_DAY.test(day)) continue;

    const existing = spans[projectId];
    if (!existing) {
      spans[projectId] = { start: day, end: day };
      continue;
    }
    if (day < existing.start) existing.start = day;
    if (day > existing.end) existing.end = day;
  }

  return spans;
}

/**
 * Human label for a span: "Aug 2024 — Mar 2026" / "2024年8月 — 2026年3月".
 * A span whose two ends fall in the same month renders as that month once,
 * because "Aug 2024 — Aug 2024" reads like a bug.
 */
export function formatProjectSpan(
  span: ProjectSpan | null | undefined,
  language: DisplayLanguage
): string | null {
  if (!span) return null;

  const start = formatDisplayDate(span.start, language, { month: 'short', day: false });
  if (!start) return null;

  if (span.start === span.end) return start;

  const end = formatDisplayDate(span.end, language, { month: 'short', day: false });
  if (!end || end === start) return start;

  return `${start} — ${end}`;
}

/**
 * Sort key for a project card, newest first.
 *
 *   event - the event date, falling back to release_date for rows written
 *           before the phase-7 split (same rule as everywhere else)
 *   theme - the latest confirmed image date, so adding one more old photo does
 *           not push the project to the top of the list
 *
 * Returns null when nothing is known; callers sort those last.
 */
export function projectSortDate(
  project: {
    project_kind?: unknown;
    event_date?: string | null;
    release_date?: string | null;
  },
  span?: ProjectSpan | null
): string | null {
  if (project.project_kind === 'theme') {
    return span?.end ?? null;
  }
  return project.event_date ?? project.release_date ?? null;
}
