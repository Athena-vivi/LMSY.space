// Phase-4 batch 1 unit tests: pure helpers introduced for the frontend IA
// changes (covers, month chapter titles). No DB access, no React mounting.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pickCoverForProject, pickCoversByProject } from '../lib/project-covers.ts';
import { formatChapterTitle } from '../lib/chapter-title.ts';
import { EXHIBITION_TYPE_MAPPING, EXHIBITION_CATEGORIES } from '../lib/exhibition-categories.ts';

// ---------- pickCoverForProject ----------

test('cover: explicit is_cover wins over catalog and position', () => {
  const url = pickCoverForProject([
    { project_id: 'p', image_url: 'first.jpg' },
    { project_id: 'p', image_url: 'catalog.jpg', catalog_id: 'LMSY-MAG-20250101-000' },
    { project_id: 'p', image_url: 'flagged.jpg', is_cover: true },
  ]);
  assert.equal(url, 'flagged.jpg');
});

test('cover: -000 catalog convention is the second priority', () => {
  const url = pickCoverForProject([
    { project_id: 'p', image_url: 'first.jpg' },
    { project_id: 'p', image_url: 'catalog.jpg', catalog_id: 'LMSY-STILL-20250101-000' },
  ]);
  assert.equal(url, 'catalog.jpg');
});

test('cover: falls back to first row in the given (stable) order', () => {
  const url = pickCoverForProject([
    { project_id: 'p', image_url: 'a.jpg' },
    { project_id: 'p', image_url: 'b.jpg' },
  ]);
  assert.equal(url, 'a.jpg');
});

test('cover: empty selection yields null, never a fabricated url', () => {
  assert.equal(pickCoverForProject([]), null);
});

// ---------- pickCoversByProject ----------

test('coversByProject: groups per project, ignores null project_id', () => {
  const covers = pickCoversByProject([
    { project_id: 'p1', image_url: 'p1-a.jpg', is_cover: true },
    { project_id: 'p1', image_url: 'p1-b.jpg' },
    { project_id: 'p2', image_url: 'p2-a.jpg' },
    { project_id: null, image_url: 'orphan.jpg' },
  ]);
  assert.deepEqual(covers, { p1: 'p1-a.jpg', p2: 'p2-a.jpg' });
});

test('coversByProject: project whose only row has null project_id is absent', () => {
  const covers = pickCoversByProject([{ project_id: null, image_url: 'x.jpg' }]);
  assert.deepEqual(covers, {});
});

// ---------- formatChapterTitle ----------

test('chapter title: English long month + year', () => {
  assert.equal(formatChapterTitle('2024-08', 'en'), 'August 2024');
});

test('chapter title: Chinese year-month format', () => {
  assert.equal(formatChapterTitle('2024-08', 'zh'), '2024年8月');
});

test('chapter title: Thai locale renders without throwing', () => {
  const title = formatChapterTitle('2024-08', 'th');
  assert.equal(typeof title, 'string');
  assert.ok(title.length > 0);
});

test('chapter title: malformed key returns the key itself', () => {
  assert.equal(formatChapterTitle('not-a-month', 'en'), 'not-a-month');
});

// ---------- exhibition category mapping ----------

test('exhibition mapping: five categories with valid projects.category values', () => {
  assert.equal(EXHIBITION_CATEGORIES.length, 5);
  const categories = EXHIBITION_CATEGORIES.map((c) => c.category).sort();
  assert.deepEqual(categories, ['appearance', 'commercial', 'daily', 'series', 'travel']);
  // The legacy music/magazine enum entries must never become exhibition types.
  assert.ok(!('music' in EXHIBITION_TYPE_MAPPING));
  assert.ok(!('magazine' in EXHIBITION_TYPE_MAPPING));
});

test('exhibition mapping: types are unique URL-safe segments', () => {
  const types = EXHIBITION_CATEGORIES.map((c) => c.type);
  assert.equal(new Set(types).size, types.length);
  for (const type of types) {
    assert.match(type, /^[a-z]+$/);
  }
});
