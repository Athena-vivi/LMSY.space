import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getHeroSectionImageUrl } from '@/app/admin/settings/content-blocks';

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
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .schema('lmsy_archive')
      .from('site_content_blocks')
      .select('content_i18n, image_url')
      .eq('block_key', 'homepage_hero')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return EMPTY;

    const block = data[0] as { content_i18n?: unknown; image_url?: string | null };

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
