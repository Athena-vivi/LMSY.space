import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// POST - 用户登录
// 使用公共客户端进行身份验证
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');
    const supabaseUrl = rawUrl;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Create response first (needed for cookie operations)
    const response = NextResponse.json({
      success: true,
    });

    // 🔒 CRITICAL: Create Supabase client with proper cookie handling
    const supabase = createServerClient(
      supabaseUrl,
      anonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // 🔒 CRITICAL: Ensure cookies have proper path and samesite attributes
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
          remove(name: string, options: any) {
            response.cookies.delete({
              name,
              ...options,
              path: '/',
            });
          },
        },
      }
    );

    console.log('[LOGIN] Attempting sign in for:', email);

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[LOGIN] Sign in failed:', error.message);
      return NextResponse.json(
        {
          error: error.message,
          name: error.name,
          status: error.status,
        },
        { status: 401 }
      );
    }

    console.log('[LOGIN] ✅ Sign in successful for:', email);

    // 🔒 CRITICAL: Ensure cookies are set by accessing them
    // The cookies are automatically set by Supabase when signInWithPassword succeeds
    // We just need to ensure the response is returned properly

    // 返回完整的 session 数据，供客户端手动设置
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: data.session.user,
      } : null,
    }, {
      // 🔒 CRITICAL: Ensure response headers are properly set
      headers: {
        // Ensure the response allows cookies to be set
        'Set-Cookie': response.headers.get('Set-Cookie') || '',
      },
    });

  } catch (error: any) {
    console.error('[LOGIN] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        type: error.name,
      },
      { status: 500 }
    );
  }
}
