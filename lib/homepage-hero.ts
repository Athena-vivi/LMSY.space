import { getSupabasePublic } from '@/lib/data/client';
import { getHeroSectionImageUrl } from '@/app/admin/settings/content-blocks';
import { getSiteContentBlock } from '@/lib/data/site-content';

/**
 * The two photos the homepage opens with, read on the server.
 *
 * They live in one row (`homepage_hero`), in two separate fields: the splash
 * letterforms use `image_url`, the hero card uses
 * `content_i18n.assets.heroImageUrl`. Reading them here means the very first
 * HTML already carries the curator's photos - the browser no longer paints an
 * empty frame, waits for /api/site-content and then swaps the image in.
 *
 * Both fields can legitimately be empty: the homepage then shows the gradient
 * letterforms and the card skeleton instead of a bundled placeholder.
 */
export interface HomepageHeroMedia {
  splashImageUrl: string;
  heroImageUrl: string;
}

const EMPTY: HomepageHeroMedia = { splashImageUrl: '', heroImageUrl: '' };

export async function getHomepageHeroMedia(): Promise<HomepageHeroMedia> {
  try {
    const rows = await getSiteContentBlock(getSupabasePublic(), 'homepage_hero');
    if (rows.length === 0) return EMPTY;

    const block = rows[0];

    return {
      splashImageUrl:
        typeof block.image_url === 'string' ? block.image_url.trim() : '',
      heroImageUrl: getHeroSectionImageUrl(block.content_i18n),
    };
  } catch (error) {
    console.error('[HOMEPAGE] Failed to read homepage_hero:', error);
    return EMPTY;
  }
}
