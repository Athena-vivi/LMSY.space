import Link from 'next/link';
import Image from 'next/image';
import { BackButton } from '@/components/back-button';
import { EditorialDetailContent } from './editorial-detail-content';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';

// 🚫 NO CACHE: Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Magazine {
  id: string;
  title: string;
  category: string;
  cover_url: string | null;
  release_date: string | null;
  description: string | null;
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
 * Fetch magazine data with dual-query strategy (UUID + catalog_id)
 * 🔒 IRON CURTAIN: NO DATE-BASED AUTO-ASSOCIATION
 */
async function getMagazineData(id: string): Promise<{
  magazine: Magazine | null;
  galleryImages: GalleryImage[];
}> {
  const supabaseAdmin = getSupabaseAdmin();

  console.log('[IRON_CURTAIN] ========== STRICT PHYSICAL LINKAGE ==========');
  console.log('[IRON_CURTAIN] 🔍 Input ID:', id);

  // STRATEGY 1: Try UUID lookup first
  console.log('[IRON_CURTAIN] 📡 Strategy 1: UUID lookup');
  const { data: projectByUuid, error: uuidError } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('category', 'editorial')
    .maybeSingle();

  let project: Magazine | null = null;

  if (!uuidError && projectByUuid) {
    console.log('[IRON_CURTAIN] ✅ Strategy 1 SUCCESS: Found by UUID');
    project = projectByUuid;
  } else {
    // STRATEGY 2: Try catalog_id lookup
    console.log('[IRON_CURTAIN] 📡 Strategy 2: catalog_id lookup');
    const { data: projectByCatalog, error: catalogError } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('*')
      .eq('catalog_id', id)
      .eq('category', 'editorial')
      .maybeSingle();

    if (!catalogError && projectByCatalog) {
      console.log('[IRON_CURTAIN] ✅ Strategy 2 SUCCESS: Found by catalog_id');
      project = projectByCatalog;
    } else {
      console.log('[IRON_CURTAIN] ❌ ALL STRATEGIES FAILED: Project not found');
      return { magazine: null, galleryImages: [] };
    }
  }

  console.log('[IRON_CURTAIN] 📊 Project found:', {
    id: project?.id,
    title: project?.title,
    catalog_id: project?.catalog_id,
    release_date: project?.release_date,
  });

  // 🔒 CRITICAL: STRICT PHYSICAL LINKAGE ONLY - NO DATE-BASED QUERIES
  console.log('[IRON_CURTAIN] 🔍 Fetching gallery via project_id ONLY...');

  // Type guard: project is guaranteed to be non-null here because we return early if null
  if (!project) {
    return { magazine: null, galleryImages: [] };
  }

  const { data: linkedImages, error: imagesError } = await supabaseAdmin
    .schema('lmsy_archive')
    .from('gallery')
    .select('id, image_url, caption, blur_data, catalog_id')
    .eq('project_id', project.id)  // 🚨 STRICT: Only physical foreign key linkage
    .order('catalog_id', { ascending: true });

  let galleryImages: GalleryImage[] = [];

  if (!imagesError && linkedImages && linkedImages.length > 0) {
    console.log(`[IRON_CURTAIN] ✅ Found ${linkedImages.length} physically linked images`);
    galleryImages = linkedImages;
  } else {
    console.log('[IRON_CURTAIN] ℹ️ No physically linked images found (this is OK)');
    // ❌ NO SELF-HEALING: Do NOT attempt date-based auto-association
    console.log('[IRON_CURTAIN] ❌ DATE-BASED AUTO-ASSOCIATION DISABLED');
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
  console.log('[IRON_CURTAIN] 🎯 Page loaded with ID:', id);

  const { magazine, galleryImages } = await getMagazineData(id);

  // 404 if project not found
  if (!magazine) {
    console.log('[IRON_CURTAIN] ❌ 404: Magazine not found');
    notFound();
  }

  return (
    <EditorialDetailContent
      magazine={magazine}
      galleryImages={galleryImages}
      selfHealed={false}  // ❌ Always false - no self-healing
    />
  );
}
