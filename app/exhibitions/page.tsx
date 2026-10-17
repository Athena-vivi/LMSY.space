import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { EXHIBITION_CATEGORIES } from '@/lib/exhibition-categories';
import ExhibitionsIndex from './exhibitions-index';

// Counts must reflect the live database, never a cached snapshot.
export const dynamic = 'force-dynamic';

export default async function ExhibitionsPage() {
  // Public visibility (see lib/project-visibility.ts): counts and entries use
  // the same portal_visible / curation_status rule as the category pages, so a
  // hidden container can never inflate a category count.
  const supabaseAdmin = getSupabaseAdmin();
  const { data: projects } = await applyPublicProjectFilter(
    supabaseAdmin
      .schema('lmsy_archive')
      .from('projects')
      .select('id, category')
  );

  const counts: Record<string, number> = {};
  for (const cat of EXHIBITION_CATEGORIES) {
    counts[cat.type] = 0;
  }
  for (const p of projects || []) {
    const entry = EXHIBITION_CATEGORIES.find((c) => c.category === p.category);
    if (entry) counts[entry.type] += 1;
  }

  return <ExhibitionsIndex counts={counts} />;
}
