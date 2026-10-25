/**
 * JSON-LD structured data for the whole site (rendered once in the root
 * layout, so it reaches every page's SSR HTML).
 *
 * Scope: WebSite + the two Person nodes. No SearchAction — the site search is
 * a client-side modal without a crawlable results URL, and SearchAction
 * requires one. Per-page BreadcrumbList / CreativeWork markup is layered on
 * top of this in a follow-up.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://lmsy.space').replace(/\/$/, '');

export function websiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'LMSY Fan Archive',
        description:
          'Unofficial fan-run archive for Thai GL duo LMSY (Lookmhee & Sonya).',
        inLanguage: 'en',
        about: [{ '@id': `${SITE_URL}/#lookmhee` }, { '@id': `${SITE_URL}/#sonya` }],
      },
      {
        '@type': 'Person',
        '@id': `${SITE_URL}/#lookmhee`,
        name: 'Lookmhee',
        alternateName: 'Lookmhee Punyapat Wangpongsathaporn',
        url: `${SITE_URL}/people/lookmhee`,
      },
      {
        '@type': 'Person',
        '@id': `${SITE_URL}/#sonya`,
        name: 'Sonya',
        alternateName: 'Sonya Saranphat Pedersen',
        url: `${SITE_URL}/people/sonya`,
      },
    ],
  };
}
