// es/pt joined on 2026-10-26: the homepage copy used to fall back to English
// for them, which meant a Spanish visitor read English on the only block that
// carries voice. Every block now ships five versions.
export type Lang = 'en' | 'zh' | 'th' | 'es' | 'pt';
// Tabs 3/4 were repurposed (2026-10-22): the homepage longform/milestones
// content blocks are no longer rendered anywhere, so the tabs now edit talk
// program resources instead - video links and the markdown transcript. Tab 5
// does the same for live streams (2026-10-26). The two dead block families
// were deleted outright on 2026-10-27.
export type ContentTab =
  | 'preface'
  | 'talk-videos'
  | 'talk-transcript'
  | 'live-videos'
  | 'hero';

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

export type HeroFields = {
  preface: string;
  universeTitle: string;
  universeSubtitle: string;
};

export type PrefaceContent = Record<Lang, PrefaceFields>;
export type HeroContent = Record<Lang, HeroFields>;
