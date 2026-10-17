// Exhibition category mapping - single source of truth shared by the
// /exhibitions index page and /exhibitions/category/[type].
// Extracted from the category page (phase-4 batch 1): the index page needs
// the same five categories and must never re-declare a second copy.
export interface ExhibitionCategory {
  // URL segment under /exhibitions/category/
  type: string;
  // projects.category value this entry maps to
  category: string;
  // Mono display title (kept from the category page metadata)
  title: string;
  description: string;
  // Localized card label for the index page
  label: { en: string; zh: string; th: string };
}

export const EXHIBITION_CATEGORIES: ExhibitionCategory[] = [
  {
    type: 'drama',
    category: 'series',
    title: 'DRAMA ARCHIVE',
    description: 'Television series and dramatic works featuring LMSY',
    label: { en: 'Drama Archive', zh: '剧集档案', th: 'ละคร' },
  },
  {
    type: 'stage',
    category: 'appearance',
    title: 'STAGE PRESENCE',
    description: 'Live performances, events, and public appearances',
    label: { en: 'Stage Presence', zh: '舞台与活动', th: 'เวทีและกิจกรรม' },
  },
  {
    type: 'travel',
    category: 'travel',
    title: 'TRAVEL JOURNALS',
    description: 'Adventures and journeys across different landscapes',
    label: { en: 'Travel Journals', zh: '旅行日志', th: 'ท่องเที่ยว' },
  },
  {
    type: 'daily',
    category: 'daily',
    title: 'DAILY MOMENTS',
    description: 'Everyday moments and behind-the-scenes glimpses',
    label: { en: 'Daily Moments', zh: '日常瞬间', th: 'ชีวิตประจำวัน' },
  },
  {
    type: 'commercial',
    category: 'commercial',
    title: 'COMMERCIAL',
    description: 'Brand collaborations, endorsements, and where inspiration meets value',
    label: { en: 'Commercial', zh: '商业合作', th: 'โฆษณา' },
  },
];

// Same shape the category page used inline, now derived from the shared list
// so both routes can never drift apart.
export const EXHIBITION_TYPE_MAPPING: Record<
  string,
  { category?: string; title: string; description: string }
> = Object.fromEntries(
  EXHIBITION_CATEGORIES.map((c) => [
    c.type,
    { category: c.category, title: c.title, description: c.description },
  ])
);
