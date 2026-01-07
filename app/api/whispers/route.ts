import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - 获取已批准的留言
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(limit);

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

// POST - 提交新留言
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, author, location, color_pref } = body;

    // 验证必填字段
    if (!content || !author || !color_pref) {
      return NextResponse.json(
        { error: 'Missing required fields: content, author, color_pref' },
        { status: 400 }
      );
    }

    // 验证颜色偏好
    if (!['yellow', 'blue'].includes(color_pref)) {
      return NextResponse.json(
        { error: 'color_pref must be either "yellow" or "blue"' },
        { status: 400 }
      );
    }

    // 验证内容长度
    if (content.length < 1 || content.length > 500) {
      return NextResponse.json(
        { error: 'Content must be between 1 and 500 characters' },
        { status: 400 }
      );
    }

    // 验证作者名称长度
    if (author.length < 1 || author.length > 100) {
      return NextResponse.json(
        { error: 'Author name must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    // 验证位置长度（如果提供）
    if (location && location.length > 200) {
      return NextResponse.json(
        { error: 'Location must be less than 200 characters' },
        { status: 400 }
      );
    }

    // 插入留言
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          content: content.trim(),
          author: author.trim(),
          location: location?.trim() || null,
          color_pref,
          is_approved: false, // 默认未批准，需要管理员审核
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error inserting message:', error);
      return NextResponse.json(
        { error: 'Failed to submit message' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Message submitted successfully',
        data: {
          id: data.id,
          // 不返回完整数据，只返回确认信息
          content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
