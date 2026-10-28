/**
 * Moving gallery assets between projects, and dissolving a project back into
 * the draft box.
 *
 * Both operations have to keep three things in step, which is why they live
 * here instead of in the routes:
 *
 *   1. the R2 object key  - derived from the catalog id, never stored twice
 *   2. the catalog id      - re-allocated under the TARGET project's head
 *   3. the row             - image_url / project_id / event_date follow
 *
 * The event number and asset prefix are derived with the exact helpers the
 * ingest path uses (doorCodeForProject -> buildProjectCatalogId ->
 * assetIdPrefixFor), so a moved asset can never drift out of the naming spec.
 *
 * Nothing here writes a path by hand: every key comes from
 * r2KeyForCatalogId(), and every url from the moved object.
 */

import {
  assetIdPrefixFor,
  buildProjectCatalogId,
  doorCodeForProject,
  normalizeEventNumber,
  r2KeyForCatalogId,
} from '@/lib/catalog-id';
import {
  moveR2Object,
  copyR2Object,
  deleteFromR2,
  r2ObjectExists,
  getCdnUrl,
  getRelativePath,
} from '@/lib/r2-client';
import { purgeCdnUrls } from '@/lib/cloudflare-purge';
import { revalidateContentSurfaces } from '@/lib/revalidate-content';
import { deriveSubjectSegment } from '@/lib/promote';
import { buildManualDraftRecord } from '@/lib/manual-draft';
import type { AdminClient } from '@/lib/data/client';

type Db = AdminClient;

export interface MovedAsset {
  assetId: string;
  fromCatalogId: string | null;
  toCatalogId: string;
  fromUrl: string;
  toUrl: string;
}

export interface MoveConflict {
  assetId: string;
  catalogId: string | null;
  reason: string;
}

export interface MoveOutcome {
  moved: MovedAsset[];
  conflicts: MoveConflict[];
  /** Projects that lost pictures, with how many they still hold. */
  sources: Array<{ projectId: string; remaining: number }>;
  targetProjectId: string;
}

export class AssetMoveError extends Error {}

interface ProjectRow {
  id: string;
  title: string | null;
  catalog_id: string | null;
  category: string | null;
  subtype: string | null;
  project_kind: string | null;
  event_date: string | null;
  cover_url: string | null;
  person?: string | null;
}

interface AssetRow {
  id: string;
  catalog_id: string | null;
  image_url: string;
  project_id: string | null;
  event_date: string | null;
  is_cover: boolean | null;
}

/**
 * Where an asset's id has to live once it belongs to `project`.
 *
 * Returns null when the project has no usable door code, which means the
 * caller must refuse rather than fall back to a guessed prefix.
 */
function assetHeadFor(project: ProjectRow): string | null {
  const doorCode = doorCodeForProject(project);
  if (!doorCode) return null;

  const eventNumber =
    normalizeEventNumber(project.catalog_id) ||
    buildProjectCatalogId(doorCode, deriveSubjectSegment(project), project.event_date, project.person);
  if (!eventNumber) return null;

  return assetIdPrefixFor(eventNumber, doorCode, project.event_date);
}

async function loadProject(db: Db, id: string): Promise<ProjectRow | null> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('id, title, catalog_id, category, subtype, project_kind, event_date, cover_url, person')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new AssetMoveError(`Project lookup failed: ${error.message}`);
  return (data as unknown as ProjectRow) || null;
}

/** How many pictures a project still holds. */
async function countAssets(db: Db, projectId: string): Promise<number> {
  const { count, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Keep the cover pointer honest after pictures moved away.
 *
 * A cover is a pointer, so it must not keep aiming at a url that now belongs to
 * another project. It is only rewritten when it is empty or when it pointed at
 * one of the urls that just left - an untouched cover is never re-decided here.
 */
async function refreshCoverAfterMove(
  db: Db,
  projectId: string,
  departingUrls: string[]
): Promise<void> {
  const { data: project } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('cover_url')
    .eq('id', projectId)
    .maybeSingle();

  const current = (project?.cover_url as string | null) ?? null;
  const stillValid = current && !departingUrls.includes(current);
  if (stillValid) return;

  const { data: first } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('image_url')
    .eq('project_id', projectId)
    .order('catalog_id', { ascending: true })
    .limit(1)
    .maybeSingle();

  const next = (first?.image_url as string | null) ?? null;
  if (next === current) return;

  await db
    .schema('lmsy_archive')
    .from('projects')
    .update({ cover_url: next })
    .eq('id', projectId);
}

/**
 * The next sequence number under one asset head.
 *
 * Only plain `<head>-NNN` ids count towards it; a dated id under the same head
 * belongs to another naming generation and must not drag the sequence around.
 */
async function nextSequenceUnder(db: Db, head: string): Promise<number> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('catalog_id')
    .like('catalog_id', `${head}-%`)
    .limit(1000);

  if (error) return 1;

  const escaped = head.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}-(\\d{3})$`);

  let next = 1;
  for (const row of data ?? []) {
    const match = pattern.exec((row.catalog_id as string) ?? '');
    if (match) next = Math.max(next, parseInt(match[1], 10) + 1);
  }
  return next;
}

/**
 * Move a batch of assets into another project.
 *
 * All-or-nothing on the naming side: every destination key is checked before
 * the first file moves, so a batch never half-migrates because asset 7 hit an
 * occupied key.
 */
export async function moveAssetsToProject(
  db: Db,
  assetIds: string[],
  targetProjectId: string
): Promise<MoveOutcome> {
  const ids = Array.from(new Set(assetIds.filter(Boolean)));
  if (ids.length === 0) throw new AssetMoveError('No assets selected');

  const target = await loadProject(db, targetProjectId);
  if (!target) throw new AssetMoveError('Target project not found');

  const head = assetHeadFor(target);
  if (!head) {
    throw new AssetMoveError(
      `Cannot derive a catalog id head for "${target.title ?? target.id}" - the project needs a door code and a resolvable subject`
    );
  }

  const { data: rawAssets, error: assetError } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, catalog_id, image_url, project_id, event_date, is_cover')
    .in('id', ids);

  if (assetError) throw new AssetMoveError(`Asset lookup failed: ${assetError.message}`);

  const assets = (rawAssets ?? []) as unknown as AssetRow[];
  if (assets.length !== ids.length) {
    throw new AssetMoveError(
      `Only ${assets.length} of ${ids.length} assets were found - nothing was moved`
    );
  }

  // Deterministic order so a batch keeps its relative sequence.
  assets.sort((a, b) => (a.catalog_id ?? '').localeCompare(b.catalog_id ?? ''));

  const already = assets.filter((a) => a.project_id === targetProjectId);
  if (already.length === assets.length) return { moved: [], conflicts: [], sources: [], targetProjectId };

  const moving = assets.filter((a) => a.project_id !== targetProjectId);

  // Continue after whatever the target already holds.
  //
  // Done by scanning the target's own ids rather than trusting the last row:
  // a project can hold a dated id (`LMSY-FEAT-DAILY-20230622-001`) next to the
  // plain ones, and "order by catalog_id desc" then sorts the dated id last and
  // reports its tail (001) as the highest - the next batch would restart at 002
  // and sit in front of pictures that already exist.
  let sequence = await nextSequenceUnder(db, head);

  const planned: Array<{ asset: AssetRow; toCatalogId: string; toKey: string; fromKey: string }> = [];
  const conflicts: MoveConflict[] = [];

  for (const asset of moving) {
    const fromKey = getRelativePath(asset.image_url);
    if (!fromKey) {
      conflicts.push({
        assetId: asset.id,
        catalogId: asset.catalog_id,
        reason: 'This picture is not served from our own bucket, so it has no key to move',
      });
      continue;
    }

    const toCatalogId = `${head}-${String(sequence).padStart(3, '0')}`;
    let toKey: string;
    try {
      toKey = r2KeyForCatalogId(toCatalogId);
    } catch (error) {
      conflicts.push({
        assetId: asset.id,
        catalogId: asset.catalog_id,
        reason: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    planned.push({ asset, toCatalogId, toKey, fromKey });
    sequence += 1;
  }

  // Check every destination before touching a single file.
  for (const item of planned) {
    if (item.toKey === item.fromKey) continue;

    const { data: squatter } = await db
      .schema('lmsy_archive')
      .from('gallery_assets')
      .select('id')
      .eq('catalog_id', item.toCatalogId)
      .maybeSingle();

    if (squatter) {
      conflicts.push({
        assetId: item.asset.id,
        catalogId: item.asset.catalog_id,
        reason: `${item.toCatalogId} is already taken by another asset in the database`,
      });
      continue;
    }

    if (await r2ObjectExists(item.toKey)) {
      conflicts.push({
        assetId: item.asset.id,
        catalogId: item.asset.catalog_id,
        reason: `${item.toKey} already exists in the bucket`,
      });
    }
  }

  if (conflicts.length > 0) {
    return { moved: [], conflicts, sources: [], targetProjectId };
  }

  const moved: MovedAsset[] = [];
  const movingUrls: string[] = [];
  const touchedKeys: string[] = [];

  for (const item of planned) {
    const result = await moveR2Object(item.fromKey, item.toKey);
    if (result !== 'moved' && result !== 'same') {
      throw new AssetMoveError(
        `Moving ${item.asset.catalog_id ?? item.asset.id} failed (${result}); the batch stopped at this picture`
      );
    }

    const toUrl = getCdnUrl(item.toKey);
    const { error: updateError } = await db
      .schema('lmsy_archive')
      .from('gallery_assets')
      .update({
        project_id: targetProjectId,
        catalog_id: item.toCatalogId,
        image_url: toUrl,
        event_date: target.event_date,
      })
      .eq('id', item.asset.id);

    if (updateError) {
      throw new AssetMoveError(
        `Row update failed for ${item.toCatalogId}: ${updateError.message}`
      );
    }

    moved.push({
      assetId: item.asset.id,
      fromCatalogId: item.asset.catalog_id,
      toCatalogId: item.toCatalogId,
      fromUrl: item.asset.image_url,
      toUrl,
    });
    movingUrls.push(item.asset.image_url);
    touchedKeys.push(item.fromKey, item.toKey);
  }

  // Covers: the target may now be able to take one, and every source must stop
  // pointing at a picture it no longer owns.
  const sourceIds = Array.from(
    new Set(moving.map((a) => a.project_id).filter((id): id is string => Boolean(id)))
  );

  await Promise.all([
    refreshCoverAfterMove(db, targetProjectId, []),
    ...sourceIds.map((id) => refreshCoverAfterMove(db, id, movingUrls)),
  ]);

  // New keys were just written, old ones just deleted; neither is in the CDN
  // cache under its final content yet.
  await purgeCdnUrls(touchedKeys);
  revalidateContentSurfaces();

  const sources = await Promise.all(
    sourceIds.map(async (projectId) => ({ projectId, remaining: await countAssets(db, projectId) }))
  );

  return { moved, conflicts: [], sources, targetProjectId };
}

export interface DissolveFailure {
  assetId: string;
  reason: string;
}

export interface DissolveOutcome {
  draftsCreated: number;
  failures: DissolveFailure[];
  projectDeleted: boolean;
}

function draftKeyFor(now: Date, ext = 'webp'): string {
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8);
  return `draft/manual/${yyyy}/${mm}/${dd}/${now.getTime()}-${random}.${ext}`;
}

/**
 * Delete a project, handing every picture back to the draft box.
 *
 * The picture is copied to a draft key and only then removed from the archive
 * key, so a failed copy never loses the file. The project row is deleted only
 * when every picture made it back - a half-empty project is worse than a
 * reported failure.
 */
export async function dissolveProjectToDrafts(
  db: Db,
  projectId: string
): Promise<DissolveOutcome> {
  const project = await loadProject(db, projectId);
  if (!project) throw new AssetMoveError('Project not found');

  const { data: rawAssets, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, catalog_id, image_url, project_id, event_date, is_cover, caption, tag')
    .eq('project_id', projectId)
    .order('catalog_id', { ascending: true });

  if (error) throw new AssetMoveError(`Asset lookup failed: ${error.message}`);

  const assets = (rawAssets ?? []) as unknown as Array<
    AssetRow & { caption: string | null; tag: string | null }
  >;

  const failures: DissolveFailure[] = [];
  let draftsCreated = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const asset of assets) {
    const sourceKey = getRelativePath(asset.image_url);
    if (!sourceKey) {
      failures.push({ assetId: asset.id, reason: 'Picture is not served from our own bucket' });
      continue;
    }

    const ext = sourceKey.split('.').pop() || 'webp';
    const draftKey = draftKeyFor(new Date(), ext);

    const copied = await copyR2Object(sourceKey, draftKey);
    if (!copied) {
      failures.push({ assetId: asset.id, reason: `Could not copy ${sourceKey} into the draft folder` });
      continue;
    }

    const record = buildManualDraftRecord({
      catalogId: asset.catalog_id ?? '',
      r2Key: draftKey,
      imageUrl: getCdnUrl(draftKey),
      eventDate: asset.event_date || project.event_date || today,
      caption: asset.caption,
      tag: asset.tag,
      projectId: null,
      isFeatured: false,
    });

    const { error: insertError } = await db.schema('lmsy_archive').from('draft_items').insert(record);
    if (insertError) {
      // Leave the copied file in place: it is unreferenced but harmless, and
      // deleting it could race a later retry.
      failures.push({ assetId: asset.id, reason: `Draft insert failed: ${insertError.message}` });
      continue;
    }

    const { error: deleteError } = await db
      .schema('lmsy_archive')
      .from('gallery_assets')
      .delete()
      .eq('id', asset.id);

    if (deleteError) {
      failures.push({ assetId: asset.id, reason: `Archive row delete failed: ${deleteError.message}` });
      continue;
    }

    await deleteFromR2(sourceKey);
    draftsCreated += 1;
  }

  if (failures.length > 0) {
    return { draftsCreated, failures, projectDeleted: false };
  }

  const { error: projectError } = await db
    .schema('lmsy_archive')
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (projectError) {
    throw new AssetMoveError(`Project delete failed: ${projectError.message}`);
  }

  revalidateContentSurfaces();
  return { draftsCreated, failures: [], projectDeleted: true };
}
