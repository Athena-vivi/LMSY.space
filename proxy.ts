import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Session refresh proxy (Next.js 16 successor of middleware.ts).
 *
 * Purpose: keep the Supabase auth cookies alive. The access token inside the
 * auth cookie expires after ~1 hour. API routes cannot persist rotated tokens
 * (their cookie adapter is read-only), so without this proxy the server-side
 * session dies after the first hour even though the browser still considers
 * itself logged in - which locked the owner out of /admin until a fresh login.
 *
 * What it does:
 *   - Reads the auth cookies, lets supabase-js refresh them if expired.
 *   - Writes rotated tokens back to BOTH the request cookies (so downstream
 *     route handlers see fresh values) and the response cookies (so the
 *     browser stores them for next time).
 *
 * What it deliberately does NOT do:
 *   - No redirects, no access control. Every route keeps its own guard
 *     (requireAdmin, requireMachineKey, etc.).
 *   - No service-key usage. Uses the anon key only.
 *
 * Machine-key endpoints (webhook/ingest/cron), public read APIs and public
 * pages are outside the matcher. Only routes that actually read a server-side
 * session pay for the token-refresh round trip.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Triggers a token refresh when the access token is expired and persists
  // the rotated tokens via setAll above. Never blocks rendering on failures.
  try {
    await supabase.auth.getUser();
  } catch {
    // Network hiccup or already-invalid session: pass through unchanged.
  }

  return supabaseResponse;
}

/**
 * Session-bound URL prefixes only (2026-11-06 Active CPU remediation).
 *
 * - /admin/**     admin UI; preview/[id] reads auth cookies on the server
 * - /api/admin/** requireAdmin
 * - /api/auth/**  login / logout / session. /api/auth/session is fetched by
 *                 AuthProvider on every public page; its cookie adapter in
 *                 lib/supabase/server-auth.ts is read-only, so it depends on
 *                 this proxy to persist the rotated token.
 *
 * Public pages and public read APIs have no server-side session dependency.
 * A Node.js proxy invocation is billed as Fluid Active CPU even when the page
 * itself is served from cache, so running it on public traffic is pure cost.
 *
 * Maintenance: any NEW route that reads a server-side session must be added
 * here, or that session dies after the first token expiry.
 */
export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/auth/:path*',
  ],
};
