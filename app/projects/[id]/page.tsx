import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import ProjectDetailClient from './project-detail-client';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// Tab categories configuration
export const CATEGORIES = [
  { value: 'all', label: 'ALL' },
  { value: 'official_stills', label: 'OFFICIAL_STILLS' },
  { value: 'bts', label: 'BEHIND_THE_SCENES' },
  { value: 'press_events', label: 'PRESS_EVENTS' },
] as const;

export type CategoryType = typeof CATEGORIES[number]['value'];

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabaseAdmin = getSupabaseAdmin();

  const { data: project } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (!project) {
    return {
      title: 'Project Not Found | LMSY',
    };
  }

  return {
    title: `${project.title} | LMSY Official Fan Site`,
    description: project?.description || `Learn more about ${project.title}`,
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const supabaseAdmin = getSupabaseAdmin();

  // Fetch project details
  const { data: project, error: projectError } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    notFound();
  }

  // Fetch gallery images for this project
  const { data: galleryImages } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('gallery')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true });

  // Group images by category
  const groupedImages = {
    all: galleryImages || [],
    official_stills: (galleryImages || []).filter(img => !img.category_tag || img.category_tag === 'official_stills'),
    bts: (galleryImages || []).filter(img => img.category_tag === 'bts'),
    press_events: (galleryImages || []).filter(img => img.category_tag === 'press_events'),
  };

  return (
    <ProjectDetailClient
      project={project}
      images={groupedImages}
      categories={CATEGORIES}
    />
  );
}
