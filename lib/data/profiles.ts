/**
 * People portraits (lib/data).
 *
 * The homepage people cards and the person page read the curator-chosen photo
 * from `profiles.avatar_url`. This module is the read/write home for that one
 * field plus the list the admin portrait picker needs. Both callers are admin-
 * only, so reads THROW on a PostgREST error (the route maps it onto its own 500
 * via apiServerError, preserving the original logContext + cause).
 */

import type { AdminClient } from './client.ts';

/** All people for the admin portrait picker, ordered by nickname. GET /api/admin/people/portrait. */
export async function listPortraitProfiles(db: AdminClient): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('profiles')
    .select('id, name, nickname, slug, avatar_url, role_label')
    .order('nickname', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<Record<string, unknown>>;
}

/** Set or clear (null) a person's chosen portrait. Returns the saved row. PATCH /api/admin/people/portrait. */
export async function updateProfileAvatar(
  db: AdminClient,
  profileId: string,
  imageUrl: string | null
): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .schema('lmsy_archive')
    .from('profiles')
    .update({ avatar_url: imageUrl ?? null })
    .eq('id', profileId)
    .select('id, name, nickname, slug, avatar_url')
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Update returned no row');
  return data as Record<string, unknown>;
}
