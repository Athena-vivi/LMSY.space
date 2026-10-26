import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import {
  DOOR_CATEGORY_GROUPS,
  SUBTYPES_BY_CATEGORY,
  TALK_CATEGORIES,
  doorCategorySegment,
} from '../lib/category-registry.ts';
import { entryPath } from '../lib/entry-path.ts';

/**
 * /talks and /live own real pages since 2026-10-21.
 *
 * Both halls used to be one client-rendered list with tabs, which meant an
 * entry had no address of its own: nothing underneath them could be crawled,
 * linked or shared. Each is a three-level door now, same shape as the other
 * four - a door page, one page per shelf, one page per entry.
 */

function src(path: string): string {
  return readFileSync(path, 'utf8');
}

const TALK_ROUTES = [
  'app/(en)/talks/page.tsx',
  'app/(en)/talks/[category]/page.tsx',
  'app/(en)/talks/[category]/[entry]/page.tsx',
];

const LIVE_ROUTES = [
  'app/(en)/live/page.tsx',
  'app/(en)/live/[subtype]/page.tsx',
  'app/(en)/live/[subtype]/[entry]/page.tsx',
];

describe('the two soul-resonance doors have three levels', () => {
  test('every level exists', () => {
    for (const route of [...TALK_ROUTES, ...LIVE_ROUTES]) {
      assert.ok(existsSync(route), `${route} exists`);
    }
  });

  test('the lists are server-rendered, not client fetches', () => {
    // A tab has no address. These pages are the crawl surface for the entries
    // underneath, so they cannot sit behind a client query.
    for (const route of [...TALK_ROUTES, ...LIVE_ROUTES]) {
      const source = src(route);
      assert.ok(!source.includes("'use client'"), `${route} is a server component`);
      assert.ok(source.includes('revalidate'), `${route} declares its cache window`);
    }
  });

  test('no client list is left behind', () => {
    assert.ok(!existsSync('app/(en)/talks/talks-client.tsx'));
    assert.ok(!existsSync('app/(en)/live/live-client.tsx'));
  });

  test('an entry page resolves the row through its own address', () => {
    const talks = src('app/(en)/talks/[category]/[entry]/page.tsx');
    assert.ok(talks.includes("loadEntry(category, entry)"));
    assert.ok(talks.includes('notFound()'), 'an unknown key is a 404, not an empty page');

    const live = src('app/(en)/live/[subtype]/[entry]/page.tsx');
    assert.ok(live.includes("loadEntry('live_stream', entry, subtype)"));
    assert.ok(live.includes('notFound()'));
  });

  test('a segment the door does not define is a 404', () => {
    const talks = src('app/(en)/talks/[category]/page.tsx');
    assert.ok(talks.includes('TALK_CATEGORIES'), 'only the three categories are shelves');
    const live = src('app/(en)/live/[subtype]/page.tsx');
    assert.ok(live.includes("loadSegmentEntries('live_stream', subtype)"));
  });
});

describe('the second level is decided by the registry', () => {
  test('/talks shelves are the three categories, in curated order', () => {
    assert.deepEqual([...DOOR_CATEGORY_GROUPS['/talks']], [...TALK_CATEGORIES]);
    assert.equal(doorCategorySegment('interview'), 'interview');
    assert.equal(doorCategorySegment('live_stream'), null, '/live splits on sub-classes');
    assert.equal(doorCategorySegment('editorial'), null);
  });

  test('/live shelves are both of them, then each of them by name', () => {
    // 2026-10-21: the third shelf used to be the category "single". A stream
    // held by one of them is hers, so the shelf is the name.
    const values = (SUBTYPES_BY_CATEGORY.live_stream ?? []).map((definition) => definition.value);
    assert.deepEqual(values, ['duo', 'lookmhee', 'sonya']);
    assert.ok(!values.includes('solo' as never), 'a stream is never "solo"');
  });

  test('addresses follow the second level of each door', () => {
    assert.equal(
      entryPath({ id: 'x', category: 'interview', slug: 'gala' }),
      '/talks/interview/gala'
    );
    assert.equal(
      entryPath({ id: 'x', category: 'live_stream', subtype: 'lookmhee', slug: 'late' }),
      '/live/lookmhee/late'
    );
    assert.equal(
      entryPath({ id: 'x', category: 'live_stream', subtype: 'sonya', slug: 'night' }),
      '/live/sonya/night'
    );
  });
});

describe('search and the sitemap see the new shelves', () => {
  test('the sitemap submits both doors and every shelf under them', () => {
    // 2026-10-25: the sitemap became an index; entry assembly lives in lib/sitemap-entries.ts.
    const sitemap = src('lib/sitemap-entries.ts');
    assert.ok(sitemap.includes('/talks'), 'the door is advertised');
    assert.ok(sitemap.includes('TALK_CATEGORIES'), 'one page per talk category');
    assert.ok(sitemap.includes('SUBTYPES_BY_CATEGORY.live_stream'), 'one page per live shelf');
  });
});
