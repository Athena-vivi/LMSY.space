/**
 * Chrome and homepage-visual tests.
 *
 * These cover the follow-up to phase 7: the header/footer layout, and the two
 * homepage blocks that are supposed to look like picture doors rather than
 * empty boxes. They are source assertions because the actual complaint was
 * about what renders - the strings below are the ones that decide it.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p: string) => readFileSync(path.join(ROOT, p), 'utf-8');

describe('header puts search left and the entries together', () => {
  for (const file of ['components/site-header.tsx', 'components/home-header.tsx']) {
    test(`${file} keeps one nav group`, () => {
      const code = src(file);
      assert.ok(!code.includes('LEFT_ITEMS'), 'nav is no longer split around the search');
      assert.ok(!code.includes('RIGHT_ITEMS'), 'nav is no longer split around the search');
      assert.ok(code.includes('mainNavItems.map(renderLink)'), 'all four entries render in one block');
      assert.ok(!code.includes('md:justify-center'), 'entries are not centred');
    });

    test(`${file} renders the search bar before the nav`, () => {
      const code = src(file);
      const search = code.indexOf('<SearchCommand variant="bar" />');
      const nav = code.indexOf('mainNavItems.map(renderLink)');
      assert.ok(search > -1 && nav > -1, 'both present');
      assert.ok(search < nav, 'search sits left of the entries');
    });
  }
});

describe('language switcher is a dropdown', () => {
  const code = src('components/language-switcher.tsx');

  test('collapses to a globe trigger', () => {
    assert.ok(code.includes('Globe'), 'globe icon');
    assert.ok(code.includes('aria-haspopup="listbox"'), 'dropdown semantics');
    assert.ok(code.includes('role="listbox"'), 'menu is a listbox');
  });

  test('does not paint all three codes in the bar', () => {
    // The three codes may only appear inside the expanded menu.
    const menu = code.slice(code.indexOf('AnimatePresence'));
    assert.ok(menu.includes('languageNames[lang]'), 'menu lists full language names');
    assert.ok(!code.includes('tracking-wider text-ink">TH</span>'));
  });
});

describe('footer keeps only the copyright line', () => {
  const footer = src('components/site-footer.tsx');

  test('retired quick links are gone', () => {
    for (const href of ['/chronicle', '/exhibitions', '/editorial', '/profiles']) {
      assert.ok(!footer.includes(`href="${href}"`), `${href} is not linked from the footer`);
    }
  });

  test('the copyright page link sits on the same line as the notice', () => {
    assert.ok(footer.includes('href="/copyright"'));
    const line = footer.slice(footer.indexOf('© {new Date()'));
    assert.ok(line.includes('href="/copyright"'), 'link follows the notice on one row');
  });
});

describe('homepage blocks are picture doors', () => {
  test('timeline preview renders the year photo, not a bare year box', () => {
    const code = src('components/sections/timeline-preview-section.tsx');
    assert.ok(code.includes('resolveImageUrl(entry.cover)'), 'uses the resolved year cover');
    assert.ok(code.includes('aspect-[3/4]'), 'portrait frame');
    assert.ok(code.includes('<Image'), 'renders a real image');
    assert.ok(code.includes('/timeline/${entry.year}'), 'tile links into that year');
    assert.ok(!code.includes('flex flex-col items-center justify-center rounded-xl border'), 'old box is gone');
  });

  test('people cards are portrait frames with the name over the photo', () => {
    const code = src('components/sections/people-section.tsx');
    assert.ok(code.includes('resolveImageUrl(person.image ?? person.avatar_url)'), 'photo fallback');
    assert.ok(code.includes('aspect-[4/5]'), 'tall frame');
    assert.ok(!code.includes('rounded-full border border-border bg-muted'), 'no empty avatar circle');
  });

  test('summary api supplies a cover per year and an image per person', () => {
    const route = src('app/api/home/summary/route.ts');
    assert.ok(route.includes('milestone_priority'), 'per-year photo source');
    assert.ok(route.includes('cover: milestoneCover[year]'), 'year response carries a cover');
    assert.ok(route.includes('image: row.avatar_url ?? fallback'), 'person response carries an image');
    assert.ok(route.includes('linkedByProfile'), 'person photo comes from credited projects');
  });
});
