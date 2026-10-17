import Link from 'next/link';
import Image from 'next/image';
import { BackButton } from '@/components/back-button';
import { EditorialDetailContent } from './editorial-detail-content';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { notFound } from 'next/navigation';
import type { LocalizedText } from '@/lib/localized-content';

// 🚫 NO CACHE: Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Magazine {
  id: string;
  title: string;
  title_i18n?: LocalizedText | null;
  category: string;
  cover_url: string | null;
  release_date: string | null;
  description: string | null;
  description_i18n?: LocalizedText | null;
  catalog_id: string | null;
  blur_data: string | null;
}

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  blur_data: string | null;
  catalog_id: string | null;
}

/**
 * Fetch magazine data with dual-query strategy (UUID + catalog_id).
 * 🔒 IRON CURTAIN: NO DATE-BASED AUTO-ASSOCIATION.
 * Both lookups apply the shared public-visibility rule (see
 * lib/project-visibility.ts), so back-end containers never resolve as
 * editorial detail pages.
 */
async function getMagazineData(id: string): Promise<{
  magazine: Magazine | null;
  galleryImages: GalleryImage[];
}> {
  const supabaseAdmin = getSupabaseAdmin();

  // STRATEGY 1: Try UUID lookup first
  const { data: projectByUuid, error: uuidError } = await applyPublicProjectFilter(
    supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('category', 'editorial')
  ).maybeSingle();

  let project: Magazine | null = null;

  if (!uuidError && projectByUuid) {
    project = projectByUuid;
  } else {
    // STRATEGY 2: Try catalog_id lookup
    const { data: projectByCatalog, error: catalogError } = await applyPublicProjectFilter(
      supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select('*')
        .eq('catalog_id', id)
        .eq('category', 'editorial')
    ).maybeSingle();

    if (!catalogError && projectByCatalog) {
      project = projectByCatalog;
    } else {
      return { magazine: null, galleryImages: [] };
    }
  }

  // Type guard: project is guaranteed to be non-null here because we return early if null
  if (!project) {
    return { magazine: null, galleryImages: [] };
  }

  // 🔒 CRITICAL: STRICT PHYSICAL LINKAGE ONLY - NO DATE-BASED QUERIES
  const { data: linkedImages, error: imagesError } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('gallery_assets')
    .select('id, image_url, caption, blur_data, catalog_id')
    .eq('project_id', project.id)  // 🚨 STRICT: Only physical foreign key linkage
    .order('catalog_id', { ascending: true });

  let galleryImages: GalleryImage[] = [];

  if (!imagesError && linkedImages && linkedImages.length > 0) {
    // ❌ NO SELF-HEALING: Do NOT attempt date-based auto-association
    galleryImages = linkedImages;
  }

  return { magazine: project, galleryImages };
}

export default async function EditorialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 🔒 CRITICAL: Use await params for Next.js 15+
  const { id } = await params;

  const { magazine, galleryImages } = await getMagazineData(id);

  // 404 if project not found or not visitor-visible
  if (!magazine) {
    notFound();
  }

  return (
    <EditorialDetailContent
      magazine={magazine}
      galleryImages={galleryImages}
    />
  );
}
