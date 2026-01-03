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
}

/**
 * 合并并排序所有时间轴数据
 */
export async function getAllTimelineEvents(): Promise<TimelineEvent[]> {
  // 这里需要从实际的数据源获取
  // 暂时返回示例数据结构
  const events: TimelineEvent[] = [
    {
      id: '1',
      date: '2024-12-31',
      eventDate: '2024.12.31',
      title: 'Affair Series Premiere',
      type: 'schedule',
      archiveNumber: 'LMSY-S-001',
      description: 'The first episode of Affair airs on GMMTV',
      href: '/schedule',
    },
    {
      id: '2',
      date: '2024-12-25',
      eventDate: '2024.12.25',
      title: 'Christmas Special Photoshoot',
      type: 'gallery',
      archiveNumber: 'LMSY-G-001',
      description: 'Exclusive holiday photoshoot for Besties',
      thumbnail: '/lmsy-001.jpg',
      href: '/gallery',
    },
    {
      id: '3',
      date: '2024-12-20',
      eventDate: '2024.12.20',
      title: 'Behind The Scenes Documentary',
      type: 'project',
      archiveNumber: 'LMSY-P-001',
      description: 'Documentary short about the making of Affair',
      href: '/projects',
    },
  ];

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
