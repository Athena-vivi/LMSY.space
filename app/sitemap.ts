import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://lookmheesonya-forever.com';

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/profiles`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/schedule`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  // Fetch dynamic routes from Supabase
  const [membersData, projectsData] = await Promise.all([
    supabase.from('members').select('id, updated_at'),
    supabase.from('projects').select('id, updated_at'),
  ]);

  // Dynamic profile routes
  const profileRoutes: MetadataRoute.Sitemap = (membersData.data || []).map((member) => ({
    url: `${baseUrl}/profiles/${member.id}`,
    lastModified: member.updated_at ? new Date(member.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Dynamic project routes
  const projectRoutes: MetadataRoute.Sitemap = (projectsData.data || []).map((project) => ({
    url: `${baseUrl}/projects/${project.id}`,
    lastModified: project.updated_at ? new Date(project.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...profileRoutes, ...projectRoutes];
}
