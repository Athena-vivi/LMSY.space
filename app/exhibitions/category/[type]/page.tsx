import { redirect } from 'next/navigation';
import { normalizeCategory } from '@/lib/category-registry';

/**
 * Legacy exhibition categories. Each one mapped to a projects.category value
 * under the old vocabulary, so the old type segment is translated through the
 * registry's alias table instead of keeping a second mapping.
 */
const LEGACY_TYPE_TO_CATEGORY: Record<string, string> = {
  drama: 'drama_work',
  stage: 'live_event',
  travel: 'public_appearance',
  daily: 'personal_travel',
  commercial: 'commercial',
  editorial: 'editorial',
};

export default async function ExhibitionCategoryRedirect({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const category = normalizeCategory(LEGACY_TYPE_TO_CATEGORY[type] ?? type);
  redirect(category ? `/projects?category=${category}` : '/projects');
}
