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
 * Machine-key endpoints (webhook/ingest/cron) and static assets are excluded
 * from the matcher so public traffic never pays for session refresh.
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/ingest|api/cron|api/search|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|css|js|map|txt|xml)$).*)',
  ],
};
