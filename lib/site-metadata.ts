import type { Metadata } from 'next';
import { getTranslation, type Language } from '@/lib/languages';

/**
 * Root-layout metadata, per language.
 *
 * It used to be one hardcoded English block in the root layout, which every
 * /zh, /th, /es and /pt page inherited — so a Portuguese visitor saw an
 * English site description in the search result. The brand name and the title
 * template stay as they are (LMSY Fan Archive is the site's name in every
 * language); what changes per language is the sentence that says what this
 * place is, the keyword list and the Open Graph locale.
 */

const OG_LOCALES: Record<Language, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  th: 'th_TH',
  es: 'es_ES',
  pt: 'pt_BR',
};

function keywordList(lang: Language): string[] {
  return getTranslation(lang, 'site.keywords')
    .split(',')
    .map((word) => word.trim())
    .filter(Boolean);
}

export function siteMetadata(lang: Language): Metadata {
  const description = getTranslation(lang, 'site.description');
  // Same rule as the canonical: English lives at the bare path, the rest under
  // /<lang>. og:url should name the page that was actually shared.
  const homePath = lang === 'en' ? '/' : `/${lang}`;

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://lmsy.space'),
    title: {
      default: 'LMSY Fan Archive | Lookmhee & Sonya',
      template: '%s | LMSY Fan Archive',
    },
    description,
    keywords: keywordList(lang),
    authors: [{ name: 'Astra', url: 'https://lmsy.space' }],
    creator: 'Astra',
    publisher: 'lmsy.space',
    openGraph: {
      type: 'website',
      locale: OG_LOCALES[lang],
      url: homePath,
      title: 'LMSY Fan Archive | Lookmhee & Sonya',
      description,
      siteName: 'LMSY Fan Archive',
      images: [
        {
          url: '/lmsy-main-visual.png',
          width: 1200,
          height: 630,
          alt: 'LMSY - Lookmhee & Sonya',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LMSY Fan Archive | Lookmhee & Sonya',
      description,
      images: ['/lmsy-main-visual.png'],
      creator: '@lmsyofficial',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    manifest: '/manifest.json',
    category: 'entertainment',
  };
}
