/**
 * Keep a project's catalog code in step with the fields it is built from.
 *
 * WHY THIS EXISTS
 * ---------------
 * The event number (projects.catalog_id) and every asset id under it are
 * derived, not typed: the door from the category, the subject from the
 * subtype and the city, a YYYYMMDD segment from the event date, and a -LM /
 * -SY tail from the person. They are written once, at promote time, from
 * whatever the row said that day.
 *
 * Editing any of those fields later used to leave the code frozen: a curator
 * corrected a Bangkok award night to 2025-05-14 and the number still read
 * 20250515; the BaBi Blushing party was moved to Shanghai and its number
 * still said BKK. The site then showed one thing and the file names another,
 * with no warning at all.
 *
 * This module is the other half: given the row BEFORE an edit and the row
 * AFTER it, it rebuilds the event number, rewrites every asset id under it
 * and moves the files to match, so the code can never drift again.
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

import {
  buildProjectCatalogId,
  doorCodeForProject,
  hasPickedSubject,
  pickedSubject,
  r2KeyForCatalogId,
  subjectFromProjectId,
  type CatalogIdClient,
} from './catalog-id.ts';
import { purgeCdnUrls } from './cloudflare-purge.ts';
import {
  BASE_CDN_URL,
  getRelativePath,
  moveR2Object,
  r2ObjectExists,
} from './r2-client.ts';

/** The fields the catalog code is built from. */
export interface CatalogSyncFields {
  id: string;
  catalog_id?: string | null;
  cover_url?: string | null;
  event_date?: string | null;
  category?: string | null;
  project_kind?: string | null;
  subtype?: string | null;
  city?: string | null;
  person?: string | null;
  // Curator-picked cover maps: { className: assetCatalogId }. Both store asset
  // ids, so both have to follow a rename.
  asset_group_covers?: Record<string, unknown> | null;
  talk_resource_covers?: Record<string, unknown> | null;
}

export interface CatalogSyncResult {
  applied: boolean;
  /** Why nothing was done. Set only when applied is false. */
  reason?: string;
  projectId: string;
  /** The event number before, null when the row had none. */
  from: string | null;
  /** The event number after. */
  to: string | null;
  assets: {
    total: number;
    /** Rows whose id no longer matched the event number or the date. */
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

/**
 * An asset id rebuilt under a new event number.
 *
 *   oldEventNumber LMSY-EVENT-BRANDDAY-BKK-20250628, rest '-001'
 *   newEventNumber LMSY-EVENT-BRANDDAY-SHA-20250628
 *   ->            LMSY-EVENT-BRANDDAY-SHA-20250628-001
 *
 * Doors other than EVENT / APPEAR keep the date as its own segment behind the
 * event number (LMSY-MAG-OAT-LM-20241211-012), so the date in `rest` is
 * rewritten too - and kept when no new date is known, because a topic that is
 * not pinned to a day must not gain one here.
 *
 * Returns null when the id does not belong to this event at all; callers fall
 * back to a date-only rewrite for those.
 */
export function assetIdUnder(
  id: string,
  oldEventNumber: string,
  newEventNumber: string,
  newCompactDate: string | null
): string | null {
  if (!id.startsWith(`${oldEventNumber}-`)) return null;
  const rest = id.slice(oldEventNumber.length);
  if (!newCompactDate) return newEventNumber + rest;
  // EVENT / APPEAR carry the date inside the number, so `rest` is only the
  // sequence and there is no date to rewrite - keep it as it is.
  return newEventNumber + (replaceDateSegment(rest, newCompactDate) ?? rest);
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
 * The event number a row should carry, built from the fields it is derived
 * from. Null means "these fields cannot decide it" - never guess.
 */
function eventNumberFor(fields: CatalogSyncFields): string | null {
  const door = doorCodeForProject(fields);
  if (!door) return null;
  const old = String(fields.catalog_id || '');
  const subject = hasPickedSubject(fields.category)
    ? pickedSubject(fields.category, fields.subtype, fields.city)
    : subjectFromProjectId(old);
  if (!subject) return null;
  return buildProjectCatalogId(door, subject, fields.event_date, fields.person);
}

/**
 * Rebuild a project's catalog code - and everything derived from it - so it
 * matches the row's current category / subtype / city / date / person.
 *
 * Returns applied=false with a reason when there is nothing to do, and with
 * `conflicts` when the destination is taken. A conflict leaves the batch
 * untouched on purpose; the caller is expected to surface it, because the
 * fields themselves have already been saved by then.
 */
export async function syncProjectCatalogCode(
  supabase: CatalogIdClient,
  before: CatalogSyncFields,
  after: CatalogSyncFields
): Promise<CatalogSyncResult> {
  const oldEventNumber = before.catalog_id ? String(before.catalog_id) : null;
  const newEventNumber = eventNumberFor(after);
  const newCompact = compactOf(after.event_date);

  const result: CatalogSyncResult = {
    applied: false,
    projectId: before.id,
    from: oldEventNumber,
    to: newEventNumber,
    assets: { total: 0, affected: 0, updated: 0, renamed: 0, failed: 0 },
    cover: { changed: false },
    purged: 0,
  };

  if (!oldEventNumber || !newEventNumber) {
    return { ...result, reason: oldEventNumber ? 'no-derived-number' : 'no-event-number' };
  }

  const assets = await fetchAssets(supabase, before.id);
  result.assets.total = assets.length;

  // ---- plan: which ids have to change -----------------------------------
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
    const newId =
      (oldEventNumber !== newEventNumber
        ? assetIdUnder(oldId, oldEventNumber, newEventNumber, newCompact)
        : null) ??
      (newCompact ? replaceDateSegment(oldId, newCompact) : null);
    if (!newId || newId === oldId) continue;
    const oldKey = row.image_url ? keyForUrl(row.image_url) : null;
    const newKey = oldKey ? nextKeyFor(oldKey, oldId, newId) : null;
    plans.push({ row, oldId, newId, oldKey, newKey });
  }
  result.assets.affected = plans.length;

  const numberChanged = oldEventNumber !== newEventNumber;
  if (!numberChanged && plans.length === 0) {
    return { ...result, reason: 'already-in-sync' };
  }

  const conflicts: string[] = [];

  // ---- the event number -------------------------------------------------
  if (numberChanged) {
    const { data: clash } = await supabase
      .schema('lmsy_archive')
      .from('projects')
      .select('id')
      .eq('catalog_id', newEventNumber)
      .maybeSingle();
    if (clash && clash.id !== before.id) {
      conflicts.push(`event number ${newEventNumber} already belongs to another project`);
    }
  }

  // ---- the assets -------------------------------------------------------
  // Ids of this very batch are not a clash: they are the rows being rewritten.
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

  // Destination object keys must be free too. An object already sitting there
  // belongs to something else (an orphan from an earlier upload), and copying
  // over it would lose that file.
  const keysToCheck = Array.from(
    new Set(plans.filter((plan) => plan.newKey && plan.newKey !== plan.oldKey).map((p) => p.newKey as string))
  );
  await pooled(keysToCheck, 6, async (key) => {
    if (await r2ObjectExists(key)) conflicts.push(`object ${key} already exists`);
  });

  // ---- the project cover ------------------------------------------------
  // Two cases: the cover points at one of this project's pictures (it is then
  // already renamed below, only the url has to follow), or it is a poster of
  // our own whose name carries the old code.
  const oldCoverKey = before.cover_url ? keyForUrl(before.cover_url) : null;
  const oldCompact = dateSegmentOf(oldEventNumber) || assets.map((r) => dateSegmentOf(r.catalog_id)).find(Boolean) || null;
  let newCoverUrl: string | null = null;
  let coverKeyToMove: string | null = null;
  let newCoverKey: string | null = null;

  if (oldCoverKey) {
    const base = oldCoverKey.slice(oldCoverKey.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '');
    const renamed = plans.find((plan) => plan.oldId === base);
    if (renamed) {
      newCoverUrl = `${BASE_CDN_URL}/${renamed.newKey}`;
      newCoverKey = renamed.newKey;
    } else if (oldCompact && newCompact && oldCoverKey.includes(oldCompact)) {
      const swapped = oldCoverKey.split('/').map((seg) => seg.split(oldCompact).join(newCompact)).join('/');
      if (swapped !== oldCoverKey) {
        if (await r2ObjectExists(swapped)) {
          conflicts.push(`object ${swapped} already exists`);
        } else {
          coverKeyToMove = oldCoverKey;
          newCoverKey = swapped;
          newCoverUrl = `${BASE_CDN_URL}/${swapped}`;
        }
      }
    }
  }

  if (conflicts.length > 0) {
    return { ...result, reason: 'conflict', conflicts: Array.from(new Set(conflicts)) };
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
      if (outcome === 'moved') result.assets.renamed += 1;
      moved.push(plan);
    } else {
      skipped.push(plan);
    }
  });

  if (coverKeyToMove && newCoverKey) {
    const outcome = await moveR2Object(coverKeyToMove, newCoverKey);
    if (outcome === 'moved' || outcome === 'same') {
      result.cover = { changed: true, from: before.cover_url as string, to: newCoverUrl as string };
    } else {
      newCoverUrl = null;
      newCoverKey = null;
    }
  } else if (newCoverUrl) {
    result.cover = { changed: true, from: before.cover_url as string, to: newCoverUrl };
  }

  // ---- rewrite the rows -------------------------------------------------
  await pooled(moved, 6, async (plan) => {
    const patch: Record<string, string> = { catalog_id: plan.newId };
    if (after.event_date) patch.event_date = after.event_date;
    if (plan.newKey && isOurCdnUrl(plan.row.image_url)) {
      patch.image_url = `${BASE_CDN_URL}/${plan.newKey}`;
    }
    const { error } = await supabase
      .schema('lmsy_archive')
      .from('gallery_assets')
      .update(patch)
      .eq('id', plan.row.id);
    if (error) {
      console.error('[CATALOG_SYNC] asset update failed:', plan.newId, error.message);
      skipped.push(plan);
    } else {
      result.assets.updated += 1;
    }
  });
  result.assets.failed = skipped.length;

  // ---- rewrite the project ---------------------------------------------
  const projectPatch: Record<string, unknown> = {};
  if (numberChanged) projectPatch.catalog_id = newEventNumber;
  if (newCoverUrl) projectPatch.cover_url = newCoverUrl;
  const table = new Map(moved.map((plan) => [plan.oldId, plan.newId]));
  const remap = (map: Record<string, unknown> | null | undefined): Record<string, unknown> | null => {
    if (!map || typeof map !== 'object') return map ?? null;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(map)) {
      out[key] = table.get(String(value ?? '')) ?? value;
    }
    return out;
  };
  if (before.asset_group_covers) projectPatch.asset_group_covers = remap(before.asset_group_covers);
  if (before.talk_resource_covers) projectPatch.talk_resource_covers = remap(before.talk_resource_covers);

  if (Object.keys(projectPatch).length > 0) {
    const { error } = await supabase
      .schema('lmsy_archive')
      .from('projects')
      .update(projectPatch)
      .eq('id', before.id);
    if (error) console.error('[CATALOG_SYNC] project update failed:', error.message);
  }

  // ---- drop the stale cache --------------------------------------------
  const stale = new Set<string>();
  for (const plan of moved) {
    if (plan.oldKey) stale.add(plan.oldKey);
    if (plan.newKey && plan.newKey !== plan.oldKey) stale.add(plan.newKey);
  }
  if (oldCoverKey) stale.add(oldCoverKey);
  if (newCoverKey && newCoverKey !== oldCoverKey) stale.add(newCoverKey);
  if (stale.size > 0) result.purged = (await purgeCdnUrls(Array.from(stale))).purged ?? 0;

  return { ...result, applied: true };
}
