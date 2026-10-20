/**
 * Project form (phase 9, extended 2026-10-20).
 *
 * Four kinds of project live in this archive:
 *
 *   event - one happening on one date (a fan meeting, a magazine issue, an
 *           airport appearance). The project has a single anchor date, and the
 *           timeline shows it as one point.
 *   theme - a subject that keeps recurring (e.g. "Back View" - photographs of
 *           their backs, collected from many different days). There is no
 *           single date to anchor it to, so the project itself never becomes a
 *           timeline point; its images still appear on the timeline under
 *           whatever date each one actually happened.
 *   series - a work that other rows hang under (door 1's containers). It is
 *           never a timeline point itself; the entries under it are.
 *   video - an entry whose payload is a link (a vlog, a pilot, a reaction),
 *           not a picture wall. It is dated like any other entry.
 *
 * The column is additive and defaults to 'event', so every row written before
 * phase 9 keeps its current behaviour.
 *
 * Pure module - no imports, so node --test can exercise it directly.
 */

export type ProjectKind = 'event' | 'theme' | 'series' | 'video';

export const DEFAULT_PROJECT_KIND: ProjectKind = 'event';

/**
 * Read a stored value back into the union. Anything unknown (NULL from an old
 * row, a typo, a value written by an older client) resolves to 'event' - the
 * historical behaviour - rather than inventing a third state.
 */
export function resolveProjectKind(value: unknown): ProjectKind {
  if (value === 'theme') return 'theme';
  if (value === 'series') return 'series';
  if (value === 'video') return 'video';
  return DEFAULT_PROJECT_KIND;
}

/** A theme project is not anchored to one date. */
export function isThemeProject(project: { project_kind?: unknown } | null | undefined): boolean {
  return resolveProjectKind(project?.project_kind) === 'theme';
}

/** A series is a container for entries, never an entry of its own. */
export function isSeriesProject(project: { project_kind?: unknown } | null | undefined): boolean {
  return resolveProjectKind(project?.project_kind) === 'series';
}

/** A theme project has no single event date, so the timeline must skip it. */
export function hasProjectPointOnTimeline(project: { project_kind?: unknown } | null | undefined): boolean {
  const kind = resolveProjectKind(project?.project_kind);
  return kind !== 'theme' && kind !== 'series';
}
