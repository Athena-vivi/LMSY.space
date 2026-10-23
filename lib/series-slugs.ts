/**
 * work_id -> series slug (server only).
 *
 * Door 1 addresses an entry as /dramas/<series>/<entry>, and the entry row only
 * stores `work_id` - it never carries the series slug. Pages that list drama
 * rows therefore need this map, and because it is three rows that never change
 * mid-request, it is cached per render pass with React's `cache`.
 *
 * The map is read through the admin client for the same reason every other
 * server page does: the series row is public data, and the alternative (one
 * query per row) would fan out across a page listing forty entries.
 */

import { cache } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { listSeriesSlugRows } from '@/lib/data/projects';
import { seriesSlugMapFrom } from '@/lib/entry-path';

export const loadSeriesSlugMap = cache(async (): Promise<Map<string, string>> => {
  // The repository answers null on a read failure; an empty map is what this
  // module has always answered in that case (verbatim).
  const rows = await listSeriesSlugRows(getSupabaseAdmin());
  if (!rows) return new Map();
  return seriesSlugMapFrom(rows as never);
});
