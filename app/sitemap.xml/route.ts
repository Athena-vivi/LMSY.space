import { SITEMAP_SLUGS, SITE_URL, sitemapGroups } from '@/lib/sitemap-entries';

/**
 * Sitemap index at /sitemap.xml — the URL robots.txt already advertises.
 * Delegates the actual URL lists to /sitemaps/<door>.xml sub-sitemaps so the
 * architecture scales past Google's 50k-URL single-file ceiling. Only
 * sub-sitemaps that actually contain entries are listed.
 */
export const revalidate = 3600;

export async function GET() {
  const groups = await sitemapGroups();

  const items = SITEMAP_SLUGS.filter((slug) => (groups.get(slug)?.length ?? 0) > 0).map(
    (slug) => {
      const entries = groups.get(slug) ?? [];
      const lastmod = entries
        .map((entry) => entry.lastModified.getTime())
        .reduce((max, time) => Math.max(max, time), 0);
      return `  <sitemap><loc>${SITE_URL}/sitemaps/${slug}.xml</loc><lastmod>${new Date(
        lastmod
      ).toISOString()}</lastmod></sitemap>`;
    }
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join(
    '\n'
  )}\n</sitemapindex>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
