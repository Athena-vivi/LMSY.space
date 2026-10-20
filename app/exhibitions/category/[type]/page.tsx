import { redirect } from 'next/navigation';
import { categoryHref, normalizeCategory } from '@/lib/category-registry';

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
  // Halls with their own front door go there; the rest still land on the
  // filtered index. /projects no longer carries the five homepage halls, so a
  // hard-coded /projects?category= would now answer with an empty list.
  redirect(category ? categoryHref(category) : '/projects');
}
