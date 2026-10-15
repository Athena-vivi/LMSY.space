import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';
import { getAdminEmail } from '@/lib/security/api-auth';

/**
 * GET /api/auth/session
 *
 * Server-side source of truth for "am I logged in, and am I the admin?".
 *
 * This exists so the browser never needs the admin email in its bundle:
 * previously the client compared the signed-in email against
 * NEXT_PUBLIC_ADMIN_EMAIL, which shipped the owner's address in client JS.
 *
 * Response never contains any secret, only the caller's own identity.
 */
export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);

  if (!authResult.user || authResult.error) {
    return NextResponse.json(
      { success: true, authenticated: false, isAdmin: false, user: null },
      { status: 200 }
    );
  }

  const adminEmail = getAdminEmail();
  const email = (authResult.user.email || '').trim().toLowerCase();
  const isAdmin = Boolean(adminEmail) && email === adminEmail;

  return NextResponse.json({
    success: true,
    authenticated: true,
    isAdmin,
    user: {
      id: authResult.user.id,
      email: authResult.user.email ?? null,
    },
  });
}
