import { revalidatePath } from 'next/cache';

/**
 * On-demand ISR invalidation for every content door.
 *
 * Every door and every detail route under app/ is `revalidate = 300`: the
 * full route cache holds a rendered page for five minutes, so an admin write
 * used to stay invisible until the next rebuild (the documented workaround
 * was to push a commit and wait ~75s for a Vercel rebuild). Call this once
 * after a successful write and the next request re-renders the affected
 * doors straight from the database.
 *
 * Every door reads `projects` + `gallery_assets` (people/portrait feeds
 * `profiles`), so any admin route that writes those tables calls this once
 * on success. A door the write did not actually change only costs one
 * re-render; reading the row back to check its category first would be a
 * second round-trip for no benefit.
 *
 * Maintenance: a NEW door or detail route under app/ must be added to the
 * lists below, or its pages stay stale for up to five minutes after a write.
 *
 * Fail-safe by design: revalidatePath throws when called outside a
 * static-generation context ("Invariant: static generation store missing"),
 * and a cache invalidation must never break the caller's write - so every
 * call is guarded and failures are logged, never thrown.
 */

/** Static door pages (no params). */
const DOOR_PAGES = [
  '/dramas',
  '/live',
  '/talks',
  '/live-events',
  '/commercial',
  '/appearances',
  '/editorial',
  '/features',
  '/people',
  '/timeline',
] as const;

/**
 * Dynamic route patterns. The 'page' type makes Next invalidate every cached
 * render matching the pattern - one tag per route, not one per concrete path.
 */
const DOOR_PATTERNS: Array<{ path: string; type: 'layout' | 'page' }> = [
  { path: '/dramas/[slug]', type: 'page' },
  { path: '/dramas/[slug]/[event]', type: 'page' },
  { path: '/live/[subtype]', type: 'page' },
  { path: '/live/[subtype]/[entry]', type: 'page' },
  { path: '/talks/[category]', type: 'page' },
  { path: '/talks/[category]/[entry]', type: 'page' },
  { path: '/live-events/[subtype]', type: 'page' },
  { path: '/live-events/[subtype]/[event]', type: 'page' },
  { path: '/commercial/[event]', type: 'page' },
  { path: '/appearances/[subtype]', type: 'page' },
  { path: '/appearances/[subtype]/[event]', type: 'page' },
  { path: '/editorial/[id]', type: 'page' },
  { path: '/features/[slug]', type: 'page' },
  { path: '/people/[slug]', type: 'page' },
  { path: '/timeline/[year]', type: 'page' },
];

function revalidateOne(path: string, type?: 'layout' | 'page'): void {
  try {
    revalidatePath(path, type);
  } catch (err) {
    console.warn(
      `[CACHE] revalidatePath(${path}${type ? `, ${type}` : ''}) failed:`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Drop the ISR copies of every content door. Call after a successful admin
 * write to projects / gallery_assets / profiles. Never throws.
 */
export function revalidateContentSurfaces(): void {
  for (const path of DOOR_PAGES) {
    revalidateOne(path);
  }
  for (const { path, type } of DOOR_PATTERNS) {
    revalidateOne(path, type);
  }
}
