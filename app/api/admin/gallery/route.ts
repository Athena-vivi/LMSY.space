import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// POST - 图库入库
// 使用馆长客户端进行管理操作
export async function POST(request: NextRequest) {
  try {
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

    // 验证用户身份
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 双重身份校验：硬编码检查 Email
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (user.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // 检查是否为管理员（显式指定 schema，额外验证）
    const { data: adminCheck, error: adminError } = await supabaseAuth
      .schema('lmsy_archive')
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !adminCheck) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required' },
        { status: 400 }
      );
    }

    // Schema 锁定：明确指向 gallery 表
    const supabaseAdmin = getSupabaseAdmin();
    const results = [];

    for (const item of items) {
      const { data, error } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery')
        .insert({
          image_url: item.image_url,
          title: item.title,
          description: item.description || null,
          tag: item.tag || null,
          caption: item.caption || '',
          is_featured: item.is_featured || false,
          archive_number: item.archive_number || null,
          event_date: item.event_date || null,
          project_id: item.project_id || null,
          member_id: item.member_id || null,
          blur_data: item.blur_data || null,
          credits: item.credits || null,
          catalog_id: item.catalog_id || null,
          magazine_issue: item.magazine_issue || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting gallery item:', error);
        return NextResponse.json(
          { error: `Failed to insert item: ${error.message}` },
          { status: 500 }
        );
      }

      results.push(data);
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
