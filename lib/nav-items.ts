// Single source of truth for front-end navigation (home header + inner pages).
// Order follows the information architecture in the design plan (gallery first).
// i18n keys are resolved via t(language, key) from lib/languages.ts.

export interface NavItem {
  key: string;
  href: string;
  hasDropdown?: boolean;
}

export const mainNavItems: NavItem[] = [
  { key: 'nav.gallery', href: '/gallery' },
  { key: 'nav.projects', href: '/projects' },
  { key: 'nav.chronicle', href: '/chronicle' },
  { key: 'nav.exhibitions', href: '/exhibitions' },
  { key: 'nav.editorial', href: '/editorial' },
  { key: 'nav.resonance', href: '/resonance' },
  { key: 'nav.duality', href: '#', hasDropdown: true },
];

export const dualitySubItems: NavItem[] = [
  { key: 'nav.lmsy', href: '/profiles' },
  { key: 'nav.lookmhee', href: '/profiles/lookmhee' },
  { key: 'nav.sonya', href: '/profiles/sonya' },
];
