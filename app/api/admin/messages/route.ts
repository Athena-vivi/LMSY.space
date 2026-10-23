import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';

// GET - 获取所有留言（包括待审核的）
// 使用馆长客户端进行管理操作
export async function GET(request: NextRequest) {
  try {
    // 统一鉴权：要求登录且为配置的 admin 邮箱（单一事实来源）
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    // 获取所有留言（显式指定 schema）
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'approved', 'all'
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabaseAdmin
      .schema('lmsy_archive')
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // 根据状态筛选
    if (status === 'pending') {
      query = query.eq('is_approved', false);
    } else if (status === 'approved') {
      query = query.eq('is_approved', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
