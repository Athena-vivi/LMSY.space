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

  // Create Supabase client for middleware
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

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes - require authentication AND admin email
  const protectedRoutes = ['/admin'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Login page - redirect to admin if already logged in as admin
  const isLoginPage = pathname === '/admin/login';

  if (isLoginPage) {
    if (session && isAdminEmail(session.user.email)) {
      // Already logged in as admin, redirect to admin dashboard
      return NextResponse.redirect(new URL('/admin/upload', req.url));
    }
    return res;
  }

  if (isProtectedRoute) {
    if (!session) {
      // Not authenticated, redirect to login page
      const redirectUrl = new URL('/admin/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Check if user email matches admin email
    if (!isAdminEmail(session.user.email)) {
      // Authenticated but not admin - redirect to home with error
      const url = new URL('/', req.url);
      url.searchParams.set('error', 'not_admin');
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
