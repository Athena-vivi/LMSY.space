import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

/**
 * Admin email check - compares user email with configured admin email
 */
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail) {
    console.error('NEXT_PUBLIC_ADMIN_EMAIL not configured');
    return false;
  }

  return email.toLowerCase() === adminEmail.toLowerCase();
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // IMPORTANT: Allow login page to be accessible without authentication
  if (pathname === '/admin/login') {
    // Create Supabase client to check if already logged in
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            res.cookies.delete({ name, ...options });
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    // If already logged in as admin, redirect to upload page
    if (session && isAdminEmail(session.user.email)) {
      return NextResponse.redirect(new URL('/admin/upload', req.url));
    }

    // Otherwise, allow access to login page
    return res;
  }

  // For all other /admin routes, require authentication
  if (pathname.startsWith('/admin')) {
    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            res.cookies.delete({ name, ...options });
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    // Check authentication
    if (!session) {
      // Not authenticated, redirect to login page
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    // Check if user is admin
    if (!isAdminEmail(session.user.email)) {
      // Authenticated but not admin - redirect to home
      return NextResponse.redirect(new URL('/?error=not_admin', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
