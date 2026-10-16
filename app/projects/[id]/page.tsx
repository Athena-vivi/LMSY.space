import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import ProjectDetailClient from './project-detail-client';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

interface ProjectGalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  catalog_id: string | null;
  category_tag: string | null;
  curator_note: string | null;
  is_featured: boolean;
  event_date: string | null;
  created_at: string;
  is_cover?: boolean | null;
  rotation?: number | null;
  sequence?: number | null;
}

// The page renders a shell plus the project's own images. Cache it at the edge
// and refresh every 5 minutes, so publishing in the admin panel shows up
// shortly without re-querying the database on every single page view.
export const revalidate = 300;

// Only the columns the detail view renders (the previous select('*') pulled
// excerpt/credits/i18n blobs the gallery grid never shows).
const PROJECT_GALLERY_COLUMNS =
  'id, image_url, caption, caption_i18n, catalog_id, category_tag, curator_note, is_featured, event_date, created_at, is_cover, rotation, sequence';

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
    .select('id, title, description')
    .eq('id', id)
    .or('curation_status.eq.published,curation_status.is.null')
    .maybeSingle();

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

  const sortProjectImages = (items: ProjectGalleryImage[]) => {
    return [...items].sort((a, b) => {
      const aCoverRank = a.is_cover || a.catalog_id?.endsWith('-000') ? 0 : 1;
      const bCoverRank = b.is_cover || b.catalog_id?.endsWith('-000') ? 0 : 1;
      if (aCoverRank !== bCoverRank) {
        return aCoverRank - bCoverRank;
      }

      const seqA = typeof a.sequence === 'number' ? a.sequence : Number.MAX_SAFE_INTEGER;
      const seqB = typeof b.sequence === 'number' ? b.sequence : Number.MAX_SAFE_INTEGER;
      if (seqA !== seqB) {
        return seqA - seqB;
      }

      const catalogA = a.catalog_id || '';
      const catalogB = b.catalog_id || '';
      if (catalogA && catalogB && catalogA !== catalogB) {
        return catalogA.localeCompare(catalogB);
      }

      return (a.created_at || '').localeCompare(b.created_at || '');
    });
  };

  // Fetch project details
  // Public detail view: draft (candidate) and archived projects stay hidden.
  // NULL curation_status is legacy-published, keep it visible.
  const { data: project, error: projectError } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .eq('id', id)
    .or('curation_status.eq.published,curation_status.is.null')
    .maybeSingle();

  if (projectError || !project) {
    notFound();
  }

  // Fetch gallery images for this project
  const { data: galleryImages } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select(PROJECT_GALLERY_COLUMNS)
    .eq('project_id', id)
    .order('created_at', { ascending: true });

  const sortedGalleryImages = sortProjectImages(galleryImages || []);

  const coverRotation =
    sortedGalleryImages.find((img) => img.image_url === project.cover_url)?.rotation
    ?? sortedGalleryImages.find((img) => img.is_cover)?.rotation
    ?? sortedGalleryImages.find((img) => img.catalog_id?.endsWith('-000'))?.rotation
    ?? 0;

  // Group images by category
  const groupedImages = {
    all: sortedGalleryImages,
    official_stills: sortedGalleryImages.filter(img => !img.category_tag || img.category_tag === 'official_stills'),
    bts: sortedGalleryImages.filter(img => img.category_tag === 'bts'),
    press_events: sortedGalleryImages.filter(img => img.category_tag === 'press_events'),
  };

  return (
    <ProjectDetailClient
      project={{ ...project, cover_rotation: coverRotation }}
      images={groupedImages}
      categories={CATEGORIES}
    />
  );
}
