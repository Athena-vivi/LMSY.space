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

export const DEFAULT_HERO_SECTION_IMAGE = '/lmsy-001.jpg';

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

  const input = value as Record<string, unknown>;
  const normalizeLang = (langValue: unknown): PrefaceFields => {
    const record = langValue && typeof langValue === 'object' && !Array.isArray(langValue)
      ? langValue as Record<string, unknown>
      : {};
    const paragraphs = Array.isArray(record.paragraphs) ? record.paragraphs : [];

    return {
      title: typeof record.title === 'string' ? record.title : '',
      subtitle: typeof record.subtitle === 'string' ? record.subtitle : '',
      prefaceLabel: typeof record.prefaceLabel === 'string' ? record.prefaceLabel : '',
      paragraph1: typeof paragraphs[0] === 'string' ? paragraphs[0] : '',
      paragraph2: typeof paragraphs[1] === 'string' ? paragraphs[1] : '',
      paragraph3: typeof paragraphs[2] === 'string' ? paragraphs[2] : '',
      bestiesMessage: typeof record.bestiesMessage === 'string' ? record.bestiesMessage : '',
      welcome: typeof record.welcome === 'string' ? record.welcome : '',
      siteName: typeof record.siteName === 'string' ? record.siteName : '',
      siteDesc: typeof record.siteDesc === 'string' ? record.siteDesc : '',
      curatorTitle: typeof record.curatorTitle === 'string' ? record.curatorTitle : '',
      curatorSignature: typeof record.curatorSignature === 'string' ? record.curatorSignature : '',
      date: typeof record.date === 'string' ? record.date : '',
    };
  };

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

  const input = value as Record<string, unknown>;
  const normalizeLang = (langValue: unknown, fallback: LongformFields): LongformFields => {
    const record = langValue && typeof langValue === 'object' && !Array.isArray(langValue)
      ? langValue as Record<string, unknown>
      : {};

    return {
      eyebrow: typeof record.eyebrow === 'string' ? record.eyebrow : fallback.eyebrow,
      fallbackTitle: typeof record.fallbackTitle === 'string' ? record.fallbackTitle : fallback.fallbackTitle,
      fallbackExcerpt: typeof record.fallbackExcerpt === 'string' ? record.fallbackExcerpt : fallback.fallbackExcerpt,
      source: typeof record.source === 'string' ? record.source : fallback.source,
      readMoreLabel: typeof record.readMoreLabel === 'string' ? record.readMoreLabel : fallback.readMoreLabel,
    };
  };

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

  const input = value as Record<string, unknown>;
  const normalizeLang = (langValue: unknown, fallback: MilestonesFields): MilestonesFields => {
    const record = langValue && typeof langValue === 'object' && !Array.isArray(langValue)
      ? langValue as Record<string, unknown>
      : {};

    return {
      sectionTitle: typeof record.sectionTitle === 'string' ? record.sectionTitle : fallback.sectionTitle,
      year2022: typeof record.year2022 === 'string' ? record.year2022 : fallback.year2022,
      year2023: typeof record.year2023 === 'string' ? record.year2023 : fallback.year2023,
      year2024: typeof record.year2024 === 'string' ? record.year2024 : fallback.year2024,
      year2025: typeof record.year2025 === 'string' ? record.year2025 : fallback.year2025,
      ongoing: typeof record.ongoing === 'string' ? record.ongoing : fallback.ongoing,
      bottomNote: typeof record.bottomNote === 'string' ? record.bottomNote : fallback.bottomNote,
    };
  };

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

  const input = value as Record<string, unknown>;
  const normalizeLang = (langValue: unknown, fallback: HeroFields): HeroFields => {
    const record = langValue && typeof langValue === 'object' && !Array.isArray(langValue)
      ? langValue as Record<string, unknown>
      : {};

    return {
      preface: typeof record.preface === 'string' ? record.preface : fallback.preface,
      universeTitle: typeof record.universeTitle === 'string' ? record.universeTitle : fallback.universeTitle,
      universeSubtitle: typeof record.universeSubtitle === 'string' ? record.universeSubtitle : fallback.universeSubtitle,
    };
  };

  return {
    en: normalizeLang(input.en, DEFAULT_HERO_CONTENT.en),
    zh: normalizeLang(input.zh, DEFAULT_HERO_CONTENT.zh),
    th: normalizeLang(input.th, DEFAULT_HERO_CONTENT.th),
  };
}

export function getHeroSectionImageUrl(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_HERO_SECTION_IMAGE;
  }

  const input = value as Record<string, unknown>;
  const assets = input.assets;

  if (assets && typeof assets === 'object' && !Array.isArray(assets)) {
    const heroImageUrl = (assets as Record<string, unknown>).heroImageUrl;
    if (typeof heroImageUrl === 'string' && heroImageUrl.trim()) {
      return heroImageUrl;
    }
  }

  if (typeof input.heroImageUrl === 'string' && input.heroImageUrl.trim()) {
    return input.heroImageUrl;
  }

  return DEFAULT_HERO_SECTION_IMAGE;
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

export function toHeroPayload(content: HeroContent, heroImageUrl = DEFAULT_HERO_SECTION_IMAGE) {
  const buildLang = (lang: HeroFields) => ({
    preface: lang.preface,
    universeTitle: lang.universeTitle,
    universeSubtitle: lang.universeSubtitle,
  });

  return {
    en: buildLang(content.en),
    zh: buildLang(content.zh),
    th: buildLang(content.th),
    assets: {
      heroImageUrl: heroImageUrl || DEFAULT_HERO_SECTION_IMAGE,
    },
  };
}
