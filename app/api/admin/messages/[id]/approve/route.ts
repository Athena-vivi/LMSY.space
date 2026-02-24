import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// PATCH - 批准或拒绝留言
// 使用馆长客户端进行管理操作
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') || '';

    // 使用 SSR 客户端进行身份验证（Schema 锁定到 lmsy_archive）
    const supabaseAuth = createServerClient(
      rawUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
        db: {
          schema: 'lmsy_archive',
        },
      }
    );

    // 验证用户是否为管理员
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 检查是否为管理员（两种方式：admin_users 表或邮箱匹配）
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

    // 方式1: 检查 admin_users 表
    const { data: adminCheck, error: adminError } = await supabaseAuth
      .schema('lmsy_archive')
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    // 方式2: 邮箱匹配（作为后备方案）
    const isEmailAdmin = adminEmail && user.email === adminEmail;

    if (adminError || !adminCheck) {
      // 如果 admin_users 检查失败，尝试邮箱匹配
      if (!isEmailAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { is_approved } = body;

    if (typeof is_approved !== 'boolean') {
      return NextResponse.json(
        { error: 'is_approved must be a boolean' },
        { status: 400 }
      );
    }

    // 更新留言状态（显式指定 schema）
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('messages')
      .update({ is_approved })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating message:', error);
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: is_approved ? 'Message approved' : 'Message unapproved',
      data,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - 删除留言
// 使用馆长客户端进行管理操作
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') || '';

    // 使用 SSR 客户端进行身份验证（Schema 锁定到 lmsy_archive）
    const supabaseAuth = createServerClient(
      rawUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
        db: {
          schema: 'lmsy_archive',
        },
      }
    );

    // 验证用户是否为管理员
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 检查是否为管理员（两种方式：admin_users 表或邮箱匹配）
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

    // 方式1: 检查 admin_users 表
    const { data: adminCheck, error: adminError } = await supabaseAuth
      .schema('lmsy_archive')
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    // 方式2: 邮箱匹配（作为后备方案）
    const isEmailAdmin = adminEmail && user.email === adminEmail;

    if (adminError || !adminCheck) {
      // 如果 admin_users 检查失败，尝试邮箱匹配
      if (!isEmailAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
    }

    // 删除留言（显式指定 schema）
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting message:', error);
      return NextResponse.json(
        { error: 'Failed to delete message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
