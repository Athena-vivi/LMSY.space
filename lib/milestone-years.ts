/**
 * Milestone slots: one photo per year on the homepage timeline.
 *
 * The slot number IS the year: priority N belongs to year 2021 + N. 2022 is
 * priority 1, 2026 is priority 5, and the newest slot is always the current
 * year - there is no separate "infinity" slot any more.
 *
 * Every reader and writer of `milestone_priority` goes through these helpers.
 * The mapping used to be copied into four hard-coded tables (admin grid,
 * admin GET, admin PATCH, vault aggregate, homepage summary) and each copy
 * stopped at 2025, so the newest year silently lost the photo the curator had
 * picked for it.
 */

export const MILESTONE_START_YEAR = 2022;

/** Years that have a slot, oldest first, up to and including the current year. */
export function milestoneYears(now: number = new Date().getFullYear()): string[] {
  const years: string[] = [];
  for (let year = MILESTONE_START_YEAR; year <= now; year += 1) {
    years.push(String(year));
  }
  return years;
}

/** "2026" -> 5. Anything before 2022 or non-numeric -> null. */
export function yearToMilestonePriority(year: string | number | null | undefined): number | null {
  const value = Number(year);
  if (!Number.isInteger(value) || value < MILESTONE_START_YEAR) return null;
  return value - MILESTONE_START_YEAR + 1;
}

/** 5 -> "2026". Null, 0 or negative -> null. */
export function milestonePriorityToYear(priority: number | null | undefined): string | null {
  if (!priority || !Number.isInteger(priority) || priority < 1) return null;
  return String(MILESTONE_START_YEAR + priority - 1);
}
