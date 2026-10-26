/**
 * Phase-4 batch 2 tests: public-content rules & timeline rework.
 * - Chronicle data source: no draft_items, no LMSY-D array-index numbers
 * - Chronicle year param parsing helpers
 * - Resonance: no fabricated track data / fake player
 * - Gallery: visibility gate present in the asset query
 * - Editorial canonical entry wiring (projects detail redirect + search)
 * - Homepage portals: hasWork gate for zero-work categories
 *
 * DB-coupled behaviour (actual filtering) is verified by live smoke checks;
 * here we assert the contracts that live in source + pure helpers.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p: string) => readFileSync(path.join(ROOT, p), 'utf-8');

// ---- lib/timeline pure helpers -------------------------------------------
import { formatChronicleDate, extractYears } from '../lib/chronicle-dates.ts';
import type { ChronicleEvent } from '../lib/timeline.ts';

describe('chronicle date helpers', () => {
  test('formatChronicleDate renders YYYY.MM.DD', () => {
    assert.equal(formatChronicleDate('2025-11-08'), '2025.11.08');
    assert.equal(formatChronicleDate('2024-01-02'), '2024.01.02');
  });

  test('extractYears returns unique years, newest first', () => {
    const events = [
      { date: '2025-03-01' },
      { date: '2024-11-02' },
      { date: '2025-12-31' },
      { date: '2024-01-01' },
    ] as unknown as ChronicleEvent[];
    assert.deepEqual(extractYears(events), ['2025', '2024']);
  });

  test('extractYears on empty timeline is empty', () => {
    assert.deepEqual(extractYears([]), []);
  });
});

// ---- Chronicle data source contract ---------------------------------------
describe('chronicle data source', () => {
  const timelineSrc = src('lib/timeline.ts');

  test('no longer reads draft_items', () => {
    assert.ok(!timelineSrc.includes('draft_items'), 'timeline must not touch draft_items');
    assert.ok(!timelineSrc.includes("status', 'published'"), 'no published-draft filter');
  });

  test('no array-index entry numbers (LMSY-D)', () => {
    assert.ok(!timelineSrc.includes('LMSY-D'), 'synthetic LMSY-D numbers are retired');
    assert.ok(!timelineSrc.includes('archiveNumber'), 'archiveNumber field removed');
  });

  test('uses the shared public visibility filter', () => {
    // The read moved into lib/data/projects.ts (listPublicTimelineProjects),
    // which is where the shared rule is applied now. Both layers are pinned so
    // the rule cannot be dropped by editing only one of them.
    assert.ok(timelineSrc.includes('listPublicTimelineProjects'), 'reads through the repository');
    assert.ok(
      src('lib/data/projects.ts').includes('listPublicTimelineProjects'),
      'the repository owns the read'
    );
    assert.ok(
      src('lib/data/projects.ts').includes('applyPublicProjectFilter'),
      'the repository applies the shared visibility rule'
    );
  });

  test('every event is dated and addressed by its own door', () => {
    // 2026-10-21: /projects is gone from the front end. An event is opened at
    // the address its door gives it, and a row without one is not listed.
    assert.ok(timelineSrc.includes('entryPath('), 'addresses come from lib/entry-path');
    assert.ok(!timelineSrc.includes('/projects/'), 'no /projects namespace left');
    assert.ok(timelineSrc.includes('if (!href) continue;'), 'a row with no page is skipped');
  });

  test('dates come from event_date, with release_date only as a fallback', () => {
    assert.ok(timelineSrc.includes('(p.event_date || p.release_date)'), 'event_date first');
    assert.ok(!timelineSrc.includes('const date = (p.release_date'),
      'release_date alone must not date an event');
    // The row is typed now, so the columns come from the repository's select.
    assert.ok(
      src('lib/data/projects.ts').includes('listPublicTimelineProjects'),
      'the repository selects both date columns'
    );
  });

  test('image group ids are stable db-derived combinations', () => {
    assert.ok(timelineSrc.includes('`assets-${projectId}-${date}`') || timelineSrc.includes("'assets-${projectId}-${date}'") || /assets-\$\{projectId\}/.test(timelineSrc));
  });
});

// ---- Chronicle page year filter -------------------------------------------
describe('timeline page year filter', () => {
  test('accepts only a strict 4-digit year', () => {
    const pageSrc = src('app/(en)/timeline/page.tsx');
    assert.ok(pageSrc.includes("/^\\d{4}$/"), 'year param must be validated');
    assert.ok(pageSrc.includes('searchParams'), 'page must consume searchParams');
    assert.ok(pageSrc.includes('availableYears'), 'page passes available years to chrome');
  });

  test('/timeline/[year] validates the segment and 404s otherwise', () => {
    const yearSrc = src('app/(en)/timeline/[year]/page.tsx');
    assert.ok(yearSrc.includes("notFound()"), 'malformed year is a 404');
  });

  test('/chronicle is retired, not forwarded', () => {
    // 2026-10-21: no redirect table at all - the old name simply 404s, and
    // nothing on the site links to it.
    assert.throws(() => src('app/chronicle/page.tsx'), 'the redirect-only route is deleted');
    const source = src('next.config.ts');
    assert.ok(!source.includes('async redirects('), 'next.config has no redirect table');
  });
});

// ---- Resonance Coming Soon -------------------------------------------------
describe('resonance coming soon', () => {
  const resonanceSrc = src('app/(en)/resonance/page.tsx');

  test('no fabricated track data', () => {
    assert.ok(!resonanceSrc.includes('musicTracks'), 'mock track array removed');
    assert.ok(!resonanceSrc.includes('BPM'), 'fake BPM removed');
    assert.ok(!resonanceSrc.includes("duration: '"), 'fake durations removed');
    assert.ok(!resonanceSrc.includes('/images/music/'), 'dead cover paths removed');
  });

  test('no fake player interactions', () => {
    assert.ok(!resonanceSrc.includes('selectedTrack'), 'track selection state removed');
    assert.ok(!resonanceSrc.includes('Progress Bar'), 'fake progress bar removed');
    assert.ok(!resonanceSrc.includes('audio-player'), 'does not borrow the audio player component');
  });

  test('keeps the route honest: Coming Soon in all languages', () => {
    // 2026-10-25: locale strings split into per-language files; pt-BR added.
    const languages = ['en', 'zh', 'th', 'es', 'pt']
      .map((locale) => src(`lib/languages/${locale}.ts`))
      .join('\n');
    assert.ok(languages.includes("'resonance.comingSoon': 'Coming Soon'"));
    assert.ok(languages.includes("'resonance.comingSoon': '即将上线'"));
    assert.ok(languages.includes("'resonance.comingSoon': 'เร็วๆ นี้'"));
    assert.ok(languages.includes("'resonance.comingSoon': 'Próximamente'"));
    assert.ok(languages.includes("'resonance.comingSoon': 'Em breve'"));
  });
});

// ---- Gallery visibility gate ------------------------------------------------
describe('gallery visibility gate', () => {
  test('asset query is constrained to publicly visible projects', () => {
    // 2026-10-25: gallery went SSR-first; the query lives in lib/gallery-data.ts.
    const gallerySrc = src('lib/gallery-data.ts');
    assert.ok(gallerySrc.includes('applyPublicProjectFilter'), 'reuses the shared visibility filter');
    assert.ok(gallerySrc.includes(".in('project_id', projectIds)"), 'assets filtered by visible project ids');
    assert.ok(gallerySrc.includes('fetchPublicProjectIds'), 'id set fetched through the rule');
  });

  test('fail-closed when the id set cannot be resolved', () => {
    const gallerySrc = src('lib/gallery-data.ts');
    assert.ok(gallerySrc.includes('projectIds.length === 0'), 'empty id set short-circuits to an empty result');
  });
});

// ---- One canonical project detail -------------------------------------------
describe('single event detail surface', () => {
  test('the workbench renderer moved behind /admin', () => {
    // 2026-10-21: the public site has no /projects namespace. The rich detail
    // renderer survives as the admin preview; "project" is an admin word.
    const pageSrc = src('app/(en)/admin/preview/[id]/page.tsx');
    // The slug-then-uuid lookup moved into lib/data/projects.ts
    // (getProjectBySlugOrId); both layers are pinned here so the guarantee
    // survives either file being edited.
    assert.ok(pageSrc.includes('getProjectBySlugOrId'), 'the page resolves through the repository');
    const repoSrc = src('lib/data/projects.ts');
    assert.ok(repoSrc.includes('getProjectBySlugOrId'), 'the repository owns the lookup');
    assert.ok(repoSrc.includes("eq('slug'"), 'slug is tried first');
    assert.ok(repoSrc.includes("eq('id'"), 'uuid is tried when the key looks like one');
    assert.ok(!pageSrc.includes('redirect('), 'a preview does not jump elsewhere');
    assert.throws(() => src('app/projects/[id]/page.tsx'), 'the public detail route is deleted');
  });

  test('/editorial/<slug> opens the issue itself', () => {
    // Until 2026-10-21 this forwarded to /projects/<id>. An issue is an entry,
    // and an entry owns an address under its door.
    const legacy = src('app/(en)/editorial/[id]/page.tsx');
    assert.ok(legacy.includes('loadEditorialIssue'), 'reads the issue instead of forwarding');
    assert.ok(!legacy.includes('redirect('), 'no second address for the same issue');
  });

  test('preview related cards stay inside the preview', () => {
    const clientSrc = src('app/(en)/admin/preview/[id]/project-detail-client.tsx');
    assert.ok(clientSrc.includes('`/admin/preview/${related.id}`'));
  });

  test('there is no public project index any more', () => {
    assert.throws(() => src('app/projects/page.tsx'), 'the index is deleted');
    assert.throws(() => src('app/projects/projects-client.tsx'), 'its client is deleted');
  });

  test('search results follow the same rule', () => {
    const searchSrc = src('app/api/search/route.ts');
    assert.ok(searchSrc.includes('buildSearchResults'), 'route uses the contract builder');
    const resultsSrc = src('lib/search-results.ts');
    assert.ok(resultsSrc.includes('entryPath(row'), 'the door of the row is the address');
    assert.ok(!resultsSrc.includes('/projects/'), 'no /projects fallback left');
  });

  test('no fictional collection numbers on editorial surfaces', () => {
    assert.ok(!src('app/(en)/editorial/page.tsx').includes('VOL_001'), 'fake volume number removed');
    assert.ok(!src('app/(en)/editorial/[id]/editorial-detail-content.tsx').includes("'LMSY-ED'"), 'fake catalog fallback removed');
  });

  test('no visitor-facing red debug banner remains', () => {
    const pageSrc = src('app/(en)/editorial/page.tsx');
    assert.ok(!pageSrc.includes('DATABASE_MISMATCH'), 'red debug banner removed');
    assert.ok(!pageSrc.includes('debugInfo'), 'debug state removed');
  });

  test('MDX dead chain is fully removed', () => {
    assert.throws(() => src('components/editorial-article.tsx'), 'editorial-article deleted');
    assert.throws(() => src('lib/mdx.ts'), 'lib/mdx deleted');
  });
});

// ---- Homepage entries: five fixed halls --------------------------------------
describe('homepage fixed category entries', () => {
  test('API serves the five registry entries plus real counts', () => {
    const routeSrc = src('app/api/home/portals/route.ts');
    assert.ok(routeSrc.includes('HOME_CATEGORIES'), 'entry list comes from the registry');
    // The visibility rule moved with the query into lib/data/projects.ts
    // (listPublicPortalProjects), so it is pinned in the repository too -
    // one layer without the other would silently drop the rule.
    assert.ok(routeSrc.includes('listPublicPortalProjects'), 'per-hall rows come from the repository');
    const repoSrc = src('lib/data/projects.ts');
    assert.ok(repoSrc.includes('listPublicPortalProjects'), 'the repository owns the read');
    assert.ok(repoSrc.includes('applyPublicProjectFilter'), 'uses the shared visibility rule');
    assert.ok(routeSrc.includes('counts'), 'response carries per-entry counts');
    assert.ok(!routeSrc.includes('hasWork'), 'the hide-empty-cards gate is gone');
  });

  test('homepage renders every entry, never filters on emptiness', () => {
    const sectionSrc = src('components/sections/portals-section.tsx');
    assert.ok(sectionSrc.includes('HOME_CATEGORIES.map'), 'renders the registry list');
    assert.ok(!sectionSrc.includes('hasWork['), 'no card is dropped for being empty');
    assert.ok(!sectionSrc.includes('SPAN_PLANS'), 'fixed five-card layout is back');
    assert.ok(sectionSrc.includes("t(language, 'home.collecting')"), 'empty hall shows 收录中');
  });
});

// ---- Legacy exhibition routes -----------------------------------------------
describe('legacy exhibition routes', () => {
  // 2026-10-21: the site's only inbound traffic is the homepage, so a retired
  // path is allowed to 404. Keeping a redirect shell for it kept a second
  // vocabulary alive for no benefit.
  test('the old exhibition shell is deleted', () => {
    assert.throws(() => src('app/exhibitions/page.tsx'));
    assert.throws(() => src('app/exhibitions/category/[type]/page.tsx'));
  });

  test('nothing keeps a redirect table around', () => {
    assert.ok(!src('next.config.ts').includes('async redirects('));
  });

  test('the door of a hall is still resolved through the registry', () => {
    assert.ok(src('lib/category-registry.ts').includes('DOOR_PATHS'));
    assert.ok(src('components/sections/portals-section.tsx').includes('categoryHref(entry.value)'));
  });
});

