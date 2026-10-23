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
