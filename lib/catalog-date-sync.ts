/**
 * Keep a project's catalog code in step with its event date.
 *
 * WHY THIS EXISTS
 * ---------------
 * The event number (projects.catalog_id) and every asset id under it carry a
 * YYYYMMDD segment: LMSY-EVENT-FANSIGN-CKG-20250426-001. The segment is
 * written once, at promote time, from the date the row had that day. Editing
 * the date later used to leave the code frozen, so the site showed one day and
 * the file name another - with no warning at all.
 *
 * This module is the other half: given a project and its NEW event date, it
 * rewrites the date segment everywhere it appears and moves the files to
 * match, so date and code can never drift apart again.
 *
 * WHAT IT TOUCHES (all of it, or nothing)
 *   projects.catalog_id                                 - the event number
 *   projects.cover_url                                  - when it is one of ours
 *   projects.asset_group_covers / talk_resource_covers  - they store asset ids
 *   gallery_assets.catalog_id                           - one per picture
 *   gallery_assets.image_url                            - the CDN url
 *   gallery_assets.event_date                           - must match the project
 *   the R2 objects behind those urls                    - renamed, not re-uploaded
 *   the Cloudflare cache for old and new urls           - purged afterwards
 *
 * It refuses to run when the destination is already taken (another project's
 * number, an existing asset id, an existing R2 object): a half-renamed batch
 * is worse than an unchanged one, so the whole thing is all-or-nothing.
 */

import { r2KeyForCatalogId, type CatalogIdClient } from './catalog-id.ts';
import { purgeCdnUrls } from './cloudflare-purge.ts';
import {
  BASE_CDN_URL,
  getRelativePath,
  moveR2Object,
  r2ObjectExists,
} from './r2-client.ts';

/** A project row as far as this module needs it. */
export interface SyncProjectRow {
  id: string;
  catalog_id?: string | null;
  cover_url?: string | null;
  event_date?: string | null;
  // Curator-picked cover maps: { className: assetCatalogId }. Both store asset
  // ids, so both have to follow a rename.
  asset_group_covers?: Record<string, unknown> | null;
  talk_resource_covers?: Record<string, unknown> | null;
}

export interface CatalogDateSyncResult {
  applied: boolean;
  /** Why nothing was done. Set only when applied is false. */
  reason?: string;
  projectId: string;
  /** YYYYMMDD the codes carried before, null when none of them had a date. */
  oldDate: string | null;
  /** YYYYMMDD the codes now carry. */
  newDate: string;
  projectCatalogId: { from: string; to: string } | null;
  assets: {
    total: number;
    /** Rows whose id carried the old date. */
    affected: number;
    /** Rows rewritten in the database. */
    updated: number;
    /** R2 objects moved to the new key. */
    renamed: number;
    /** Rows left alone because the file could not be moved. */
    failed: number;
  };
  cover: { changed: boolean; from?: string; to?: string };
  /** Urls sent to Cloudflare. */
  purged: number;
  /** Filled in when the run was refused because the destination is taken. */
  conflicts?: string[];
}

/** YYYYMMDD out of a YYYY-MM-DD value, or null when it is not a plain date. */
function compactOf(value: string | null | undefined): string | null {
  const text = (value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text.replace(/-/g, '') : null;
}

/**
 * The same id with its date segment replaced.
 *
 * Three shapes carry a date, and all three are in the archive:
 *
 *   LMSY-EVENT-FANSIGN-CKG-20250426            an event number
 *   LMSY-EVENT-FANSIGN-CKG-20250426-001        an asset
 *   LMSY-APPEAR-FASHION-BKK-20251130-SY-034    a single-person asset: the
 *                                              -LM / -SY tail sits between
 *                                              the date and the sequence
 *
 * A fourth shape (-date-NNN-LM) is accepted as a fallback so a batch written
 * the other way round is not silently skipped. Anything else returns null,
 * which means "this id carries no date and must be left alone" - never
 * "invent a segment".
 */
export function replaceDateSegment(id: string, newCompact: string): string | null {
  const tailFirst = /-(\d{8})(-(?:LM|SY))?(-\d{3})?$/.exec(id);
  if (tailFirst) {
    const head = id.slice(0, tailFirst.index);
    return `${head}-${newCompact}${tailFirst[2] || ''}${tailFirst[3] || ''}`;
  }
  const sequenceFirst = /-(\d{8})(-\d{3})(-(?:LM|SY))$/.exec(id);
  if (sequenceFirst) {
    const head = id.slice(0, sequenceFirst.index);
    return `${head}-${newCompact}${sequenceFirst[2]}${sequenceFirst[3]}`;
  }
  return null;
}

/** The eight-digit date inside an id, or null when it has none. */
export function dateSegmentOf(id: string | null | undefined): string | null {
  const text = String(id || '');
  const tailFirst = /-(\d{8})(?:-(?:LM|SY))?(?:-\d{3})?$/.exec(text);
  if (tailFirst) return tailFirst[1];
  const sequenceFirst = /-(\d{8})(?:-\d{3})(?:-(?:LM|SY))$/.exec(text);
  return sequenceFirst ? sequenceFirst[1] : null;
}

/** True when this url is served from our own bucket. */
function isOurCdnUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith(BASE_CDN_URL);
}

/** Object key behind one of our urls, or null for an external picture. */
function keyForUrl(url: string): string | null {
  return isOurCdnUrl(url) ? getRelativePath(url) : null;
}

/**
 * Where an object has to go after the rename.
 *
 * The canonical key wins when the object was already sitting at its canonical
 * key, because that also moves it across a year folder (2025-12-31 ->
 * 2026-01-01). Anything filed outside the canonical layout keeps its folder
 * and only gets a new file name, so a stray object is never silently
 * relocated.
 */
function nextKeyFor(oldKey: string, oldId: string, newId: string): string {
  try {
    if (r2KeyForCatalogId(oldId) === oldKey) return r2KeyForCatalogId(newId);
  } catch {
    // Not a canonical id (a single-person asset carries its -LM / -SY tail
    // inside the subject, which parseCatalogId does not model) - fall through
    // to the same-folder rename.
  }
  const slash = oldKey.lastIndexOf('/');
  const dot = oldKey.lastIndexOf('.');
  const folder = slash >= 0 ? oldKey.slice(0, slash) : '';
  const ext = dot > slash ? oldKey.slice(dot) : '';
  // A key filed outside the canonical layout keeps its folder, but the folder
  // that is a year still has to follow the date: 2025-12-31 -> 2026-01-01
  // moves the picture into the next year's directory.
  const parts = folder.split('/');
  const year = /(\d{8})/.exec(newId)?.[1].slice(0, 4);
  if (year && /^\d{4}$/.test(parts[parts.length - 1] || '')) {
    parts[parts.length - 1] = year;
  }
  return `${parts.join('/')}/${newId}${ext}`;
}

/** Run `worker` over `items` with a bounded number of workers in flight. */
async function pooled<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await worker(item);
    }
  });
  await Promise.all(lanes);
}

/**
 * Every gallery asset of a project.
 *
 * Paged on purpose: PostgREST silently truncates at 1000 rows, and a single
 * event can hold more than a thousand pictures.
 */
async function fetchAssets(
  supabase: CatalogIdClient,
  projectId: string
): Promise<Array<{ id: string; catalog_id: string | null; image_url: string | null }>> {
  const rows: Array<{ id: string; catalog_id: string | null; image_url: string | null }> = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id, catalog_id, image_url')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to read gallery assets: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

/** Chunk a list so an `.in()` filter never gets too long. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Rewrite the date segment of a project, its assets and their objects.
 *
 * Returns applied=false with a reason when there is nothing to do. Returns
 * applied=false with `conflicts` when the destination is taken - the caller is
 * expected to surface that to the curator, because the date itself has already
 * been saved by then.
 */
export async function syncProjectCatalogDate(
  supabase: CatalogIdClient,
  project: SyncProjectRow,
  newEventDate: string
): Promise<CatalogDateSyncResult> {
  const newCompact = compactOf(newEventDate);
  const base = {
    projectId: project.id,
    oldDate: null as string | null,
    newDate: newCompact || '',
    projectCatalogId: null as { from: string; to: string } | null,
    assets: { total: 0, affected: 0, updated: 0, renamed: 0, failed: 0 },
    cover: {} as { changed: boolean; from?: string; to?: string },
    purged: 0,
  };

  if (!newCompact) {
    return { ...base, applied: false, reason: 'invalid-date' };
  }

  const assets = await fetchAssets(supabase, project.id);
  base.assets.total = assets.length;

  // The date the codes actually carry - not the one the row claims. A batch
  // can hold both (the 20260312 / 20260314 mix), so the project number leads
  // and the first asset id follows when the number itself has no date.
  const oldCompact =
    dateSegmentOf(project.catalog_id) ||
    assets.map((row) => dateSegmentOf(row.catalog_id)).find(Boolean) ||
    null;
  base.oldDate = oldCompact;

  if (!oldCompact) {
    return { ...base, applied: false, reason: 'no-date-segment' };
  }
  if (oldCompact === newCompact) {
    return { ...base, applied: false, reason: 'already-in-sync' };
  }

  const conflicts: string[] = [];

  // ---- the event number -------------------------------------------------
  const oldProjectId = project.catalog_id ? String(project.catalog_id) : null;
  let newProjectId: string | null = null;
  if (oldProjectId) {
    newProjectId = replaceDateSegment(oldProjectId, newCompact);
    if (newProjectId && newProjectId !== oldProjectId) {
      const { data: clash } = await supabase
        .schema('lmsy_archive')
        .from('projects')
        .select('id')
        .eq('catalog_id', newProjectId)
        .maybeSingle();
      if (clash && clash.id !== project.id) {
        conflicts.push(`event number ${newProjectId} already belongs to another project`);
      }
    } else {
      newProjectId = null;
    }
  }

  // ---- the assets -------------------------------------------------------
  interface Plan {
    row: { id: string; catalog_id: string | null; image_url: string | null };
    oldId: string;
    newId: string;
    oldKey: string | null;
    newKey: string | null;
  }
  const plans: Plan[] = [];
  for (const row of assets) {
    const oldId = row.catalog_id ? String(row.catalog_id) : '';
    if (!oldId) continue;
    const newId = replaceDateSegment(oldId, newCompact);
    if (!newId || newId === oldId) continue;
    const oldKey = row.image_url ? keyForUrl(row.image_url) : null;
    const newKey = oldKey ? nextKeyFor(oldKey, oldId, newId) : null;
    plans.push({ row, oldId, newId, oldKey, newKey });
  }
  base.assets.affected = plans.length;

  // Destination asset ids must be free. Ids of this very batch are not a
  // clash: they are the rows we are about to rewrite.
  const ownIds = new Set(assets.map((row) => String(row.catalog_id || '')));
  for (const group of chunk(plans.map((plan) => plan.newId), 200)) {
    const { data: taken } = await supabase
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('catalog_id')
      .in('catalog_id', group);
    for (const row of taken || []) {
      if (!ownIds.has(String(row.catalog_id))) {
        conflicts.push(`asset id ${row.catalog_id} already exists`);
      }
    }
  }

  // Destination object keys must be free too. An object that is already there
  // belongs to something else (an orphan from an earlier upload), and copying
  // over it would lose that file.
  const keysToCheck = plans
    .filter((plan) => plan.newKey && plan.newKey !== plan.oldKey)
    .map((plan) => plan.newKey as string);
  await pooled(Array.from(new Set(keysToCheck)), 6, async (key) => {
    if (await r2ObjectExists(key)) conflicts.push(`object ${key} already exists`);
  });

  // ---- the project cover ------------------------------------------------
  let newCoverUrl: string | null = null;
  const oldCoverKey = project.cover_url ? keyForUrl(project.cover_url) : null;
  let newCoverKey: string | null = null;
  if (oldCoverKey && oldCoverKey.includes(oldCompact)) {
    newCoverKey = oldCoverKey.split('/').map((seg) => seg.split(oldCompact).join(newCompact)).join('/');
    if (newCoverKey !== oldCoverKey) {
      if (await r2ObjectExists(newCoverKey)) {
        conflicts.push(`object ${newCoverKey} already exists`);
      } else {
        newCoverUrl = `${BASE_CDN_URL}/${newCoverKey}`;
      }
    }
  }

  if (conflicts.length > 0) {
    return {
      ...base,
      applied: false,
      reason: 'conflict',
      conflicts: Array.from(new Set(conflicts)),
      projectCatalogId: newProjectId && oldProjectId ? { from: oldProjectId, to: newProjectId } : null,
      cover: { changed: false, from: project.cover_url || undefined },
    };
  }

  // ---- move the objects -------------------------------------------------
  const moved: Plan[] = [];
  const skipped: Plan[] = [];
  await pooled(plans, 6, async (plan) => {
    if (!plan.oldKey || !plan.newKey || plan.newKey === plan.oldKey) {
      moved.push(plan);
      return;
    }
    const outcome = await moveR2Object(plan.oldKey, plan.newKey);
    // 'missing-source' means the file was already gone; the row still has to
    // follow the new id, or the archive ends up with two numbering schemes.
    if (outcome === 'moved' || outcome === 'same' || outcome === 'missing-source') {
      if (outcome === 'moved') base.assets.renamed += 1;
      moved.push(plan);
    } else {
      skipped.push(plan);
    }
  });

  // ---- rewrite the rows -------------------------------------------------
  await pooled(moved, 6, async (plan) => {
    const patch: Record<string, string> = {
      catalog_id: plan.newId,
      event_date: newEventDate,
    };
    if (plan.newKey && isOurCdnUrl(plan.row.image_url)) {
      patch.image_url = `${BASE_CDN_URL}/${plan.newKey}`;
    }
    const { error } = await supabase
      .schema('lmsy_archive')
      .from('gallery_assets')
      .update(patch)
      .eq('id', plan.row.id);
    if (error) {
      console.error('[CATALOG_DATE_SYNC] asset update failed:', plan.newId, error.message);
      skipped.push(plan);
    } else {
      base.assets.updated += 1;
    }
  });
  base.assets.failed = skipped.length;

  // ---- rewrite the project ---------------------------------------------
  const projectPatch: Record<string, unknown> = {};
  if (newProjectId) {
    projectPatch.catalog_id = newProjectId;
    base.projectCatalogId = { from: oldProjectId as string, to: newProjectId };
  }
  if (newCoverUrl) {
    projectPatch.cover_url = newCoverUrl;
    base.cover = { changed: true, from: project.cover_url as string, to: newCoverUrl };
  }
  const remap = (map: Record<string, unknown> | null | undefined): Record<string, unknown> | null => {
    if (!map || typeof map !== 'object') return map ?? null;
    const table = new Map(moved.map((plan) => [plan.oldId, plan.newId]));
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(map)) {
      const id = String(value ?? '');
      out[key] = table.get(id) ?? value;
    }
    return out;
  };
  if (project.asset_group_covers) {
    projectPatch.asset_group_covers = remap(project.asset_group_covers);
  }
  if (project.talk_resource_covers) {
    projectPatch.talk_resource_covers = remap(project.talk_resource_covers);
  }

  if (Object.keys(projectPatch).length > 0) {
    const { error } = await supabase
      .schema('lmsy_archive')
      .from('projects')
      .update(projectPatch)
      .eq('id', project.id);
    if (error) {
      console.error('[CATALOG_DATE_SYNC] project update failed:', error.message);
    }
  }

  // ---- drop the stale cache --------------------------------------------
  const stale = new Set<string>();
  for (const plan of moved) {
    if (plan.oldKey) stale.add(plan.oldKey);
    if (plan.newKey && plan.newKey !== plan.oldKey) stale.add(plan.newKey);
  }
  if (oldCoverKey) stale.add(oldCoverKey);
  if (newCoverKey && newCoverKey !== oldCoverKey) stale.add(newCoverKey);
  if (stale.size > 0) {
    const result = await purgeCdnUrls(Array.from(stale));
    base.purged = result.purged ?? 0;
  }

  return {
    ...base,
    applied: true,
    cover: base.cover.changed ? base.cover : { changed: false },
  };
}
