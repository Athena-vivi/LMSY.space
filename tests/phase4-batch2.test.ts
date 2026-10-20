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
    assert.ok(timelineSrc.includes('applyPublicProjectFilter'));
  });

  test('one canonical project href built from the slug', () => {
    assert.ok(timelineSrc.includes('return `/projects/${slug || id}`;'));
  });

  test('dates come from event_date, with release_date only as a fallback', () => {
    assert.ok(timelineSrc.includes('p.event_date as string | null'), 'event_date selected');
    assert.ok(timelineSrc.includes("(p.event_date as string | null) || (p.release_date as string | null)"));
    assert.ok(!timelineSrc.includes('const date = (p.release_date as string | null)'),
      'release_date alone must not date an event');
  });

  test('image group ids are stable db-derived combinations', () => {
    assert.ok(timelineSrc.includes('`assets-${projectId}-${date}`') || timelineSrc.includes("'assets-${projectId}-${date}'") || /assets-\$\{projectId\}/.test(timelineSrc));
  });
});

// ---- Chronicle page year filter -------------------------------------------
describe('timeline page year filter', () => {
  test('accepts only a strict 4-digit year', () => {
    const pageSrc = src('app/timeline/page.tsx');
    assert.ok(pageSrc.includes("/^\\d{4}$/"), 'year param must be validated');
    assert.ok(pageSrc.includes('searchParams'), 'page must consume searchParams');
    assert.ok(pageSrc.includes('availableYears'), 'page passes available years to chrome');
  });

  test('/timeline/[year] validates the segment and 404s otherwise', () => {
    const yearSrc = src('app/timeline/[year]/page.tsx');
    assert.ok(yearSrc.includes("notFound()"), 'malformed year is a 404');
  });

  test('/chronicle forwards to /timeline and keeps the year param', () => {
    const legacy = src('app/chronicle/page.tsx');
    assert.ok(legacy.includes("redirect(year ? `/timeline?year="), 'year forwarded');
    assert.ok(legacy.includes("redirect('/timeline')") === false, 'never drops the year silently');
  });
});

// ---- Resonance Coming Soon -------------------------------------------------
describe('resonance coming soon', () => {
  const resonanceSrc = src('app/resonance/page.tsx');

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

  test('keeps the route honest: Coming Soon in three languages', () => {
    const languages = src('lib/languages.ts');
    assert.ok(languages.includes("'resonance.comingSoon': 'Coming Soon'"));
    assert.ok(languages.includes("'resonance.comingSoon': '即将上线'"));
    assert.ok(languages.includes("'resonance.comingSoon': 'เร็วๆ นี้'"));
  });
});

// ---- Gallery visibility gate ------------------------------------------------
describe('gallery visibility gate', () => {
  test('asset query is constrained to publicly visible projects', () => {
    const gallerySrc = src('app/gallery/page.tsx');
    assert.ok(gallerySrc.includes('applyPublicProjectFilter'), 'reuses the shared visibility filter');
    assert.ok(gallerySrc.includes(".in('project_id', projectIds)"), 'assets filtered by visible project ids');
    assert.ok(gallerySrc.includes('fetchPublicProjectIds'), 'id set fetched through the rule');
  });

  test('fail-closed when the id set cannot be resolved', () => {
    const gallerySrc = src('app/gallery/page.tsx');
    assert.ok(gallerySrc.includes('projectIds.length === 0'), 'empty id set short-circuits to an empty result');
  });
});

// ---- One canonical project detail -------------------------------------------
describe('single project detail route', () => {
  test('/projects/[id] no longer forwards editorial works elsewhere', () => {
    const pageSrc = src('app/projects/[id]/page.tsx');
    assert.ok(!pageSrc.includes("redirect(`/editorial/${project.id}`)"), 'no second detail surface');
    assert.ok(pageSrc.includes('resolveProject'), 'slug and uuid both resolve');
  });

  test('/editorial/<slug> opens the issue itself', () => {
    // Until 2026-10-21 this forwarded to /projects/<id>. An issue is an entry,
    // and an entry owns an address under its door.
    const legacy = src('app/editorial/[id]/page.tsx');
    assert.ok(legacy.includes('loadEditorialIssue'), 'reads the issue instead of forwarding');
    assert.ok(!legacy.includes('redirect('), 'no second address for the same issue');
  });

  test('related-projects cards link to /projects/<slug>', () => {
    const clientSrc = src('app/projects/[id]/project-detail-client.tsx');
    assert.ok(clientSrc.includes('`/projects/${related.slug || related.id}`'));
  });

  test('projects list cards open at the address the row actually owns', () => {
    const listSrc = src('app/projects/projects-client.tsx');
    assert.ok(
      listSrc.includes('homeDoorEntryPath(project) ?? `/projects/${project.slug || project.id}`'),
      'a door row opens under its door; the rest keep /projects/<slug>'
    );
  });

  test('search results follow the same rule', () => {
    const searchSrc = src('app/api/search/route.ts');
    assert.ok(searchSrc.includes('buildSearchResults'), 'route uses the contract builder');
    const resultsSrc = src('lib/search-results.ts');
    assert.ok(
      resultsSrc.includes('homeDoorEntryPath(row)'),
      'a hall with its own door answers under that door'
    );
  });

  test('no fictional collection numbers on editorial surfaces', () => {
    assert.ok(!src('app/editorial/page.tsx').includes('VOL_001'), 'fake volume number removed');
    assert.ok(!src('app/editorial/[id]/editorial-detail-content.tsx').includes("'LMSY-ED'"), 'fake catalog fallback removed');
  });

  test('no visitor-facing red debug banner remains', () => {
    const pageSrc = src('app/editorial/page.tsx');
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
    assert.ok(routeSrc.includes('applyPublicProjectFilter'), 'uses the shared visibility rule');
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
  test('the index folds into the project index', () => {
    const pageSrc = src('app/exhibitions/page.tsx');
    assert.ok(pageSrc.includes("redirect('/projects')"));
  });

  test('category routes translate the old type into the hall that owns it', () => {
    const catSrc = src('app/exhibitions/category/[type]/page.tsx');
    assert.ok(catSrc.includes('normalizeCategory'), 'goes through the registry aliases');
    assert.ok(catSrc.includes('categoryHref(category)'), 'lands on the door, not a filtered index');
  });
});

