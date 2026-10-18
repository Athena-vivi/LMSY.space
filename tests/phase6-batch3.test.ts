/**
 * Phase-6 batch 3 tests: the two deterministic fixes.
 *
 * T2 - the homepage longform block must not render its quote card when the
 *      featured project has no text (and must still use the site-level
 *      fallback when there is no featured project at all).
 * T3 - editorial artifact counting must compare cover and pages by image
 *      identity, not by raw string equality, because the same file is stored
 *      both as a relative R2 path and as its absolute CDN URL.
 *
 * The counting and resolution rules live in pure modules so they are tested
 * directly; the markup consequences are asserted against the source.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p: string) => readFileSync(path.join(ROOT, p), 'utf-8');

import { countIssueArtifacts, imageIdentity } from '../lib/editorial-meta.ts';
import { resolveFeaturedExcerpt } from '../lib/featured-excerpt.ts';

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

describe('featured excerpt resolution refuses to invent content', () => {
  const base = {
    language: 'en' as const,
    homepageExcerptI18n: null,
    descriptionI18n: null,
    homepageExcerpt: null,
    description: null,
  };

  test('no featured project still uses the site-level fallback', () => {
    assert.equal(
      resolveFeaturedExcerpt({
        ...base,
        hasFeaturedProject: false,
        siteFallback: 'Site quote',
      }),
      'Site quote'
    );
  });

  test('no featured project and no site copy resolves to nothing', () => {
    assert.equal(
      resolveFeaturedExcerpt({ ...base, hasFeaturedProject: false, siteFallback: '  ' }),
      ''
    );
    assert.equal(
      resolveFeaturedExcerpt({ ...base, hasFeaturedProject: false, siteFallback: null }),
      ''
    );
  });

  test('featured project with all four fields empty resolves to nothing', () => {
    // The production case: GAZE is featured, every excerpt field is NULL.
    assert.equal(resolveFeaturedExcerpt({ ...base, hasFeaturedProject: true }), '');
  });

  test('an all-empty i18n object does not stop the chain', () => {
    assert.equal(
      resolveFeaturedExcerpt({
        ...base,
        hasFeaturedProject: true,
        homepageExcerptI18n: { en: '', zh: '', th: '' },
        description: 'Real description from the project row',
      }),
      'Real description from the project row'
    );
  });

  test('whitespace-only copy counts as no copy', () => {
    assert.equal(
      resolveFeaturedExcerpt({
        ...base,
        hasFeaturedProject: true,
        homepageExcerpt: '   \n\t ',
        description: '   ',
      }),
      ''
    );
  });

  test('a real excerpt wins over the description', () => {
    assert.equal(
      resolveFeaturedExcerpt({
        ...base,
        hasFeaturedProject: true,
        homepageExcerpt: 'Curator line',
        description: 'Longer description',
      }),
      'Curator line'
    );
  });

  test('localized text is preferred and trimmed', () => {
    assert.equal(
      resolveFeaturedExcerpt({
        ...base,
        hasFeaturedProject: true,
        language: 'zh',
        homepageExcerptI18n: { en: 'English line', zh: '  中文策展语  ', th: '' },
        homepageExcerpt: 'Fallback line',
      }),
      '中文策展语'
    );
  });

  test('a missing translation falls back to english, then to the row value', () => {
    assert.equal(
      resolveFeaturedExcerpt({
        ...base,
        hasFeaturedProject: true,
        language: 'th',
        homepageExcerptI18n: { en: 'English line', zh: '', th: '' },
      }),
      'English line'
    );
    assert.equal(
      resolveFeaturedExcerpt({
        ...base,
        hasFeaturedProject: true,
        language: 'th',
        description: 'Row level text',
      }),
      'Row level text'
    );
  });
});

describe('the two fixes are wired into the surfaces', () => {
  test('longform block gates the quote card and its attribution', () => {
    const section = src('components/sections/longform-section.tsx');
    assert.ok(section.includes('resolveFeaturedExcerpt({'));
    assert.ok(section.includes('const showExcerpt = featuredExcerpt.length > 0;'));
    assert.equal(
      (section.match(/\{showExcerpt && \(/g) || []).length,
      2,
      'quote card and source line are both conditional'
    );
    assert.ok(!section.includes('getLocalizedText(\n        featuredEditorial.homepage_excerpt_i18n'));
  });

  test('longform block keeps the title, image and link unconditional', () => {
    const section = src('components/sections/longform-section.tsx');
    assert.ok(section.includes('href={featuredHref}'));
    assert.ok(section.includes('src={featuredImageUrl}'));
    assert.ok(section.includes('{featuredTitle}'));
  });

  test('the API counts artifacts the same way as the detail page', () => {
    const api = src('app/api/editorial/route.ts');
    assert.ok(api.includes('countIssueArtifacts(galleryImages, project.cover_url)'));
    assert.ok(!api.includes('const artifactCount = galleryImages.length'));
  });
});
