import type {
  HeroContent,
  HeroFields,
  Lang,
  PrefaceContent,
  PrefaceFields,
} from './types';
import type { Language } from '@/lib/languages';

/**
 * Literary homepage blocks (preface and hero).
 *
 * All five languages carry copy. es/pt went in on 2026-10-26 as a first-pass
 * translation of the English block, so a Spanish or Portuguese visitor reads
 * their own language instead of English on the one block that carries voice.
 * The admin panels edit all five; a saved version always beats the default.
 *
 * When a saved block has no es/pt section (every block saved before that
 * date), normalize* fills those two from the bundled translation rather than
 * from English — that is the whole point of having the translation, and it is
 * what the panels then show for the curator to revise.
 *
 * The longform and milestones blocks had a section each on the homepage; both
 * sections lost their last caller and were removed on 2026-10-27, which is why
 * only two families are left.
 */
export function pickContentBlock<T>(content: Record<Lang, T>, language: Language): T {
  return content[language] ?? content.en;
}

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

// No bundled placeholder. Both hero surfaces read the curator's photo and
// nothing else - a local file here is what made the page flash two images.
export const DEFAULT_HERO_SECTION_IMAGE = '';

export const DEFAULT_PREFACE_CONTENT: PrefaceContent = {
  en: { ...EMPTY_PREFACE_FIELDS },
  zh: { ...EMPTY_PREFACE_FIELDS },
  th: { ...EMPTY_PREFACE_FIELDS },
  es: { ...EMPTY_PREFACE_FIELDS },
  pt: { ...EMPTY_PREFACE_FIELDS },
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
  es: {
    preface: 'Hay encuentros que ya están escritos en el cielo.',
    universeTitle: 'La historia sigue abriéndose.',
    universeSubtitle:
      'Bienvenida a este cielo que les pertenece, querida Bestie. Astra va guardando cada pieza con cuidado, y este lugar brilla un poco más cada día.',
  },
  pt: {
    preface: 'Tem encontros que já estão escritos no céu.',
    universeTitle: 'A história continua se abrindo.',
    universeSubtitle:
      'Bem-vinda a este céu que pertence a elas, querida Bestie. A Astra vai guardando cada peça com cuidado, e este lugar brilha um pouco mais a cada dia.',
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
    es: normalizeLang(input.es),
    pt: normalizeLang(input.pt),
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
    es: normalizeLang(input.es, DEFAULT_HERO_CONTENT.es),
    pt: normalizeLang(input.pt, DEFAULT_HERO_CONTENT.pt),
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
    es: buildLang(content.es),
    pt: buildLang(content.pt),
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
    es: buildLang(content.es),
    pt: buildLang(content.pt),
    assets: {
      heroImageUrl: heroImageUrl || '',
    },
  };
}
