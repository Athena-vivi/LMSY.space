/**
 * Data-layer client surface (lib/data).
 *
 * Every repository under lib/data takes the server-only admin client as its
 * first argument. This module is the single import point for that client and
 * its type, so a future swap (generated Database types in Phase 4, or an
 * anon+RLS client for public reads) happens here instead of in every
 * repository.
 *
 * Server-only by inheritance: getSupabaseAdmin() throws when reached from
 * browser code - the SERVICE_ROLE_KEY guard lives in lib/supabase/admin.ts
 * and is deliberately not duplicated here.
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../supabase/admin.ts';

export { getSupabaseAdmin };

/**
 * The admin client type as it stands today.
 *
 * Derived with ReturnType so this alias can never drift from the real client.
 * The `any` Database generic inside it comes from lib/supabase/admin.ts and is
 * retired in Phase 4 (supabase gen types) - one edit there retires it here.
 */
export type AdminClient = ReturnType<typeof getSupabaseAdmin>;

/**
 * Server-side anon client for PUBLIC reads.
 *
 * Uses NEXT_PUBLIC_SUPABASE_ANON_KEY, so every query runs under RLS. This is
 * the read half of the privilege split: public doors / public pages read
 * through here; every write and every admin read keeps using
 * getSupabaseAdmin() (service_role, bypasses RLS).
 *
 * Deliberately separate from lib/supabase/client.ts: that is the browser
 * client (persistSession + localStorage) and must not run during SSR.
 *
 * This is not the security boundary itself - the database RLS policies are.
 * If a table is missing from the public_read policy set, anon reads simply
 * return nothing (safe failure: an empty shelf, never a leak).
 */
export function getSupabasePublic(): AdminClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase public (anon) client is not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  // Structurally identical to AdminClient (same SupabaseClient bound to the
  // lmsy_archive schema); only the key differs. Typed as AdminClient so the
  // existing repository signatures - which already enumerate this shape - keep
  // accepting it with zero churn. The name is historical; treat it as "the
  // server SupabaseClient type", not "a privileged client".
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: { schema: 'lmsy_archive' },
    global: {
      headers: { 'X-Client-Info': 'lmsy-space-public-ssr' },
    },
  }) as unknown as AdminClient;
}

/** The public (anon) client type - same structural shape as AdminClient. */
export type PublicClient = AdminClient;

/** Any server-side database client a repository may take. */
export type DbClient = AdminClient;
