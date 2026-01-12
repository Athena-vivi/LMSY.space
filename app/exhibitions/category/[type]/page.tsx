import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { ExhibitionContent } from './exhibition-content';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

interface ExhibitionPageProps {
  params: Promise<{
    type: string;
  }>;
}

// Type to category/tag mapping
const typeMapping: Record<string, { category?: string; title: string; description: string }> = {
  drama: {
    category: 'series',
    title: 'DRAMA ARCHIVE',
    description: 'Television series and dramatic works featuring LMSY',
  },
  stage: {
    category: 'appearance',
    title: 'STAGE PRESENCE',
    description: 'Live performances, events, and public appearances',
  },
  travel: {
    category: 'travel',
    title: 'TRAVEL JOURNALS',
    description: 'Adventures and journeys across different landscapes',
  },
  daily: {
    category: 'daily',
    title: 'DAILY MOMENTS',
    description: 'Everyday moments and behind-the-scenes glimpses',
  },
  commercial: {
    category: 'commercial',
    title: 'COMMERCIAL',
    description: 'Brand collaborations, endorsements, and where inspiration meets value',
  },
};

// Generate static params for all valid types
export async function generateStaticParams() {
  return Object.keys(typeMapping).map((type) => ({
    type,
  }));
}

export async function generateMetadata({ params }: ExhibitionPageProps): Promise<Metadata> {
  const { type } = await params;
  const mapping = typeMapping[type];

  if (!mapping) {
    return {
      title: 'Exhibition Not Found',
    };
  }

  return {
    title: `${mapping.title} | LMSY Exhibition`,
    description: mapping.description,
  };
}

export interface ProjectWithImage {
  id: string;
  title: string;
  category: string;
  release_date: string | null;
  start_date: string | null;
  end_date: string | null;
  is_ongoing: boolean | null;
  tags: string[] | null;
  cover_url: string | null;
  displayImage: string | null;
}

export default async function ExhibitionPage({ params }: ExhibitionPageProps) {
  const { type } = await params;

  // Debug logging
  console.log('[ROUTE_CHECK] Rendering category:', type);
  console.log('[ROUTE_CHECK] Available mappings:', Object.keys(typeMapping));

  const mapping = typeMapping[type];

  if (!mapping) {
    console.log('[ROUTE_CHECK] No mapping found for type:', type);
    notFound();
  }

  console.log('[ROUTE_CHECK] Mapping found:', mapping);

  // Query projects based on type
  const supabaseAdmin = getSupabaseAdmin();

  let query = supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .order('release_date', { ascending: false });

  // Apply category filter (direct category query, no tag filtering)
  if (mapping.category) {
    query = query.eq('category', mapping.category);
  }

  const { data: projects } = await query;

  console.log('[ROUTE_CHECK] Projects found:', projects?.length || 0);
  console.log('[ROUTE_CHECK] Category filter:', mapping.category);

  // No tag filtering needed - direct category queries
  const filteredProjects = projects || [];

  // For projects without covers, fetch associated gallery images
  const projectIds = filteredProjects.map((p) => p.id);
  const { data: galleryImages } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('gallery')
    .select('project_id, image_url, catalog_id')
    .in('project_id', projectIds.length > 0 ? projectIds : ['__empty__'])
    .limit(1);

  // Create a map of project_id to image_url
  const imageMap = new Map();
  galleryImages?.forEach((img) => {
    if (!imageMap.has(img.project_id)) {
      imageMap.set(img.project_id, img.image_url);
    }
  });

  // Merge covers with project data
  const projectsWithImages: ProjectWithImage[] = filteredProjects.map((project) => ({
    ...project,
    displayImage: project.cover_url || imageMap.get(project.id) || null,
  }));

  // Pass data to client component
  return (
    <ExhibitionContent
      mapping={mapping}
      projects={projectsWithImages}
      type={type}
    />
  );
}
