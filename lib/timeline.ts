import type { LocalizedText } from '@/lib/localized-content';
import { normalizeLocalizedText } from '@/lib/localized-content';

export interface TimelineEvent {
  id: string;
  date: string;
  eventDate: string;
  title: string;
  titleI18n?: LocalizedText;
  type: 'gallery' | 'project' | 'schedule';
  archiveNumber: string;
  description?: string;
  descriptionI18n?: LocalizedText;
  href: string;
  thumbnail?: string;
  imageUrl?: string;
  mediaType?: 'image' | 'video';
}

export async function getAllTimelineEvents(): Promise<TimelineEvent[]> {
  const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdmin();

  const { data: draftItems, error } = await supabase
    .from('draft_items')
    .select('*')
    .eq('status', 'published')
    .eq('chronicle_visible', true)
    .order('event_date', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('[TIMELINE] Failed to fetch draft items:', error);
    return [];
  }

  if (!draftItems || draftItems.length === 0) {
    return [];
  }

  const events: TimelineEvent[] = draftItems.map((item, index) => {
    const date = item.event_date || item.created_at;
    const dateObj = new Date(date);
    const eventDate = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;
    const archiveNumber = `LMSY-D-${String(index + 1).padStart(3, '0')}`;

    const titleI18n = normalizeLocalizedText(
      item.chronicle_title_i18n || item.title,
      item.chronicle_title || item.title?.en || item.title?.zh || item.title?.th || 'Untitled'
    );
    const descriptionI18n = normalizeLocalizedText(
      item.chronicle_excerpt_i18n || item.description,
      item.chronicle_excerpt || item.description?.en || item.description?.zh || item.description?.th || ''
    );

    return {
      id: item.id,
      date,
      eventDate,
      title: titleI18n.en || titleI18n.zh || titleI18n.th || 'Untitled',
      titleI18n,
      type: 'gallery',
      archiveNumber,
      description: descriptionI18n.en || descriptionI18n.zh || descriptionI18n.th || undefined,
      descriptionI18n,
      href: '/chronicle',
      imageUrl: item.r2_media_url || undefined,
      mediaType: item.media_type === 'video' ? 'video' : 'image',
    };
  });

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

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
