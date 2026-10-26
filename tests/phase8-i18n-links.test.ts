/**
 * The language prefix on in-site links.
 *
 * Everything under app/[lang]/ is a re-export of the bare route, so the prefix
 * only exists in the URL. A component that hardcodes '/timeline' therefore
 * sends a Chinese visitor to the English site - and because / and /zh sit under
 * different root layouts, that is a full document load rather than a soft
 * transition. localizeHref is the single place that resolves it; these tests
 * pin both its rules and the fact that the public surfaces actually use it.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { localizeHref, languageHref, stripLangPrefix } from '../lib/i18n-path.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p: string) => readFileSync(path.join(ROOT, p), 'utf-8');

describe('localizeHref adds the prefix for the language being read', () => {
  test('english keeps the bare path', () => {
    assert.equal(localizeHref('en', '/', '/timeline'), '/timeline');
    assert.equal(localizeHref('en', '/timeline', '/gallery'), '/gallery');
  });

  test('a prefixed route prefixes the link', () => {
    assert.equal(localizeHref('zh', '/zh/timeline', '/timeline'), '/zh/timeline');
    assert.equal(localizeHref('th', '/th/gallery', '/timeline'), '/th/timeline');
    assert.equal(localizeHref('es', '/es', '/people/lookmhee'), '/es/people/lookmhee');
    assert.equal(localizeHref('pt', '/pt/editorial', '/'), '/pt');
  });

  test('the homepage is a real path, not an empty suffix', () => {
    assert.equal(languageHref('pt', '/'), '/pt');
    assert.equal(stripLangPrefix('/pt'), '/');
  });

  test('an already-prefixed address is not prefixed twice', () => {
    assert.equal(localizeHref('zh', '/zh/timeline', '/zh/gallery'), '/zh/gallery');
    assert.equal(localizeHref('en', '/timeline', '/zh/gallery'), '/gallery');
    assert.equal(localizeHref('pt', '/pt/timeline', '/zh/gallery'), '/pt/gallery');
  });

  test('query strings and anchors survive', () => {
    assert.equal(localizeHref('zh', '/zh/gallery', '/gallery#abc'), '/zh/gallery#abc');
    assert.equal(localizeHref('th', '/th/search', '/gallery?tab=recent'), '/th/gallery?tab=recent');
  });
});

describe('localizeHref leaves non-page addresses alone', () => {
  for (const href of [
    'https://x.com/lmsy',
    'http://example.com/a',
    '//cdn.lmsy.space/a.webp',
    '#top',
    'mailto:hi@lmsy.space',
    'tel:+10000000000',
  ]) {
    test(`${href} is passed through`, () => {
      assert.equal(localizeHref('zh', '/zh/timeline', href), href);
    });
  }

  test('the admin shell is english-only', () => {
    assert.equal(localizeHref('zh', '/zh/timeline', '/admin'), '/admin');
    assert.equal(localizeHref('zh', '/zh/timeline', '/admin/login'), '/admin/login');
    assert.equal(localizeHref('zh', '/admin', '/timeline'), '/timeline');
    assert.equal(localizeHref('zh', '/admin/gallery', '/editorial'), '/editorial');
  });

  test('api routes are not pages', () => {
    assert.equal(localizeHref('zh', '/zh', '/api/admin/vault'), '/api/admin/vault');
  });
});

describe('every public surface links through LocalizedLink', () => {
  const PUBLIC = [
    'components/site-header.tsx',
    'components/site-footer.tsx',
    'components/home-header.tsx',
    'components/chronicle-chrome.tsx',
    'components/chronicle-timeline.tsx',
    'components/doors/door-views.tsx',
    'components/doors/talks-timeline.tsx',
    'components/doors/live-timeline.tsx',
    'components/sections/hero-section.tsx',
    'components/sections/people-section.tsx',
    'components/sections/portals-section.tsx',
    'components/sections/soul-resonance-section.tsx',
    'components/sections/timeline-preview-section.tsx',
    'app/(en)/editorial/editorial-client.tsx',
    'app/(en)/editorial/[id]/editorial-detail-content.tsx',
    'app/(en)/gallery/lightbox.tsx',
    'app/(en)/people/people-index.tsx',
    'app/(en)/people/[slug]/person-client.tsx',
    'app/(en)/dramas/dramas-client.tsx',
  ];

  for (const file of PUBLIC) {
    test(`${file} does not link with a bare next/link`, () => {
      const code = src(file);
      assert.ok(
        code.includes("import { LocalizedLink as Link } from '@/components/localized-link'"),
        'imports the prefixing link'
      );
      assert.ok(!code.includes("import Link from 'next/link'"), 'no bare next/link left');
    });
  }

  test('the admin shell keeps next/link - it has no language prefixes', () => {
    for (const file of ['components/admin-sidebar.tsx', 'components/admin-mobile-nav.tsx']) {
      const code = src(file);
      assert.ok(code.includes("import Link from 'next/link'"), `${file} stays unprefixed`);
      assert.ok(!code.includes('LocalizedLink'), `${file} must not prefix admin paths`);
    }
  });
});

describe('the active nav entry is language-agnostic', () => {
  test('site-header compares the path with the prefix stripped', () => {
    const code = src('components/site-header.tsx');
    assert.ok(
      /const barePath = stripLangPrefix\(pathname\)/.test(code),
      'the highlight reads the bare path'
    );
    assert.ok(
      /barePath === href \|\| barePath\.startsWith\(href \+ '\/'\)/.test(code),
      'the comparison runs on the bare path'
    );
    assert.ok(
      /stripLangPrefix\(pathname\) === '\/'/.test(code),
      'the homepage guard still uses the same helper'
    );
  });
});

describe('search navigates inside the current language', () => {
  test('search-command resolves the prefix before pushing', () => {
    const code = src('components/search-command.tsx');
    assert.ok(code.includes("import { localizeHref } from '@/lib/i18n-path'"));
    assert.ok(code.includes('router.push(target)'), 'results push the localized address');
    assert.ok(code.includes('router.push(localizeHref(language, pathname, item.url))'));
    assert.ok(
      !code.includes("window.location.pathname === '/gallery'"),
      'the gallery hash match no longer assumes the English path'
    );
  });
});
