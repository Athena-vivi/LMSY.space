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

  test('editorial works resolve to /editorial/[id], others to /projects/[id]', () => {
    assert.ok(timelineSrc.includes("category === 'editorial' ? `/editorial/${id}` : `/projects/${id}`"));
  });

  test('image group ids are stable db-derived combinations', () => {
    assert.ok(timelineSrc.includes('`assets-${projectId}-${date}`') || timelineSrc.includes("'assets-${projectId}-${date}'") || /assets-\$\{projectId\}/.test(timelineSrc));
  });
});

// ---- Chronicle page year filter -------------------------------------------
describe('chronicle page year filter', () => {
  test('accepts only a strict 4-digit year', () => {
    const pageSrc = src('app/chronicle/page.tsx');
    assert.ok(pageSrc.includes("/^\\d{4}$/"), 'year param must be validated');
    assert.ok(pageSrc.includes('searchParams'), 'page must consume searchParams');
    assert.ok(pageSrc.includes('availableYears'), 'page passes available years to chrome');
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

// ---- Editorial canonical entry ----------------------------------------------
describe('editorial canonical detail entry', () => {
  test('/projects/[id] forwards editorial works to /editorial/[id]', () => {
    const pageSrc = src('app/projects/[id]/page.tsx');
    assert.ok(pageSrc.includes("project.category === 'editorial'"), 'editorial branch present');
    assert.ok(pageSrc.includes('redirect(`/editorial/${project.id}`)'), 'redirect target correct');
  });

  test('related-projects section follows the same rule', () => {
    const clientSrc = src('app/projects/[id]/project-detail-client.tsx');
    assert.ok(clientSrc.includes("related.category === 'editorial' ? `/editorial/${related.id}`"));
  });

  test('projects list cards follow the same rule', () => {
    const listSrc = src('app/projects/page.tsx');
    assert.ok(listSrc.includes("project.category === 'editorial' ? `/editorial/${project.id}`"));
  });

  test('search results follow the same rule', () => {
    const searchSrc = src('app/api/search/route.ts');
    assert.ok(searchSrc.includes("item.category === 'editorial' ? `/editorial/${item.id}`"));
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

// ---- Homepage portals: zero-work category cards -----------------------------
describe('homepage portals zero-work gate', () => {
  test('API reports per-category hasWork', () => {
    const routeSrc = src('app/api/home/portals/route.ts');
    assert.ok(routeSrc.includes('hasVisibleProjects'), 'count query helper present');
    assert.ok(routeSrc.includes('applyPublicProjectFilter'), 'uses the shared visibility rule');
    assert.ok(routeSrc.includes('hasWork:'), 'response exposes hasWork');
  });

  test('homepage hides cards reported as hasWork=false, fail-open on unknown', () => {
    const sectionSrc = src('components/sections/portals-section.tsx');
    assert.ok(sectionSrc.includes("hasWork[portal.key] !== false"), 'explicit false hides, unknown keeps');
    assert.ok(sectionSrc.includes('SPAN_PLANS'), 'grid spans adapt to visible count');
  });
});

// ---- Exhibitions index -------------------------------------------------------
describe('exhibitions index zero-count cards', () => {
  test('categories with zero visible works are hidden from the index', () => {
    const indexSrc = src('app/exhibitions/exhibitions-index.tsx');
    assert.ok(indexSrc.includes('visibleCategories'), 'filtered category list used');
    assert.ok(indexSrc.includes("(counts[category.type] ?? 0) > 0"), 'zero-count filter present');
  });

  test('category routes themselves remain untouched', () => {
    const catSrc = src('app/exhibitions/category/[type]/page.tsx');
    assert.ok(catSrc.includes("from '@/lib/exhibition-categories'"), 'uses the shared lib');
  });
});
