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
