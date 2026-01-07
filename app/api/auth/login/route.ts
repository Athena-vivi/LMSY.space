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

    // Create response first (needed for cookie operations)
    const response = NextResponse.json({
      success: true,
    });

    // 使用 Service Role Key（如果可用）进行更强大的认证
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '');

    // 确保 URL 可用
    if (!rawUrl) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing NEXT_PUBLIC_SUPABASE_URL' },
        { status: 500 }
      );
    }

    const supabaseUrl = rawUrl;

    // 确保至少有一个 key 可用
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!serviceRoleKey && !anonKey) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // TypeScript non-null assertion is safe here because we checked both keys above
    const supabaseKey = (serviceRoleKey || anonKey)!;

    // Create Supabase client with cookie handling
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
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

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          name: error.name,
          status: error.status,
        },
        { status: 401 }
      );
    }

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
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        type: error.name,
      },
      { status: 500 }
    );
  }
}
