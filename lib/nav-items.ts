// Single source of truth for front-end navigation (home header + inner pages).
//
// 2026-10-21: the bar keeps two entries. "Works" left because there is no
// single index page any more - each homepage door owns its own shelves, and a
// bar entry pointing at one of them would privilege that door. "People" left
// because the homepage already ends on the two profiles, so the bar was
// repeating a section the visitor scrolls past anyway.
//
// What is left is the pair that actually differ in reading mode:
//   Timeline  - the archive read backwards, newest first
//   Gallery   - photographs without a destination, an endless stream
//
// Search sits in the middle of the bar and is the only entry that assumes the
// visitor already knows what they are looking for.
//
// /people, /editorial, /dramas, /live-events, /appearances, /commercial,
// /talks, /live, /resonance and /schedule keep their routes but no longer
// occupy the bar. i18n keys are resolved via t(language, key) from
// lib/languages.ts.

export interface NavItem {
  key: string;
  href: string;
  hasDropdown?: boolean;
}

export const mainNavItems: NavItem[] = [
  { key: 'nav.timeline', href: '/timeline' },
  { key: 'nav.gallery', href: '/gallery' },
];

