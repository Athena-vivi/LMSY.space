/**
 * site_content_blocks repository (lib/data).
 *
 * First consumer: lib/homepage-hero.ts getHomepageHeroMedia(). That module
 * built its one read inline - the homepage's two opening photos - and that
 * query now lives here so the next reader of a site block reuses it instead
 * of forking it.
 *
 * The behaviour the old caller relied on is preserved on purpose:
 * - one row, the newest update of the ACTIVE block with that key
 * - a failed read answers "no row", because the homepage then renders the
 *   gradient letterforms instead of logging or throwing on a public page
 */

import type { AdminClient } from './client.ts';

export interface SiteContentBlockRow {
  content_i18n: unknown;
  image_url: string | null;
}

/**
 * The active block with this key, newest update first - at most one row, so
 * a filter plus limit(1) is the whole read (no paging).
 *
 * Answers [] on a read failure: verbatim from lib/homepage-hero.ts, which
 * mapped `error`, a null body and an empty body onto the same empty hero -
 * so a failed read has to arrive as "no row" rather than throwing.
 */
export async function getSiteContentBlock(
  db: AdminClient,
  blockKey: string
): Promise<SiteContentBlockRow[]> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('site_content_blocks')
    .select('content_i18n, image_url')
    .eq('block_key', blockKey)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error || !data) return [];
  return data as unknown as SiteContentBlockRow[];
}

/**
 * Every active block (optionally narrowed to one key), newest update first.
 * First consumer: GET /api/site-content and GET /api/admin/site-content.
 *
 * Verbatim from those routes, including the `blockKey` filter being optional
 * and the column list being caller-supplied (the public route reads a trimmed
 * projection, the admin route reads `*`). The table holds a handful of rows,
 * so no paging is needed (and never was). Answers [] on a read failure -
 * verbatim, both routes returned `data || []` / `data?.[0] || null`.
 */
export async function listActiveSiteContentBlocks(
  db: AdminClient,
  columns: string,
  blockKey?: string
): Promise<Array<Record<string, unknown>>> {
  let query = db
    .schema('lmsy_archive')
    .from('site_content_blocks')
    .select(columns)
    .eq('is_active', true);

  if (blockKey) query = query.eq('block_key', blockKey);

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []) as unknown as Array<Record<string, unknown>>;
}

/**
 * Insert or update one block by key. First consumer: PUT /api/admin/site-content.
 *
 * The caller builds the payload (it owns the `updated_at` stamp); the
 * repository just performs the conflict-on-key upsert and answers the saved
 * row. Throws on a write failure - the route answers 500.
 */
export async function upsertSiteContentBlock(
  db: AdminClient,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('site_content_blocks')
    .upsert(payload, { onConflict: 'block_key' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Upsert returned no row');
  return data as unknown as Record<string, unknown>;
}
