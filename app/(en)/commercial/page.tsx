import type { Metadata } from 'next';
import { getTranslation } from '@/lib/languages';
import { pageMetadata } from '@/lib/seo';
import { loadDoorEntries } from '@/lib/door-data';
import { getSupabasePublic } from '@/lib/data/client';
import { listEntryTimelineAssets } from '@/lib/data/gallery-assets';
import { normalizeLocalizedText } from '@/lib/localized-content';
import type { ChronicleEvent, TimelineImageRef } from '@/lib/timeline';
import { CommercialTimeline } from '@/components/doors/commercial-timeline';

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Commercial',
  description: getTranslation('en', 'meta.commercial'),
  path: '/commercial',
});

/**
 * Max thumbnails per commercial card. Mirrors ChronicleTimeline.GROUP_THUMBNAILS
 * so the two doors read identically.
 */
const CARD_THUMBNAILS = 4;

/**
 * /commercial - homepage entry 5.
 *
 * The wall now reads like the Timeline page: a two-column alternating grid
 * where each card pairs its title with up to four pictures (opened in a
 * lightbox). The chronicle's left sidebar is intentionally absent - a brand
 * collaboration hall has no year filter or meta rows of its own.
 */
export default async function CommercialPage() {
  const entries = await loadDoorEntries('commercial');
  const ids = entries.map((entry) => entry.id);

  const assets = ids.length > 0 ? await listEntryTimelineAssets(getSupabasePublic(), ids) : [];
  if (!assets) {
    // Read failure: show text-only cards rather than an empty hall.
    console.error('[COMMERCIAL] Failed to fetch gallery assets');
  }

  // Group pictures per entry, newest picture first within each.
  const byProject = new Map<string, TimelineImageRef[]>();
  for (const asset of assets ?? []) {
    const bucket = byProject.get(asset.project_id) ?? [];
    bucket.push({
      id: asset.id,
      image_url: asset.image_url,
      caption: asset.caption ?? null,
      caption_i18n: asset.caption_i18n ?? null,
      catalog_id: asset.catalog_id ?? null,
      width: asset.width ?? null,
      height: asset.height ?? null,
    });
    byProject.set(asset.project_id, bucket);
  }

  const events: ChronicleEvent[] = entries
    .map((entry): ChronicleEvent => {
      const date = entry.event_date || entry.release_date || '';
      const images = (byProject.get(entry.id) ?? []).slice(0, CARD_THUMBNAILS);
      return {
        id: `project-${entry.id}`,
        date,
        projectId: entry.id,
        title: entry.title,
        titleI18n: normalizeLocalizedText(entry.title_i18n, entry.title),
        category: 'commercial',
        href: entry.href,
        images,
      };
    })
    // Newest first - the same reading order the Timeline page uses.
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.id.localeCompare(b.id);
    });

  return <CommercialTimeline events={events} />;
}
