import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // 🔍 环境变量自检
    console.log('[API Login] Environment check:');
    console.log('  - SUPABASE_URL length:', process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0);
    console.log('  - SUPABASE_ANON_KEY length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0);
    console.log('  - SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    console.log('[API Login] Attempting login for:', email);

    // Create response first (needed for cookie operations)
    const response = NextResponse.json({
      success: true,
    });

    // Create Supabase client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: any) {
            response.cookies.delete({
              name,
              ...options,
            });
          },
        },
      }
    );

    console.log('[API Login] Supabase client created, calling signInWithPassword...');

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 🔍 详细错误日志
      console.error('[Supabase Error] Full error object:', JSON.stringify(error, null, 2));
      console.error('[Supabase Error] Error name:', error.name);
      console.error('[Supabase Error] Error message:', error.message);
      console.error('[Supabase Error] Error status:', error.status);

      return NextResponse.json(
        {
          error: error.message,
          name: error.name,
          status: error.status,
        },
        { status: 401 }
      );
    }

    console.log('[API Login] Login successful! User:', data.user.email);
    console.log('[API Login] Session created:', !!data.session);

    // Session cookies are automatically set by Supabase client
    // Just return success with user info
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

  } catch (error: any) {
    // 🔍 捕获所有异常
    console.error('[API Login] Unexpected error:', error);
    console.error('[API Login] Error name:', error.name);
    console.error('[API Login] Error message:', error.message);
    console.error('[API Login] Error stack:', error.stack);

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        type: error.name,
      },
      { status: 500 }
    );
  }
}
