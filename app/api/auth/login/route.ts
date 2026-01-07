import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 🔍 最外层日志穿透
  console.log('='.repeat(60));
  console.log('[API Login] Request received');
  console.log('='.repeat(60));

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // 🔍 环境变量详细检查
    console.log('[API Login] Environment check:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('  - SUPABASE_URL length:', process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0);
    console.log('  - SUPABASE_URL trimmed:', process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
    console.log('  - SUPABASE_URL ends with slash:', process.env.NEXT_PUBLIC_SUPABASE_URL?.endsWith('/'));
    console.log('  - SUPABASE_ANON_KEY length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0);
    console.log('  - SUPABASE_ANON_KEY prefix:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
    console.log('  - SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    console.log('[API Login] Attempting login for:', email);

    // Create response first (needed for cookie operations)
    const response = NextResponse.json({
      success: true,
    });

    // 🔍 使用 Service Role Key（如果可用）进行更强大的认证
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, ''); // 移除末尾斜杠

    // 确保 URL 可用
    if (!rawUrl) {
      console.error('[API Login] ❌ No Supabase URL found!');
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
      console.error('[API Login] ❌ No Supabase credentials found!');
      console.error('[API Login] SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey?.substring(0, 20) + '...');
      console.error('[API Login] NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey?.substring(0, 20) + '...');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // TypeScript non-null assertion is safe here because we checked both keys above
    const supabaseKey = (serviceRoleKey || anonKey)!;

    console.log('[API Login] Creating Supabase client with:');
    console.log('  - URL:', supabaseUrl);
    console.log('  - Key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE_KEY' : 'ANON_KEY');
    console.log('  - Key length:', supabaseKey.length);

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

    console.log('[API Login] Supabase client created successfully');
    console.log('[API Login] Calling signInWithPassword...');

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 🔍 详细错误日志
      console.error('='.repeat(60));
      console.error('[Supabase Error] Full error object:', JSON.stringify(error, null, 2));
      console.error('[Supabase Error] Error name:', error.name);
      console.error('[Supabase Error] Error message:', error.message);
      console.error('[Supabase Error] Error status:', error.status);
      console.error('[Supabase Error] Error stack:', error.stack);
      console.error('='.repeat(60));

      return NextResponse.json(
        {
          error: error.message,
          name: error.name,
          status: error.status,
          details: JSON.stringify(error, null, 2),
        },
        { status: 401 }
      );
    }

    console.log('[API Login] ✅ Login successful!');
    console.log('[API Login] User:', data.user.email);
    console.log('[API Login] User ID:', data.user.id);
    console.log('[API Login] Session created:', !!data.session);
    console.log('[API Login] Session expires at:', data.session?.expires_at);

    // 🔍 Cookie 设置详情
    console.log('[API Login] Cookies set in response:');
    response.cookies.getAll().forEach(cookie => {
      console.log(`  - ${cookie.name}: domain=${cookie.domain}, path=${cookie.path}, httpOnly=${cookie.httpOnly}, secure=${cookie.secure}`);
    });

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
    // 🔍 捕获所有异常并打印完整堆栈
    console.error('='.repeat(60));
    console.error('[API Login] ❌ CATCH BLOCK - Unexpected error!');
    console.error('[API Login] Error name:', error.name);
    console.error('[API Login] Error message:', error.message);
    console.error('[API Login] Error stack trace:');
    console.error(error.stack);
    console.error('[API Login] Full error object:', JSON.stringify(error, null, 2));
    console.error('='.repeat(60));

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        type: error.name,
        stack: error.stack,
        details: JSON.stringify(error, null, 2),
      },
      { status: 500 }
    );
  }
}
