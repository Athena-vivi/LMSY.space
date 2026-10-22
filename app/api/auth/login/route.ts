import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { consumeRateLimit, resetRateLimit } from '@/lib/security/rate-limit';
import { apiServerError } from '@/lib/security/http';

/**
 * POST /api/auth/login
 *
 * Hardening applied in phase 1:
 * - Per-IP and per-IP+email rate limiting with lockout (brute force protection).
 * - Generic error responses: Supabase error names/messages/status are logged
 *   server-side but never returned to the caller (they leaked provider details
 *   and confirmed whether an email exists).
 * - Cookies remain HttpOnly + Secure + SameSite=Lax.
 */

// 10 attempts per IP+email per 10 minutes, then a 15 minute lockout.
const PER_IDENTITY = { limit: 10, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 };
// Coarse per-IP ceiling to stop spraying many accounts from one source.
const PER_IP = { limit: 30, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 };

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    let body: { email?: unknown; password?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);

    // --- Rate limiting (checked before any credential work) ---
    const identityKey = `login:${ip}:${email}`;
    const ipKey = `login-ip:${ip}`;

    const identityLimit = consumeRateLimit(identityKey, PER_IDENTITY);
    if (!identityLimit.allowed) {
      console.warn(`[LOGIN] rate limited (identity) ip=${ip}`);
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(identityLimit.retryAfterSeconds) } }
      );
    }

    const ipLimit = consumeRateLimit(ipKey, PER_IP);
    if (!ipLimit.allowed) {
      console.warn(`[LOGIN] rate limited (ip) ip=${ip}`);
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }

    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');
    const supabaseUrl = rawUrl;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return apiServerError('auth/login', 'Supabase credentials are not configured');
    }

    // Create response first (needed for cookie operations)
    const response = NextResponse.json({ success: true });

    // Create Supabase client with cookie handling
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set({
            name,
            value,
            ...options,
            path: '/', // Ensure cookie is available site-wide
            sameSite: 'lax', // Required for auth cookies
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
          });
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.delete({
            name,
            ...options,
            path: '/',
          });
        },
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Full provider detail stays in the server log only.
      console.warn(`[LOGIN] failed ip=${ip} status=${error.status ?? 'n/a'}: ${error.message}`);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Successful login clears the failure counters for this identity.
    resetRateLimit(identityKey);
    console.log('[LOGIN] success');

    return (() => {
      const finalResponse = NextResponse.json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        // Kept for the existing admin UI, which sends the access token as a
        // Bearer credential to admin APIs. Cookie auth works in parallel.
        session: data.session
          ? {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
              user: data.session.user,
            }
          : null,
      });

      // Auth cookies MUST be appended one header line each. Reading them with
      // headers.get('Set-Cookie') returns a single comma-joined string, which
      // browsers do not split (RFC 6265) - the session cookies were silently
      // dropped, so /api/auth/session always answered isAdmin:false and the
      // admin layout redirected the owner back to the public site.
      const authCookies = response.headers.getSetCookie?.() ?? [];
      for (const cookie of authCookies) {
        finalResponse.headers.append('Set-Cookie', cookie);
      }

      return finalResponse;
    })();
  } catch (error) {
    return apiServerError('auth/login', error);
  }
}
