/**
 * Phase-5 tests: search contract, ranking, routing and entry hygiene.
 * Contract: docs/architecture/20261017-search-contract.md
 *
 * The ranking/mapping logic lives in lib/search-results.ts as pure functions
 * (no path aliases) so it is directly testable. DB-coupled behaviour (the
 * visibility gate actually filtering) is source-asserted here and verified by
 * live smoke checks against the dev server.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p: string) => readFileSync(path.join(ROOT, p), 'utf-8');

import {
  buildSearchResults,
  mapGalleryRow,
  mapProjectRow,
  scoreResult,
  compareResults,
  buildCategoryResults,
  SCORE_EXACT,
  SCORE_PREFIX,
  SCORE_CONTAINS,
  SCORE_METADATA,
  type GalleryRow,
  type ProjectRow,
  type SearchResult,
} from '../lib/search-results.ts';
import { entryPath } from '../lib/entry-path.ts';
import { sanitizeSearchTerm } from '../lib/search-term.ts';

// A door-2 row: the address comes from the door plus the sub-class, so the
// fixture carries both. Door 1 is covered separately because it needs the
// series slug map.
const PROJECT = (over: Partial<ProjectRow> = {}): ProjectRow => ({
  id: '11111111-1111-1111-1111-111111111111',
  slug: null,
  title: 'Affair',
  description: 'A fan meeting',
  category: 'live_event',
  subtype: 'fanmeeting',
  event_date: '2025-10-10',
  release_date: '2025-10-10',
  ...over,
});

/** work_id -> series slug, the extra key door 1 needs. */
const SERIES = new Map([['work-affair', 'affair']]);

const ASSET = (over: Partial<GalleryRow> = {}): GalleryRow => ({
  id: '22222222-2222-2222-2222-222222222222',
  caption: 'Photo from Lookmhee',
  tag: 'Magazine',
  catalog_id: 'MAG237-01-001',
  image_url: 'gallery/photo.jpg',
  event_date: '2025-11-08',
  project_id: '11111111-1111-1111-1111-111111111111',
  ...over,
});

// ---- Contract mapping -------------------------------------------------------

describe('search contract mapping', () => {
  test('project href: the door that owns the row, slug wins over uuid', () => {
    assert.equal(entryPath({ id: 'abc', category: 'live_event', subtype: 'fanmeeting', slug: 'gaze' }), '/live-events/fanmeeting/gaze');
    assert.equal(entryPath({ id: 'abc', category: 'live_event', subtype: 'fanmeeting' }), '/live-events/fanmeeting/abc');
    assert.equal(entryPath({ id: 'abc', category: 'commercial', slug: 'coffee' }), '/commercial/coffee');
    assert.equal(entryPath({ id: 'abc', category: 'editorial', slug: 'dream' }), '/editorial/dream');
  });

  test('door 1 needs the series slug map and never guesses', () => {
    const row = { id: 'abc', category: 'drama_work', slug: 'ep1', work_id: 'work-affair' };
    assert.equal(entryPath(row, SERIES), '/dramas/affair/ep1');
    assert.equal(entryPath(row), null, 'no map, no address');
    assert.equal(
      entryPath({ id: 'abc', category: 'drama_work', slug: 'affair', project_kind: 'series' }),
      '/dramas/affair'
    );
  });

  test('a hall without a page has no address at all', () => {
    assert.equal(entryPath({ id: 'abc', category: 'behind_the_scenes', slug: 'x' }), null);
    assert.equal(entryPath({ id: 'abc', category: null }), null);
  });

  test('/talks splits on the category, /live on who held the phone', () => {
    // 2026-10-21: both halls used to have tabs on one page, so an entry had no
    // address and no page. The category is the shelf now.
    assert.equal(entryPath({ id: 'abc', category: 'interview', slug: 'gala-night' }), '/talks/interview/gala-night');
    assert.equal(entryPath({ id: 'abc', category: 'variety', slug: 'wood-toy' }), '/talks/variety/wood-toy');
    assert.equal(entryPath({ id: 'abc', category: 'radio', slug: 'efm-90' }), '/talks/radio/efm-90');
    assert.equal(entryPath({ id: 'abc', category: 'live_stream', subtype: 'duo', slug: 'christmas' }), '/live/duo/christmas');
    assert.equal(entryPath({ id: 'abc', category: 'live_stream', subtype: 'lookmhee', slug: 'late' }), '/live/lookmhee/late');
    // A stream that has not been filed yet still has a page of its own.
    assert.equal(entryPath({ id: 'abc', category: 'live_stream', slug: 'unfiled-one' }), '/live/unfiled/unfiled-one');
  });

  test('project rows map to the full contract', () => {
    const r = mapProjectRow(PROJECT())!;
    assert.equal(r.type, 'project');
    assert.equal(r.id, '11111111-1111-1111-1111-111111111111');
    assert.equal(r.title, 'Affair');
    assert.equal(r.href, '/live-events/fanmeeting/11111111-1111-1111-1111-111111111111');
    assert.equal(r.description, 'A fan meeting');
    assert.equal(r.date, '2025-10-10');
    assert.equal(r.category, 'live_event');
  });

  test('missing optional project fields are omitted, never fabricated', () => {
    const r = mapProjectRow(
      PROJECT({ description: null, event_date: null, release_date: null })
    )!;
    assert.equal(r.description, undefined);
    assert.equal(r.date, undefined);
    assert.ok(!('description' in r && r.description === ''));
  });

  test('a row with nowhere to land never enters the results', () => {
    // 2026-10-21: no /projects fallback, so an addressless row is dropped
    // rather than linked to a 404.
    assert.equal(mapProjectRow(PROJECT({ category: null })), null);
    assert.equal(mapProjectRow(PROJECT({ category: 'behind_the_scenes' })), null);
  });

  test('event_date wins over release_date, and the slug builds the href', () => {
    const r = mapProjectRow(PROJECT({ slug: 'gaze', event_date: '2024-01-02' }))!;
    assert.equal(r.type, 'project');
    assert.equal(r.href, '/live-events/fanmeeting/gaze');
    assert.equal(r.date, '2024-01-02');
  });

  test('gallery title fallback chain: caption -> catalog_id -> #tag', () => {
    assert.equal(mapGalleryRow(ASSET())!.title, 'Photo from Lookmhee');
    assert.equal(mapGalleryRow(ASSET({ caption: null }))!.title, 'MAG237-01-001');
    assert.equal(mapGalleryRow(ASSET({ caption: null, catalog_id: null }))!.title, '#Magazine');
  });

  test('assets without any real title field are excluded (no Untitled)', () => {
    const r = mapGalleryRow(ASSET({ caption: '', catalog_id: null, tag: null }));
    assert.equal(r, null);
    const blankCaption = mapGalleryRow(ASSET({ caption: '   ' }));
    assert.equal(blankCaption!.title, 'MAG237-01-001', 'whitespace-only caption falls through');
  });

  test('gallery href is the real asset uuid anchor', () => {
    const r = mapGalleryRow(ASSET())!;
    assert.equal(r.href, '/gallery#22222222-2222-2222-2222-222222222222');
    assert.equal(r.type, 'gallery');
    assert.equal(r.image, 'gallery/photo.jpg');
    assert.equal(r.date, '2025-11-08');
    assert.equal(r.category, 'Magazine');
  });

  test('no catalog_id is ever invented for anchorless assets', () => {
    const r = mapGalleryRow(ASSET({ caption: 'Still', catalog_id: null }))!;
    assert.ok(!r.href.includes('MAG'), 'href only uses the db uuid');
  });
});

// ---- Ranking ----------------------------------------------------------------

describe('search ranking', () => {
  test('exact > prefix > contains > metadata', () => {
    assert.ok(scoreResult({ type: 'project', id: 'a', title: 'affair', href: '' }, 'affair') === SCORE_EXACT);
    assert.ok(scoreResult({ type: 'project', id: 'a', title: 'affair season', href: '' }, 'affair') === SCORE_PREFIX);
    assert.ok(scoreResult({ type: 'project', id: 'a', title: 'the affair story', href: '' }, 'affair') === SCORE_CONTAINS);
    assert.ok(scoreResult({ type: 'project', id: 'a', title: 'unrelated', href: '', category: 'affair' }, 'affair') === SCORE_METADATA);
  });

  test('scoring is case-insensitive', () => {
    assert.equal(scoreResult({ type: 'gallery', id: 'a', title: 'Photo From Radar', href: '' }, 'photo from'), SCORE_PREFIX);
  });

  test('exhibition entries keep the documented metadata score', () => {
    const result: SearchResult = { type: 'exhibition', id: 'drama', title: 'Drama Archive', href: '/exhibitions/category/drama' };
    assert.equal(scoreResult(result, 'drama archive'), SCORE_METADATA);
  });

  test('same score: project before exhibition before gallery', () => {
    const term = 'x';
    const a: SearchResult = { type: 'project', id: '1', title: 'unrelated project', href: '' };
    const b: SearchResult = { type: 'exhibition', id: '2', title: 'unrelated exhibition', href: '' };
    const c: SearchResult = { type: 'gallery', id: '3', title: 'unrelated gallery', href: '' };
    assert.ok(compareResults(a, b, term) < 0);
    assert.ok(compareResults(b, c, term) < 0);
    assert.ok(compareResults(a, c, term) < 0);
  });

  test('same score/type: real date desc, missing date sinks, then id', () => {
    const newer: SearchResult = { type: 'gallery', id: 'b', title: 'x', href: '', date: '2026-01-01' };
    const older: SearchResult = { type: 'gallery', id: 'a', title: 'x', href: '', date: '2025-01-01' };
    const noDate: SearchResult = { type: 'gallery', id: 'c', title: 'x', href: '' };
    const sorted = [noDate, older, newer].sort((m, n) => compareResults(m, n, 'x'));
    assert.deepEqual(sorted.map((r) => r.id), ['b', 'a', 'c']);
  });

  test('identical input produces a stable order', () => {
    const term = 'photo';
    const rows = [ASSET({ id: 'a' }), ASSET({ id: 'b' }), ASSET({ id: 'c' })];
    const once = buildSearchResults({ term, projectRows: [], galleryRows: rows, categoryCounts: {}, lang: 'en' });
    const twice = buildSearchResults({ term, projectRows: [], galleryRows: rows, categoryCounts: {}, lang: 'en' });
    assert.deepEqual(once.map((r) => r.id), twice.map((r) => r.id));
  });
});

// ---- Dedup & scope ----------------------------------------------------------

describe('search dedup and scope', () => {
  test('same type+id appears once', () => {
    const rows = [ASSET(), ASSET()];
    const results = buildSearchResults({ term: 'photo', projectRows: [], galleryRows: rows, categoryCounts: {}, lang: 'en' });
    assert.equal(results.length, 1);
  });

  test('a project and its image both appear (different types, not duplicates)', () => {
    const results = buildSearchResults({
      term: 'affair',
      projectRows: [PROJECT()],
      galleryRows: [ASSET()],
      categoryCounts: { series: 1 },
      lang: 'en',
    });
    assert.equal(results.length, 2);
    assert.ok(results.some((r) => r.type === 'project'));
    assert.ok(results.some((r) => r.type === 'gallery'));
  });

  test('category entries only for categories with visible works', () => {
    const results = buildSearchResults({
      term: 'drama',
      projectRows: [],
      galleryRows: [],
      categoryCounts: { drama_work: 3, personal_travel: 0 },
      lang: 'en',
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].type, 'exhibition');
    assert.equal(results[0].id, 'drama_work');
    // Door 1 owns /dramas; a category result lands on the door itself.
    assert.equal(results[0].href, '/dramas');
  });

  test('category entries match localized labels too', () => {
    const zh = buildSearchResults({ term: '剧集', projectRows: [], galleryRows: [], categoryCounts: { drama_work: 2 }, lang: 'zh' });
    assert.equal(zh.length, 1);
    assert.equal(zh[0].href, '/dramas');
    const th = buildSearchResults({ term: 'อีเวนต์สด', projectRows: [], galleryRows: [], categoryCounts: { live_event: 1 }, lang: 'th' });
    assert.equal(th.length, 1);
  });

  test('empty categories never get category entries', () => {
    const results = buildCategoryResults('personal travel', { personal_travel: 0, editorial: 4 }, 'en');
    assert.equal(results.length, 0);
  });

  test('caps: at most 10 per type and 15 total', () => {
    const manyAssets = Array.from({ length: 20 }, (_, i) => ASSET({ id: String(i), caption: `photo ${i}` }));
    const manyProjects = Array.from({ length: 20 }, (_, i) => PROJECT({ id: String(i), title: `affair ${i}` }));
    const results = buildSearchResults({ term: 'a', projectRows: manyProjects, galleryRows: manyAssets, categoryCounts: {}, lang: 'en' });
    assert.ok(results.length <= 15);
    assert.ok(results.filter((r) => r.type === 'project').length <= 10);
    assert.ok(results.filter((r) => r.type === 'gallery').length <= 10);
  });
});

// ---- API wiring (source assertions) -----------------------------------------

describe('search api visibility wiring', () => {
  const routeSrc = src('app/api/search/route.ts');

  test('gallery_assets query is gated by the public project id set', () => {
    assert.ok(routeSrc.includes('applyPublicProjectFilter'), 'uses the shared visibility rule');
    assert.ok(routeSrc.includes(".in('project_id', publicIds)"), 'image search filtered to visible projects');
    assert.ok(routeSrc.includes('publicIds.length === 0'), 'empty id set fails closed');
  });

  test('hidden-container radar photos can no longer leak (P5-1 regression guard)', () => {
    // The old query had no project constraint at all; assert the constraint
    // sits on the gallery_assets branch, not only on projects.
    const galleryFn = routeSrc.slice(routeSrc.indexOf('fetchGalleryCandidates'), routeSrc.indexOf('const projectQuery'));
    assert.ok(galleryFn.includes(".in('project_id', publicIds)"));
  });

  test('projects query keeps the shared visibility filter', () => {
    const projectQuery = routeSrc.slice(routeSrc.indexOf('const projectQuery'), routeSrc.indexOf('const [galleryRows'));
    assert.ok(projectQuery.includes('applyPublicProjectFilter'));
  });

  test('no fabricated Untitled fallback anywhere in the search path', () => {
    assert.ok(!routeSrc.includes('Untitled'), 'route does not fabricate titles');
    const resultsSrc = src('lib/search-results.ts');
    assert.ok(!resultsSrc.includes('Untitled'), 'mapping does not fabricate titles');
  });

  test('draft_items never enters the search route', () => {
    assert.ok(!routeSrc.includes('draft_items'));
  });

  test('sanitizer strips PostgREST grammar and quote delimiters', () => {
    assert.equal(sanitizeSearchTerm('  A"b,c(%)_*  '), 'abc');
    assert.equal(sanitizeSearchTerm("Lookmhee's"), 'lookmhees');
  });

  test('candidate pools have deterministic ordering before their limits', () => {
    const orderCount = routeSrc.split(".order('id', { ascending: true })").length - 1;
    assert.equal(orderCount, 2, 'gallery and project candidates both order by id');
    assert.ok(routeSrc.includes('.limit(100)'), 'gallery pool is large enough not to truncate recall');
    assert.ok(routeSrc.includes('.limit(50)'), 'project pool is large enough not to truncate recall');
  });
});

// ---- Frontend hygiene ---------------------------------------------------------

describe('search frontend', () => {
  const commandSrc = src('components/search-command.tsx');

  test('schedule placeholder is gone from results and Quick Access', () => {
    assert.ok(!commandSrc.includes("'schedule'"), 'no schedule result type');
    assert.ok(!commandSrc.includes("url: '/schedule'"), 'no schedule Quick Access entry');
  });

  test('three states are distinct: loading, no results, error', () => {
    assert.ok(commandSrc.includes('isLoading'));
    assert.ok(commandSrc.includes('isError'));
    assert.ok(commandSrc.includes("t(language, 'search.error')"));
    assert.ok(commandSrc.includes("t(language, 'search.noResults')"));
  });

  test('navigation uses result.href (contract), not title inference', () => {
    assert.ok(commandSrc.includes('navigateToResult(result.href)'));
    assert.ok(commandSrc.includes('TYPE_ICON[result.type]'));
  });

  test('result replacement resets keyboard selection and ignores stale requests', () => {
    assert.ok(commandSrc.includes('setSelectedIndex(0)'));
    assert.ok(commandSrc.includes('results[selectedIndex] ?? results[0]'));
    assert.ok(commandSrc.includes('requestId !== requestIdRef.current'));
  });

  test('all copy goes through the three-language keys', () => {
    // 2026-10-25: locale strings split into per-language files (en/zh/th/es).
    const languages = ['en', 'zh', 'th', 'es']
      .map((locale) => src(`lib/languages/${locale}.ts`))
      .join('\n');
    for (const key of [
      'search.placeholder',
      'search.open',
      'search.clear',
      'search.noResults',
      'search.noResultsHint',
      'search.error',
      'search.quickAccess',
      'search.typeProject',
      'search.typeGallery',
      'search.typeExhibition',
      'search.footerNavigate',
      'search.footerEnter',
      'search.footerEsc',
    ]) {
      const en = languages.includes(`'${key}': '`);
      assert.ok(en, `key ${key} exists`);
      const count = languages.split(`'${key}':`).length - 1;
      assert.equal(count, 4, `key ${key} present in all four language blocks`);
    }
  });

  test('Quick Access labels and search controls are localized', () => {
    // 2026-10-21: the bar and Quick Access keep the two reading modes only.
    assert.ok(commandSrc.includes("t(language, 'nav.gallery')"));
    assert.ok(commandSrc.includes("t(language, 'nav.timeline')"));
    assert.ok(!commandSrc.includes("nav.projects"), 'no /projects entry left');
    assert.ok(!commandSrc.includes("nav.people"), 'people moved out of the bar');
    assert.ok(commandSrc.includes("aria-label={t(language, 'search.open')}"));
    assert.ok(commandSrc.includes("aria-label={t(language, 'search.clear')}"));
  });
});

// ---- Route hygiene ------------------------------------------------------------

describe('related routing fixes', () => {
  test('sitemap advertises every entry at its own address', () => {
    // 2026-10-25: the sitemap became an index with per-door sub-sitemaps; the
    // entry assembly lives in lib/sitemap-entries.ts.
    const sitemapSrc = src('lib/sitemap-entries.ts');
    assert.ok(
      sitemapSrc.includes('doorEntryPath(project)'),
      'an entry is submitted at the door that owns it'
    );
    assert.ok(!sitemapSrc.includes('SITE_URL}/projects'), 'no /projects address is submitted');
    assert.ok(!sitemapSrc.includes('`/projects/'), 'no /projects detail URL is built');
    assert.ok(sitemapSrc.includes('/timeline'), 'timeline is advertised');
    assert.ok(sitemapSrc.includes('/people'), 'people is advertised');
  });

  test('chronicle image groups have a deterministic within-group order', () => {
    // The asset read lives in lib/data/gallery-assets.ts as an id-cursored
    // walk (a cursor cannot carry a composite sort), so the display order -
    // event_date, then catalog_id, then id (a total order) - is restored in
    // memory by lib/timeline.ts. Both halves are pinned here.
    const timelineSrc = src('lib/timeline.ts');
    const comparator = timelineSrc.slice(
      timelineSrc.indexOf('assets.sort('),
      timelineSrc.indexOf('const projectById')
    );
    assert.ok(comparator.includes('a.event_date !== b.event_date'), 'assets ordered by event_date');
    assert.ok(comparator.includes('ca !== cb'), 'then catalog_id');
    assert.ok(comparator.includes('a.id.localeCompare'), 'then id (total order)');
    const repoSrc = src('lib/data/gallery-assets.ts');
    assert.ok(repoSrc.includes('listTimelineAssetsForYear'), 'the walk lives in the repository');
    assert.ok(repoSrc.includes(".order('id'"), 'the walk is id-cursored');
  });

  test('gallery handles hash navigation after the page is already mounted', () => {
    // 2026-10-25: gallery interaction lives in the client island.
    const gallerySrc = src('app/gallery/gallery-client.tsx');
    assert.ok(gallerySrc.includes("window.addEventListener('hashchange'"));
    assert.ok(gallerySrc.includes("setSelectedTag('All')"));
    assert.ok(gallerySrc.includes('setPendingAnchor(decodeURIComponent'));
  });

  test('schedule route itself is untouched (only the search entry was removed)', () => {
    const scheduleSrc = src('app/schedule/page.tsx');
    assert.ok(scheduleSrc.includes('scheduleItems'), 'page keeps its (empty) data contract');
    assert.ok(scheduleSrc.includes("t(language, 'schedule.noEvents')"), 'honest empty state stays');
  });
});
