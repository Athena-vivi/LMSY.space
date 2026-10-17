/**
 * Single source of truth for which back-end projects may appear on the
 * front-end.
 *
 * Back-end "projects" are management containers: ingestion batches
 * (auto-created by the radar/draft flows, which always set
 * portal_visible = false), milestone archives, and curated works. They
 * exist so the site owner can organize content efficiently - they are
 * NOT visitor-facing categories by default.
 *
 * The data model already carries the display-control fields
 * (portal_visible / curation_status, managed in the admin edit-project
 * modal). Front-end surfaces must honour them instead of inventing
 * proxy rules such as "has gallery assets" or "category matches".
 *
 * Rule: a project is visitor-visible only when the admin explicitly
 * opted it in (portal_visible === true) and it is not retired
 * (curation_status !== 'archived').
 *
 * Every front-end read of the projects table goes through this module
 * (list, detail, exhibition categories, editorial, search, sitemap,
 * homepage portal images).
 */

export interface PublicProjectShape {
  portal_visible?: boolean | null;
  curation_status?: string | null;
}

/** Client-side predicate for an already-fetched project row. */
export function isPublicProject(
  project: PublicProjectShape | null | undefined
): boolean {
  if (!project) return false;
  if (project.portal_visible !== true) return false;
  return project.curation_status !== 'archived';
}

/**
 * Structural minimum of a Supabase query builder, so this helper works
 * with both the browser client and the admin client without importing
 * their builder types.
 */
interface VisibilityQuery {
  eq(column: string, value: unknown): VisibilityQuery;
  neq(column: string, value: unknown): VisibilityQuery;
}

/**
 * Apply the public-visibility rule to a `projects` query. Usage:
 *
 *   const { data } = await applyPublicProjectFilter(
 *     supabase.schema('lmsy_archive').from('projects').select('...')
 *   );
 */
export function applyPublicProjectFilter<T extends object>(query: T): T {
  const q = query as unknown as VisibilityQuery;
  const filtered = q
    .eq('portal_visible', true)
    .neq('curation_status', 'archived');
  return filtered as unknown as T;
}
