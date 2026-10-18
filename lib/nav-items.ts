// Single source of truth for front-end navigation (home header + inner pages).
//
// Phase 7 converged seven entries to four. The rule behind the split:
//   Projects  - find a specific issue, event or theme
//   Timeline  - see what happened in a given year
//   People    - follow one person across the archive
//   Gallery   - browse photographs without a destination in mind
// Search sits in the middle of the bar and is the only entry that assumes the
// visitor already knows what they are looking for.
//
// /editorial, /exhibitions, /chronicle, /profiles, /resonance and /schedule
// keep their routes (legacy links must not 404) but no longer occupy the bar.
// i18n keys are resolved via t(language, key) from lib/languages.ts.

export interface NavItem {
  key: string;
  href: string;
  hasDropdown?: boolean;
}

export const mainNavItems: NavItem[] = [
  { key: 'nav.projects', href: '/projects' },
  { key: 'nav.timeline', href: '/timeline' },
  { key: 'nav.people', href: '/people' },
  { key: 'nav.gallery', href: '/gallery' },
];

/**
 * Kept for the outbound social group. Duality is a set of external/duplicate
 * profile links, not an archive section, so it no longer takes a seat in the
 * main bar.
 */
export const dualitySubItems: NavItem[] = [
  { key: 'nav.lmsy', href: '/people' },
  { key: 'nav.lookmhee', href: '/people/lookmhee' },
  { key: 'nav.sonya', href: '/people/sonya' },
];
