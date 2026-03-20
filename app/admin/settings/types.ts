export type Lang = 'en' | 'zh' | 'th';
export type ContentTab = 'preface' | 'longform' | 'milestones' | 'hero';

export type PrefaceFields = {
  title: string;
  subtitle: string;
  prefaceLabel: string;
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
  bestiesMessage: string;
  welcome: string;
  siteName: string;
  siteDesc: string;
  curatorTitle: string;
  curatorSignature: string;
  date: string;
};

export type LongformFields = {
  eyebrow: string;
  fallbackTitle: string;
  fallbackExcerpt: string;
  source: string;
  readMoreLabel: string;
};

export type MilestonesFields = {
  sectionTitle: string;
  year2022: string;
  year2023: string;
  year2024: string;
  year2025: string;
  ongoing: string;
  bottomNote: string;
};

export type HeroFields = {
  preface: string;
  universeTitle: string;
  universeSubtitle: string;
};

export type PrefaceContent = Record<Lang, PrefaceFields>;
export type LongformContent = Record<Lang, LongformFields>;
export type MilestonesContent = Record<Lang, MilestonesFields>;
export type HeroContent = Record<Lang, HeroFields>;
