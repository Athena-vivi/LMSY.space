export interface TimelineEvent {
  id: string;
  date: string; // ISO date string
  eventDate: string; // Display date (e.g., "2024.12.31")
  title: string;
  type: 'gallery' | 'project' | 'schedule';
  archiveNumber: string; // 馆藏编号，如 "LMSY-G-001"
  description?: string;
  href: string; // Link to the content
  thumbnail?: string;
  imageUrl?: string; // Draft item image URL
  mediaType?: 'image' | 'video'; // Media type
}

/**
 * 合并并排序所有时间轴数据
 * 从 draft_items 表获取已发布的项目
 */
export async function getAllTimelineEvents(): Promise<TimelineEvent[]> {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdmin();

  // 获取已发布的草稿项目
  const { data: draftItems, error } = await supabase
    .from('draft_items')
    .select('*')
    .eq('status', 'published')
    .order('event_date', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('[TIMELINE] Failed to fetch draft items:', error);
    return [];
  }

  if (!draftItems || draftItems.length === 0) {
    return [];
  }

  // 转换为时间轴事件格式
  const events: TimelineEvent[] = draftItems.map((item, index) => {
    // 使用 event_date 或 created_at
    const date = item.event_date || item.created_at;
    const dateObj = new Date(date);

    // 格式化显示日期 YYYY.MM.DD
    const eventDate = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;

    // 生成馆藏编号 LMSY-D-XXX
    const archiveNumber = `LMSY-D-${String(index + 1).padStart(3, '0')}`;

    // 获取标题（多语言回退）
    const title = item.title?.en || item.title?.zh || item.title?.th || 'Untitled';

    return {
      id: item.id,
      date,
      eventDate,
      title,
      type: 'gallery' as const,
      archiveNumber,
      description: item.description?.en || item.description?.zh || item.description?.th || undefined,
      href: `/chronicle`, // 链接到 Chronicle 页面
      imageUrl: item.r2_media_url || undefined,
      mediaType: item.media_type === 'video' ? 'video' : 'image',
    };
  });

  // 按日期倒序排序（最新的在前）
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * 根据类型获取图标颜色
 */
export function getTypeColor(type: TimelineEvent['type']): string {
  switch (type) {
    case 'gallery':
      return 'text-lmsy-yellow';
    case 'project':
      return 'text-lmsy-blue';
    case 'schedule':
      return 'text-foreground';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * 根据类型获取图标组件名称
 */
export function getTypeIcon(type: TimelineEvent['type']): string {
  switch (type) {
    case 'gallery':
      return 'Image';
    case 'project':
      return 'Film';
    case 'schedule':
      return 'Calendar';
    default:
      return 'Circle';
  }
}
