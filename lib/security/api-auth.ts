/**
 * Server-side admin authorization for API routes.
 *
 * Single source of truth for "is this request an authenticated administrator?".
 *
 * Rules:
 * - Requires a valid Supabase session (cookie or Authorization bearer).
 * - Requires the session email to match the configured admin email.
 * - Fails CLOSED when the admin email is not configured.
 * - Never returns internal error details to the caller.
 *
 * The admin email is read from the server-only ADMIN_EMAIL variable.
 * NEXT_PUBLIC_ADMIN_EMAIL is still accepted as a transitional fallback so that
 * removing it from the client bundle does not lock the owner out before the
 * server-side variable is set in the deployment environment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getAdminEmail, isAdminEmail } from './admin-email';

export { getAdminEmail };

export interface AdminGuardSuccess {
  ok: true;
  email: string;
  userId: string;
  method: 'cookie' | 'bearer';
}

export interface AdminGuardFailure {
  ok: false;
  response: NextResponse;
}

export type AdminGuardResult = AdminGuardSuccess | AdminGuardFailure;

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}

/**
 * Guard an admin API route. Usage:
 *
 *   const auth = await requireAdmin(request);
 *   if (!auth.ok) return auth.response;
 */
export async function requireAdmin(request: NextRequest): Promise<AdminGuardResult> {
  const adminEmail = getAdminEmail();

  if (!adminEmail) {
    console.error('[SECURITY] ADMIN_EMAIL is not configured; admin API access is disabled');
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Admin access is not configured on the server' },
        { status: 503 }
      ),
    };
  }

  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return { ok: false, response: unauthorizedResponse() };
  }

  const email = (authResult.user.email || '').trim().toLowerCase();
  if (!isAdminEmail(email)) {
    return { ok: false, response: forbiddenResponse() };
  }

  return {
    ok: true,
    email,
    userId: authResult.user.id,
    method: authResult.method === 'bearer' ? 'bearer' : 'cookie',
  };
}

/**
 * Server-side admin guard for React Server Components (admin pages / layouts),
 * where there is no NextRequest to hand to requireAdmin. Reads the Supabase
 * session straight from cookies and applies the same single-source admin-email
 * rule as requireAdmin. Returns the admin email when the caller is an
 * authenticated admin, otherwise null (fail-closed, including when ADMIN_EMAIL
 * is not configured).
 *
 * Accessing cookies() opts the calling route into dynamic rendering, which is
 * correct for admin pages: they must be authorized per request instead of being
 * cached at the edge.
 */
export async function getAdminFromCookies(): Promise<string | null> {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return null;

  const cookieStore = await cookies();
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') || '';

  const supabaseAuth = createServerClient(
    rawUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // RSC render cannot write cookies; no-op so a token refresh does not throw.
        set() {},
        remove() {},
      },
      db: {
        schema: 'lmsy_archive',
      },
    }
  );

  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return null;

  const email = (user.email || '').trim().toLowerCase();
  return isAdminEmail(email) ? email : null;
}
