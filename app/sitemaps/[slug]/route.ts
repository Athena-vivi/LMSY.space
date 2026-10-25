import { PAGE_SIZE, sitemapGroups } from '@/lib/sitemap-entries';

/**
 * Sub-sitemaps: /sitemaps/<slug>.xml where slug is one of the groups built by
 * lib/sitemap-entries.ts (pages / dramas / editorial / live-events / ...).
 * A -N suffix paginates: /sitemaps/live-events-2.xml is the second page of
 * PAGE_SIZE entries — the escape hatch for the ten-thousand-image future.
 */
export const revalidate = 3600;

// The route segment carries the .xml suffix (and optionally a -N page number):
// /sitemaps/pages.xml, /sitemaps/live-events-2.xml
const PAGINATION = /^(.+?)(?:-(\d+))?\.xml$/;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: raw } = await params;

  const match = PAGINATION.exec(raw);
  const slug = match ? match[1] : raw;
  const page = match && match[2] ? Number.parseInt(match[2], 10) : 1;
  if (!match || page < 1 || Number.isNaN(page)) {
    return new Response('Not found', { status: 404 });
  }

  const groups = await sitemapGroups();
  const entries = groups.get(slug) ?? [];

  const slice = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const items = slice
    .map((entry) => {
      const images = (entry.images ?? [])
        .map((image) => {
          const title = image.title
            ? `<image:title>${escapeXml(image.title)}</image:title>`
            : '';
          return `<image:image><image:loc>${escapeXml(image.loc)}</image:loc>${title}</image:image>`;
        })
        .join('');
      return `  <url><loc>${escapeXml(entry.url)}</loc><lastmod>${entry.lastModified.toISOString()}</lastmod><changefreq>${entry.changeFrequency}</changefreq><priority>${entry.priority}</priority>${images}</url>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${items}\n</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
