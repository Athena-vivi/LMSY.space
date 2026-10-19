/**
 * Project form (phase 9).
 *
 * Two kinds of project live in this archive:
 *
 *   event - one happening on one date (a fan meeting, a magazine issue, an
 *           airport appearance). The project has a single anchor date, and the
 *           timeline shows it as one point.
 *   theme - a subject that keeps recurring (e.g. "Back View" - photographs of
 *           their backs, collected from many different days). There is no
 *           single date to anchor it to, so the project itself never becomes a
 *           timeline point; its images still appear on the timeline under
 *           whatever date each one actually happened.
 *
 * The column is additive and defaults to 'event', so every row written before
 * phase 9 keeps its current behaviour.
 *
 * Pure module - no imports, so node --test can exercise it directly.
 */

export type ProjectKind = 'event' | 'theme';

export const DEFAULT_PROJECT_KIND: ProjectKind = 'event';

/**
 * Read a stored value back into the union. Anything unknown (NULL from an old
 * row, a typo, a value written by an older client) resolves to 'event' - the
 * historical behaviour - rather than inventing a third state.
 */
export function resolveProjectKind(value: unknown): ProjectKind {
  return value === 'theme' ? 'theme' : DEFAULT_PROJECT_KIND;
}

/** A theme project is not anchored to one date. */
export function isThemeProject(project: { project_kind?: unknown } | null | undefined): boolean {
  return resolveProjectKind(project?.project_kind) === 'theme';
}

/** A theme project has no single event date, so the timeline must skip it. */
export function hasProjectPointOnTimeline(project: { project_kind?: unknown } | null | undefined): boolean {
  return !isThemeProject(project);
}
