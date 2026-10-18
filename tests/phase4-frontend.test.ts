// Phase-4 batch 1 unit tests: pure helpers introduced for the frontend IA
// changes (covers, month chapter titles). No DB access, no React mounting.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pickCoverForProject, pickCoversByProject } from '../lib/project-covers.ts';
import { formatChapterTitle } from '../lib/chapter-title.ts';
import {
  PROJECT_CATEGORIES,
  HOME_CATEGORIES,
  normalizeCategory,
  categoryDefinition,
} from '../lib/category-registry.ts';

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

// ---------- category registry ----------

test('category registry: exactly the eight stable values', () => {
  assert.deepEqual([...PROJECT_CATEGORIES], [
    'drama_work',
    'editorial',
    'live_event',
    'public_appearance',
    'commercial',
    'behind_the_scenes',
    'personal_travel',
    'early_archive',
  ]);
});

test('category registry: five fixed homepage entries', () => {
  const values = HOME_CATEGORIES.map((definition) => definition.value);
  assert.deepEqual(values, [
    'drama_work',
    'editorial',
    'live_event',
    'public_appearance',
    'commercial',
  ]);
});

test('legacy values still resolve so old links keep working', () => {
  assert.equal(normalizeCategory('series'), 'drama_work');
  assert.equal(normalizeCategory('appearance'), 'live_event');
  assert.equal(normalizeCategory('travel'), 'public_appearance');
  assert.equal(normalizeCategory('daily'), 'personal_travel');
  assert.equal(normalizeCategory('DRAMA_WORK'), 'drama_work');
  assert.equal(normalizeCategory('nonsense'), null);
  assert.equal(normalizeCategory(null), null);
});

test('every definition carries a label key and a gradient', () => {
  for (const value of PROJECT_CATEGORIES) {
    const definition = categoryDefinition(value);
    assert.ok(definition, `${value} resolves`);
    assert.ok(definition!.labelKey.startsWith('category.'), `${value} has an i18n key`);
    assert.ok(definition!.gradient.includes('from-'), `${value} has a fallback gradient`);
  }
});
