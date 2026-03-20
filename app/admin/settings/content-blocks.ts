import type {
  HeroContent,
  HeroFields,
  LongformContent,
  LongformFields,
  MilestonesContent,
  MilestonesFields,
  PrefaceContent,
  PrefaceFields,
} from './types';

export const EMPTY_PREFACE_FIELDS: PrefaceFields = {
  title: '',
  subtitle: '',
  prefaceLabel: '',
  paragraph1: '',
  paragraph2: '',
  paragraph3: '',
  bestiesMessage: '',
  welcome: '',
  siteName: '',
  siteDesc: '',
  curatorTitle: '',
  curatorSignature: '',
  date: '',
};

export const EMPTY_LONGFORM_FIELDS: LongformFields = {
  eyebrow: '',
  fallbackTitle: '',
  fallbackExcerpt: '',
  source: '',
  readMoreLabel: '',
};

export const EMPTY_MILESTONES_FIELDS: MilestonesFields = {
  sectionTitle: '',
  year2022: '',
  year2023: '',
  year2024: '',
  year2025: '',
  ongoing: '',
  bottomNote: '',
};

export const EMPTY_HERO_FIELDS: HeroFields = {
  preface: '',
  universeTitle: '',
  universeSubtitle: '',
};

export const DEFAULT_PREFACE_CONTENT: PrefaceContent = {
  en: { ...EMPTY_PREFACE_FIELDS },
  zh: { ...EMPTY_PREFACE_FIELDS },
  th: { ...EMPTY_PREFACE_FIELDS },
};

export const DEFAULT_LONGFORM_CONTENT: LongformContent = {
  en: {
    eyebrow: 'Chronicle',
    fallbackTitle: 'Featured Interview',
    fallbackExcerpt:
      '"Every role is a piece of my heart. When I portray a character, I pour my soul into making them breathe, into making them real. Lookmhee teaches me every day how to be vulnerable, and how to be brave enough to show the world who we truly are."',
    source: 'Sonya, Vogue Thailand Interview 2024',
    readMoreLabel: 'Read Full Story',
  },
  zh: {
    eyebrow: '纪事',
    fallbackTitle: '精选访谈',
    fallbackExcerpt:
      '“每个角色都是我心里的一部分。当我去塑造一个角色时，我会把自己的灵魂放进去，让她呼吸，让她真实。Lookmhee 每天都在提醒我，如何允许自己脆弱，也如何勇敢地让世界看见真正的我们。”',
    source: 'Sonya，《Vogue Thailand》访谈 2024',
    readMoreLabel: '阅读全文',
  },
  th: {
    eyebrow: 'บันทึก',
    fallbackTitle: 'บทสัมภาษณ์คัดสรร',
    fallbackExcerpt:
      '"ทุกบทบาทคือชิ้นส่วนหนึ่งของหัวใจฉัน เวลาได้ถ่ายทอดตัวละคร ฉันใส่จิตวิญญาณลงไปเพื่อให้เธอหายใจได้ เพื่อให้เธอมีชีวิตจริง Lookmhee ทำให้ฉันเรียนรู้ทุกวันว่าจะอ่อนโยนกับตัวเองอย่างไร และจะกล้าพอให้โลกได้เห็นตัวตนที่แท้จริงของเราอย่างไร"',
    source: 'Sonya, สัมภาษณ์ Vogue Thailand 2024',
    readMoreLabel: 'อ่านฉบับเต็ม',
  },
};

export const DEFAULT_MILESTONES_CONTENT: MilestonesContent = {
  en: {
    sectionTitle: 'Milestones',
    year2022: 'First Meeting',
    year2023: 'Affair Series',
    year2024: 'Fan Meet Tour',
    year2025: 'New Chapter',
    ongoing: 'Story Continues',
    bottomNote: 'Every moment is a constellation in their universe.',
  },
  zh: {
    sectionTitle: '里程碑',
    year2022: '初次相遇',
    year2023: 'Affair 剧集',
    year2024: '粉丝见面巡回',
    year2025: '全新篇章',
    ongoing: '故事仍在继续',
    bottomNote: '每一个瞬间，都是她们宇宙里的一颗星。',
  },
  th: {
    sectionTitle: 'หมุดหมาย',
    year2022: 'การพบกันครั้งแรก',
    year2023: 'ซีรีส์ Affair',
    year2024: 'แฟนมีตทัวร์',
    year2025: 'บทใหม่',
    ongoing: 'เรื่องราวยังดำเนินต่อ',
    bottomNote: 'ทุกช่วงเวลาคือหมู่ดาวในจักรวาลของพวกเธอ',
  },
};

export const DEFAULT_HERO_CONTENT: HeroContent = {
  en: {
    preface: 'Some encounters are written in the stars.',
    universeTitle: 'The Story Keeps Unfolding.',
    universeSubtitle:
      'Welcome to this starry sky that belongs to them, dear Bestie. Astra is carefully collecting, making this place shine brighter, bit by bit.',
  },
  zh: {
    preface: '有些相遇，早已写在星空中。',
    universeTitle: '故事仍在展开。',
    universeSubtitle:
      '欢迎来到这片专属于她们的星空，亲爱的 Bestie。Astra 正在细心采集，这里正一点点变得璀璨。',
  },
  th: {
    preface: 'บางการพบกันราวกับถูกเขียนไว้บนท้องฟ้า',
    universeTitle: 'เรื่องราวยังคงคลี่คลายต่อไป',
    universeSubtitle:
      'ยินดีต้อนรับสู่ท้องฟ้าที่เป็นของพวกเธอ Dear Bestie, Astra กำลังค่อย ๆ เก็บรวบรวมทุกอย่างอย่างตั้งใจ เพื่อให้ที่แห่งนี้ส่องประกายมากขึ้นทีละน้อย',
  },
};

export function normalizePrefaceContent(value: unknown): PrefaceContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_PREFACE_CONTENT;
  }

  const input = value as Record<string, any>;
  const normalizeLang = (langValue: any): PrefaceFields => ({
    title: langValue?.title || '',
    subtitle: langValue?.subtitle || '',
    prefaceLabel: langValue?.prefaceLabel || '',
    paragraph1: langValue?.paragraphs?.[0] || '',
    paragraph2: langValue?.paragraphs?.[1] || '',
    paragraph3: langValue?.paragraphs?.[2] || '',
    bestiesMessage: langValue?.bestiesMessage || '',
    welcome: langValue?.welcome || '',
    siteName: langValue?.siteName || '',
    siteDesc: langValue?.siteDesc || '',
    curatorTitle: langValue?.curatorTitle || '',
    curatorSignature: langValue?.curatorSignature || '',
    date: langValue?.date || '',
  });

  return {
    en: normalizeLang(input.en),
    zh: normalizeLang(input.zh),
    th: normalizeLang(input.th),
  };
}

export function normalizeLongformContent(value: unknown): LongformContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_LONGFORM_CONTENT;
  }

  const input = value as Record<string, any>;
  const normalizeLang = (langValue: any, fallback: LongformFields): LongformFields => ({
    eyebrow: langValue?.eyebrow || fallback.eyebrow,
    fallbackTitle: langValue?.fallbackTitle || fallback.fallbackTitle,
    fallbackExcerpt: langValue?.fallbackExcerpt || fallback.fallbackExcerpt,
    source: langValue?.source || fallback.source,
    readMoreLabel: langValue?.readMoreLabel || fallback.readMoreLabel,
  });

  return {
    en: normalizeLang(input.en, DEFAULT_LONGFORM_CONTENT.en),
    zh: normalizeLang(input.zh, DEFAULT_LONGFORM_CONTENT.zh),
    th: normalizeLang(input.th, DEFAULT_LONGFORM_CONTENT.th),
  };
}

export function normalizeMilestonesContent(value: unknown): MilestonesContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_MILESTONES_CONTENT;
  }

  const input = value as Record<string, any>;
  const normalizeLang = (langValue: any, fallback: MilestonesFields): MilestonesFields => ({
    sectionTitle: langValue?.sectionTitle || fallback.sectionTitle,
    year2022: langValue?.year2022 || fallback.year2022,
    year2023: langValue?.year2023 || fallback.year2023,
    year2024: langValue?.year2024 || fallback.year2024,
    year2025: langValue?.year2025 || fallback.year2025,
    ongoing: langValue?.ongoing || fallback.ongoing,
    bottomNote: langValue?.bottomNote || fallback.bottomNote,
  });

  return {
    en: normalizeLang(input.en, DEFAULT_MILESTONES_CONTENT.en),
    zh: normalizeLang(input.zh, DEFAULT_MILESTONES_CONTENT.zh),
    th: normalizeLang(input.th, DEFAULT_MILESTONES_CONTENT.th),
  };
}

export function normalizeHeroContent(value: unknown): HeroContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_HERO_CONTENT;
  }

  const input = value as Record<string, any>;
  const normalizeLang = (langValue: any, fallback: HeroFields): HeroFields => ({
    preface: langValue?.preface || fallback.preface,
    universeTitle: langValue?.universeTitle || fallback.universeTitle,
    universeSubtitle: langValue?.universeSubtitle || fallback.universeSubtitle,
  });

  return {
    en: normalizeLang(input.en, DEFAULT_HERO_CONTENT.en),
    zh: normalizeLang(input.zh, DEFAULT_HERO_CONTENT.zh),
    th: normalizeLang(input.th, DEFAULT_HERO_CONTENT.th),
  };
}

export function toPrefacePayload(content: PrefaceContent) {
  const buildLang = (lang: PrefaceFields) => ({
    title: lang.title,
    subtitle: lang.subtitle,
    prefaceLabel: lang.prefaceLabel,
    paragraphs: [lang.paragraph1, lang.paragraph2, lang.paragraph3].filter(Boolean),
    bestiesMessage: lang.bestiesMessage,
    welcome: lang.welcome,
    siteName: lang.siteName,
    siteDesc: lang.siteDesc,
    curatorTitle: lang.curatorTitle,
    curatorSignature: lang.curatorSignature,
    date: lang.date,
  });

  return {
    en: buildLang(content.en),
    zh: buildLang(content.zh),
    th: buildLang(content.th),
  };
}

export function toLongformPayload(content: LongformContent) {
  const buildLang = (lang: LongformFields) => ({
    eyebrow: lang.eyebrow,
    fallbackTitle: lang.fallbackTitle,
    fallbackExcerpt: lang.fallbackExcerpt,
    source: lang.source,
    readMoreLabel: lang.readMoreLabel,
  });

  return {
    en: buildLang(content.en),
    zh: buildLang(content.zh),
    th: buildLang(content.th),
  };
}

export function toMilestonesPayload(content: MilestonesContent) {
  const buildLang = (lang: MilestonesFields) => ({
    sectionTitle: lang.sectionTitle,
    year2022: lang.year2022,
    year2023: lang.year2023,
    year2024: lang.year2024,
    year2025: lang.year2025,
    ongoing: lang.ongoing,
    bottomNote: lang.bottomNote,
  });

  return {
    en: buildLang(content.en),
    zh: buildLang(content.zh),
    th: buildLang(content.th),
  };
}

export function toHeroPayload(content: HeroContent) {
  const buildLang = (lang: HeroFields) => ({
    preface: lang.preface,
    universeTitle: lang.universeTitle,
    universeSubtitle: lang.universeSubtitle,
  });

  return {
    en: buildLang(content.en),
    zh: buildLang(content.zh),
    th: buildLang(content.th),
  };
}
