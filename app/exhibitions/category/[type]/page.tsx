import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getImageUrl } from '@/lib/image-url';
import Image from 'next/image';
import Link from 'next/link';
import { NebulaBackground } from '@/components/nebula-background';
import { motion } from 'framer-motion';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

interface ExhibitionPageProps {
  params: Promise<{
    type: string;
  }>;
}

// Type to category/tag mapping
const typeMapping: Record<string, { category?: string; tag?: string; title: string; description: string }> = {
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
    category: 'journal',
    tag: 'travel',
    title: 'TRAVEL JOURNALS',
    description: 'Adventures and journeys across different landscapes',
  },
  daily: {
    category: 'journal',
    tag: 'daily',
    title: 'DAILY MOMENTS',
    description: 'Everyday moments and behind-the-scenes glimpses',
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

  // Apply category filter
  if (mapping.category) {
    query = query.eq('category', mapping.category);
  }

  const { data: projects } = await query;

  console.log('[ROUTE_CHECK] Projects found:', projects?.length || 0);

  // Filter by tag if specified
  let filteredProjects = projects || [];
  if (mapping.tag) {
    filteredProjects = filteredProjects.filter((project) =>
      project.tags?.includes(mapping.tag)
    );
  }

  console.log('[ROUTE_CHECK] Filtered projects:', filteredProjects.length);

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
  const projectsWithImages = filteredProjects.map((project) => ({
    ...project,
    displayImage: project.cover_url || imageMap.get(project.id) || null,
  }));

  return (
    <>
      <NebulaBackground />
      <div className="min-h-screen py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Header */}
          <div className="mb-16 md:mb-24">
            <motion.h1
              className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              style={{
                background: 'linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(56, 189, 248) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {mapping.title}
            </motion.h1>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl">
              {mapping.description}
            </p>
            <div className="mt-8 flex items-center gap-4 text-sm text-white/40">
              <span>{filteredProjects.length} Projects</span>
              <span>•</span>
              <span>Archive Collection</span>
            </div>
          </div>

          {/* Asymmetric Grid Layout - Digital Magazine Style */}
          {projectsWithImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {projectsWithImages.map((project, index) => {
                // Create asymmetric layout pattern
                const isFirstLarge = index === 0;
                const isMiddleLarge = index === 3;
                const spanClass = isFirstLarge || isMiddleLarge ? 'md:col-span-2' : '';

                return (
                  <motion.div
                    key={project.id}
                    className={`${spanClass} group`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                  >
                    <Link href={`/projects/${project.id}`} className="block">
                      <div
                        className="relative overflow-hidden rounded-xl border"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          borderColor: 'rgba(255, 255, 255, 0.08)',
                          aspectRatio: isFirstLarge || isMiddleLarge ? '16/10' : '4/5',
                        }}
                      >
                        {/* Image */}
                        {project.displayImage ? (
                          <Image
                            src={getImageUrl(project.displayImage)}
                            alt={project.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-lmsy-yellow/10 to-lmsy-blue/10 flex items-center justify-center">
                            <span className="font-serif text-4xl font-bold bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                              {project.title.charAt(0)}
                            </span>
                          </div>
                        )}

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {/* Content */}
                        <div className="absolute inset-0 p-6 flex flex-col justify-end">
                          {/* Category Badge */}
                          <div className="mb-3">
                            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] font-mono tracking-wider uppercase text-white/80 border border-white/20">
                              {project.category}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="font-serif text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2">
                            {project.title}
                          </h3>

                          {/* Date */}
                          {project.release_date && (
                            <p className="text-white/60 text-sm">
                              {new Date(project.release_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          )}

                          {/* Tags */}
                          {project.tags && project.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {project.tags.slice(0, 3).map((tag: string) => (
                                <span
                                  key={tag}
                                  className="text-[10px] text-white/50 font-mono"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Hover Border Effect */}
                        <div className="absolute inset-0 rounded-xl border-2 border-transparent bg-gradient-to-r from-lmsy-yellow/30 via-lmsy-blue/30 to-lmsy-yellow/30 p-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div className="absolute inset-0 rounded-xl bg-background/0" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24">
              <p className="text-white/40 text-lg">No projects found in this category yet.</p>
              <Link
                href="/"
                className="inline-block mt-6 text-lmsy-yellow hover:text-lmsy-blue transition-colors"
              >
                Return Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
