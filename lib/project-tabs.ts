/**
 * Project-detail image tab rules (phase-6 batch 1).
 *
 * The detail page offers four fixed tabs (ALL / OFFICIAL_STILLS / BTS /
 * PRESS_EVENTS). In the live archive `gallery_assets.category_tag` is NULL for
 * all 330 rows, and the "official stills" filter treats untagged rows as
 * stills - so BTS and PRESS_EVENTS always showed "(0)" and OFFICIAL_STILLS
 * always repeated the ALL count. The tab bar therefore described facets that
 * do not exist.
 *
 * Rule: a tab is only offered when it actually contains images, and a facet is
 * dropped when it is indistinguishable from ALL (same count), because it cannot
 * narrow the gallery. Pure function, no path aliases - directly testable.
 */

export type ProjectTabValue = 'all' | 'official_stills' | 'bts' | 'press_events';

export const PROJECT_TAB_ORDER: ProjectTabValue[] = [
  'all',
  'official_stills',
  'bts',
  'press_events',
];

export function visibleProjectTabs(
  counts: Partial<Record<ProjectTabValue, number>>
): ProjectTabValue[] {
  const all = counts.all ?? 0;
  if (all <= 0) return [];
  return PROJECT_TAB_ORDER.filter((value) => {
    const count = counts[value] ?? 0;
    if (count <= 0) return false;
    // A facet that holds every image narrows nothing.
    if (value !== 'all' && count === all) return false;
    return true;
  });
}
