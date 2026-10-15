import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { apiServerError } from '@/lib/security/http';

/**
 * POST /api/auth/logout
 *
 * Clears the server-side Supabase session cookies.
 * The browser client additionally clears its own local session, but that is
 * not sufficient on its own: without this route the HttpOnly cookies used by
 * the API guards would stay valid until they expire.
 */
export async function POST(request: NextRequest) {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!rawUrl || !anonKey) {
      return apiServerError('auth/logout', 'Supabase credentials are not configured');
    }

    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(rawUrl, anonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set({
            name,
            value,
            ...options,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
          });
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.delete({ name, ...options, path: '/' });
        },
      },
    });

    const { error } = await supabase.auth.signOut();
    if (error) {
      // Log server-side, but still report success: the local session is gone.
      console.error('[AUTH] signOut reported an error:', error.message);
    }

    return response;
  } catch (error) {
    return apiServerError('auth/logout', error);
  }
}
