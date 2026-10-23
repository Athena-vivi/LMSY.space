/**
 * Admin gallery mutations (lib/data).
 *
 * First consumers: app/api/admin/gallery/* - route.ts (CRUD), batch-update,
 * transfer, portal and milestone. Every function here is a verbatim move of the
 * query those routes built inline: same table, same columns, same filter, same
 * order, same write shape, same error semantics. The behaviours carried over
 * on purpose:
 *
 * - reads THROW on a PostgREST error (the routes mapped the message onto their
 *   own 500 / apiServerError - the route's catch re-wraps the thrown value)
 * - row-writes return the saved row (select().single()) so the route answers it
 * - the batch-update helper returns { error } per row so the route can
 *   aggregate and surface the first failure, exactly as before
 * - one write (project cover during transfer) was fire-and-forget in the route;
 *   its helper ignores the result to match
 */

import type { AdminClient } from './client.ts';

/** One project's gallery images, newest first. GET /api/admin/gallery. */
export async function listGalleryAssetsByProject(
  db: AdminClient,
  projectId: string
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<Record<string, unknown>>;
}

/** Verify a project exists before linking assets (POST /api/admin/gallery). */
export async function getProjectIdIfExists(
  db: AdminClient,
  projectId: string
): Promise<string | null> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as { id: string } | null)?.id ?? null;
}

/** Pre-check existing image URLs for idempotent insert dedup (POST). */
export async function findGalleryAssetsByImageUrls(
  db: AdminClient,
  urls: string[]
): Promise<Array<{ id: string; image_url: string | null }>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url')
    .in('image_url', urls);

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ id: string; image_url: string | null }>;
}

/** Insert one gallery asset (the row is built by the route). */
export async function insertGalleryAsset(
  db: AdminClient,
  row: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Insert returned no row');
  return data as Record<string, unknown>;
}

/** Delete gallery assets by id set (DELETE /api/admin/gallery). */
export async function deleteGalleryAssetsByIds(db: AdminClient, ids: string[]): Promise<void> {
  const { error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .delete()
    .in('id', ids);

  if (error) throw new Error(error.message);
}

/** Patch one asset's fields (PATCH /api/admin/gallery). */
export async function updateGalleryAsset(
  db: AdminClient,
  id: string,
  patch: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Update returned no row');
  return data as Record<string, unknown>;
}

/**
 * Set one asset's sequence in the curation order. Returns the row-level error
 * (or null) so the batch route can surface the first failure verbatim.
 */
export async function setGalleryAssetSequence(
  db: AdminClient,
  id: string,
  sequence: number
): Promise<{ error: unknown | null }> {
  const { error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .update({ sequence })
    .eq('id', id);

  return { error: error ?? null };
}

/** Verify a project exists and return its title (POST /api/admin/gallery/transfer). */
export async function getProjectForTransfer(
  db: AdminClient,
  projectId: string
): Promise<{ id: string; title: string | null } | null> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('id, title')
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as { id: string; title: string | null } | null) ?? null;
}

/** Move a set of assets to a project (POST /api/admin/gallery/transfer). */
export async function transferGalleryAssetsToProject(
  db: AdminClient,
  ids: string[],
  projectId: string
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .update({ project_id: projectId })
    .in('id', ids)
    .select();

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<Record<string, unknown>>;
}

/**
 * Mirror a transferred cover onto the project. Fire-and-forget: the original
 * route awaited the write but ignored its result, so errors here are swallowed
 * to preserve that exact behaviour.
 */
export async function setProjectCoverUrl(
  db: AdminClient,
  projectId: string,
  coverUrl: string | null
): Promise<void> {
  await db
    .schema('lmsy_archive')
    .from('projects')
    .update({ cover_url: coverUrl })
    .eq('id', projectId);
}

/**
 * Release a door slot from its previous holder before claiming it (PATCH
 * /api/admin/gallery/portal). Throws on error.
 */
export async function clearDoorSlot(
  db: AdminClient,
  column: string,
  value: string
): Promise<void> {
  const { error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .update({ [column]: null })
    .eq(column, value);

  if (error) throw new Error(error.message);
}

/** Claim a door slot for one image. Returns the saved row. */
export async function setDoorSlot(
  db: AdminClient,
  column: string,
  imageId: string,
  value: string | null
): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .update({ [column]: value })
    .eq('id', imageId)
    .select(`id, image_url, blur_data, ${column}`)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Update returned no row');
  return data as unknown as Record<string, unknown>;
}

/** The rows currently occupying one door column (GET /api/admin/gallery/portal). */
export async function getDoorSlotRows(
  db: AdminClient,
  column: string,
  columns: string
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select(columns)
    .not(column, 'is', null);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Array<Record<string, unknown>>;
}

/** Find the milestone archive project by its fixed title (milestone route). */
export async function findProjectByTitle(
  db: AdminClient,
  title: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .eq('title', title)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Record<string, unknown> | null) ?? null;
}

/** Create the milestone archive project (milestone route). */
export async function createProjectRow(
  db: AdminClient,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('projects')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Insert returned no row');
  return data as Record<string, unknown>;
}

/** Link an asset to a project (milestone PATCH). */
export async function linkAssetToProject(
  db: AdminClient,
  assetId: string,
  projectId: string
): Promise<void> {
  const { error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .update({ project_id: projectId })
    .eq('id', assetId);

  if (error) throw new Error(error.message);
}

/** Clear every asset's milestone for a given priority (milestone PATCH). */
export async function clearMilestonePriorityByValue(
  db: AdminClient,
  priority: number
): Promise<void> {
  const { error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .update({ milestone_priority: null })
    .eq('milestone_priority', priority);

  if (error) throw new Error(error.message);
}

/** Set one asset's milestone priority. Returns the saved row. */
export async function setMilestonePriority(
  db: AdminClient,
  assetId: string,
  priority: number | null
): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .update({ milestone_priority: priority })
    .eq('id', assetId)
    .select('id, image_url, milestone_priority')
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Update returned no row');
  return data as Record<string, unknown>;
}

/** All assets with a milestone priority, ordered low -> high (milestone GET). */
export async function listMilestoneAssets(
  db: AdminClient
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, milestone_priority, caption, tag')
    .not('milestone_priority', 'is', null)
    .order('milestone_priority', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<Record<string, unknown>>;
}
