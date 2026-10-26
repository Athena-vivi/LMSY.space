/**
 * Phase-6 batch 3 tests: editorial artifact counting.
 *
 * T3 - editorial artifact counting must compare cover and pages by image
 *      identity, not by raw string equality, because the same file is stored
 *      both as a relative R2 path and as its absolute CDN URL.
 *
 * T2 (the homepage longform quote card) and the module behind it,
 * lib/featured-excerpt.ts, were removed on 2026-10-27: the longform section
 * they served had no callers left, and neither did the resolver.
 *
 * The counting rules live in a pure module so they are tested directly; the
 * markup consequences are asserted against the source.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p: string) => readFileSync(path.join(ROOT, p), 'utf-8');

import { countIssueArtifacts, imageIdentity } from '../lib/editorial-meta.ts';

const CDN = 'https://cdn.lmsy.space';

describe('image identity folds the two stored URL shapes', () => {
  test('relative R2 path and its CDN URL are the same file', () => {
    const relative = 'magazines/2024/LMSY-STILL-20241028-001.webp';
    assert.equal(
      imageIdentity(relative),
      imageIdentity(`${CDN}/${relative}`)
    );
  });

  test('a leading slash is just another legal spelling', () => {
    assert.equal(
      imageIdentity('/magazines/2024/a.webp'),
      imageIdentity('magazines/2024/a.webp')
    );
    assert.equal(
      imageIdentity('/magazines/2024/a.webp'),
      imageIdentity(`${CDN}/magazines/2024/a.webp`)
    );
  });

  test('duplicate slashes collapse but the protocol keeps its own', () => {
    assert.equal(
      imageIdentity(`${CDN}//magazines/2024/a.webp`),
      imageIdentity(`${CDN}/magazines/2024/a.webp`)
    );
    assert.ok(imageIdentity(`${CDN}/magazines/2024/a.webp`)?.startsWith('https://'));
  });

  test('an identical URL stays identical', () => {
    assert.equal(
      imageIdentity(`${CDN}/draft/weibo/2026/03/20/a.jpg`),
      `${CDN}/draft/weibo/2026/03/20/a.jpg`
    );
  });

  test('surrounding whitespace is not part of the identity', () => {
    assert.equal(
      imageIdentity(`  ${CDN}/magazines/2024/a.webp  `),
      imageIdentity(`${CDN}/magazines/2024/a.webp`)
    );
  });

  test('missing or blank URLs have no identity', () => {
    assert.equal(imageIdentity(null), null);
    assert.equal(imageIdentity(undefined), null);
    assert.equal(imageIdentity(''), null);
    assert.equal(imageIdentity('   '), null);
  });

  test('same basename in a different directory is a different file', () => {
    assert.notEqual(
      imageIdentity('magazines/2024/a.webp'),
      imageIdentity('magazines/2025/a.webp')
    );
  });

  test('a different host is not folded into the CDN', () => {
    assert.notEqual(
      imageIdentity('https://other.example.com/magazines/2024/a.webp'),
      imageIdentity(`${CDN}/magazines/2024/a.webp`)
    );
  });
});

describe('artifact counting uses that identity', () => {
  const pages = [
    { image_url: `${CDN}/magazines/2024/LMSY-MAG-20241218-001.webp` },
    { image_url: `${CDN}/magazines/2024/LMSY-MAG-20241218-002.webp` },
    { image_url: `${CDN}/magazines/2024/LMSY-MAG-20241218-003.webp` },
  ];

  test('relative cover pointing at page 001 is not counted twice', () => {
    // This is the exact shape of the four affected issues.
    assert.equal(
      countIssueArtifacts(pages, 'magazines/2024/LMSY-MAG-20241218-001.webp'),
      3
    );
  });

  test('absolute cover pointing at a page is not counted twice', () => {
    assert.equal(
      countIssueArtifacts(pages, `${CDN}/magazines/2024/LMSY-MAG-20241218-002.webp`),
      3
    );
  });

  test('a cover outside the page list still adds one', () => {
    assert.equal(countIssueArtifacts(pages, `${CDN}/magazines/2024/cover.webp`), 4);
  });

  test('same basename in another directory is not the cover', () => {
    assert.equal(
      countIssueArtifacts(pages, 'magazines/2025/LMSY-MAG-20241218-001.webp'),
      4
    );
  });

  test('no cover means just the pages', () => {
    assert.equal(countIssueArtifacts(pages, null), 3);
    assert.equal(countIssueArtifacts(pages, ''), 3);
    assert.equal(countIssueArtifacts(pages, '   '), 3);
  });

  test('empty galleries keep the existing semantics', () => {
    assert.equal(countIssueArtifacts([], `${CDN}/magazines/2024/cover.webp`), 1);
    assert.equal(countIssueArtifacts([], null), 0);
    assert.equal(countIssueArtifacts(null, null), 0);
  });
});


describe('the two fixes are wired into the surfaces', () => {

  test('the API counts artifacts the same way as the detail page', () => {
    const api = src('app/api/editorial/route.ts');
    assert.ok(api.includes('countIssueArtifacts(galleryImages, project.cover_url)'));
    assert.ok(!api.includes('const artifactCount = galleryImages.length'));
  });
});
