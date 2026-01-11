import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ProjectClient from './project-client';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: project } = await supabase
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
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !project) {
    notFound();
  }

  return <ProjectClient project={project} />;
}
