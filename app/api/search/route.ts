import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const searchTerm = query.trim().toLowerCase();

  try {
    // Search across multiple tables
    const [galleryResults, projectResults, scheduleResults] = await Promise.all([
      // Search gallery (images)
      supabase
        .from('gallery')
        .select('*')
        .or(`caption.ilike.%${searchTerm}%,tag.ilike.%${searchTerm}%`)
        .limit(10),

      // Search projects
      supabase
        .from('projects')
        .select('*')
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
        .limit(5),

      // Search schedule (events)
      supabase
        .from('schedule')
        .select('*')
        .or(`title.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
        .limit(5),
    ]);

    // Format results
    const results = [
      ...(galleryResults.data || []).map(item => ({
        id: `gallery-${item.id}`,
        type: 'gallery' as const,
        title: item.caption || 'Untitled',
        description: item.tag ? `#${item.tag}` : undefined,
        subtitle: item.tag || undefined,
        url: `/gallery#${item.id}`,
      })),

      ...(projectResults.data || []).map(item => ({
        id: `project-${item.id}`,
        type: 'project' as const,
        title: item.title,
        description: item.description,
        subtitle: `${item.category} • ${item.release_date ? new Date(item.release_date).getFullYear() : 'TBD'}`,
        url: `/projects/${item.id}`,
      })),

      ...(scheduleResults.data || []).map(item => ({
        id: `schedule-${item.id}`,
        type: 'schedule' as const,
        title: item.title,
        description: item.location,
        subtitle: item.event_date ? new Date(item.event_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) : undefined,
        url: '/schedule',
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
