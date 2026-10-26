/**
 * Phase-6 batch 1 tests: presentation rules and the content-quality fixes.
 *
 * The shared rules live as pure functions (lib/category-meta.ts,
 * lib/display-date.ts, lib/editorial-meta.ts, lib/project-tabs.ts) so they are
 * directly testable. Surface-level regressions that were fixed in this batch
 * are asserted against the source, because they are about markup/copy that only
 * shows up in the browser.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p: string) => readFileSync(path.join(ROOT, p), 'utf-8');

import { categoryMeta, categoryLabelKey, assetTagLabelKey } from '../lib/category-meta.ts';
import { formatDisplayDate, formatMonthYear, localeFor } from '../lib/display-date.ts';
import { countIssueArtifacts, titlePlateLabel } from '../lib/editorial-meta.ts';
import { visibleProjectTabs } from '../lib/project-tabs.ts';

describe('display dates are locale-aware', () => {
  test('locales map to the archive languages', () => {
    assert.equal(localeFor('en'), 'en-US');
    assert.equal(localeFor('zh'), 'zh-CN');
    assert.equal(localeFor('th'), 'th-TH');
  });

  test('english long date has the month name', () => {
    const label = formatDisplayDate('2024-08-29', 'en');
    assert.equal(label, 'August 29, 2024');
  });

  test('chinese date is localized, not english', () => {
    const label = formatDisplayDate('2024-08-29', 'zh');
    assert.ok(label?.includes('2024'), 'keeps the year');
    assert.ok(label?.includes('年'), 'uses the chinese year marker');
    assert.ok(!label?.includes('August'), 'no english month leaks through');
  });

  test('thai date uses the buddhist era', () => {
    const label = formatDisplayDate('2024-08-29', 'th');
    assert.ok(label?.includes('2567'), 'BE year for 2024');
  });

  test('plain YYYY-MM-DD does not shift a day in any locale', () => {
    for (const lang of ['en', 'zh', 'th'] as const) {
      const label = formatDisplayDate('2024-08-29', lang);
      assert.ok(label, `date rendered for ${lang}`);
      // Every locale must show the 29th; parsing as UTC midnight used to show
      // the 28th in negative-offset zones.
      assert.ok(label!.includes('29'), `${lang} keeps day 29 (got ${label})`);
    }
  });

  test('month-only and short forms', () => {
    assert.equal(formatDisplayDate('2024-08-29', 'en', { month: 'short', day: false }), 'Aug 2024');
    assert.equal(formatMonthYear('2024-08', 'en'), 'August 2024');
  });

  test('missing or invalid dates return null instead of a fabricated date', () => {
    assert.equal(formatDisplayDate(null, 'en'), null);
    assert.equal(formatDisplayDate('', 'en'), null);
    assert.equal(formatDisplayDate('not-a-date', 'en'), null);
    assert.equal(formatDisplayDate('2024-13-40', 'en'), null);
  });

  test('invalid month keys pass through unchanged', () => {
    assert.equal(formatMonthYear('2024-13', 'en'), '2024-13');
    assert.equal(formatMonthYear('garbage', 'en'), 'garbage');
  });
});

describe('category labels come from one place', () => {
  test('known categories map to localized keys', () => {
    assert.equal(categoryLabelKey('drama_work'), 'category.dramaWork');
    assert.equal(categoryLabelKey('editorial'), 'category.editorial');
    assert.equal(categoryLabelKey('live_event'), 'category.liveEvent');
    assert.equal(categoryLabelKey('commercial'), 'category.commercial');
  });

  test('legacy values are normalized before lookup', () => {
    assert.equal(categoryLabelKey(' Series '), 'category.dramaWork');
    assert.equal(categoryLabelKey('daily'), 'category.personalTravel');
    assert.equal(categoryLabelKey('travel'), 'category.publicAppearance');
  });

  test('unknown categories fall back to a neutral label, never crash', () => {
    const meta = categoryMeta('something-new');
    assert.equal(meta.labelKey, 'category.other');
    assert.ok(meta.accent.length > 0);
    assert.equal(categoryMeta(null).labelKey, 'category.other');
    assert.equal(categoryMeta(undefined).labelKey, 'category.other');
  });
});

describe('asset tags reuse the gallery filter vocabulary', () => {
  test('stored tags resolve to the same keys as the filter chips', () => {
    assert.equal(assetTagLabelKey('Magazine'), 'gallery.tagMagazine');
    assert.equal(assetTagLabelKey('Advertising'), 'gallery.tagAdvertising');
    assert.equal(assetTagLabelKey('STAGE'), 'gallery.tagStage');
    assert.equal(assetTagLabelKey('STILL'), 'gallery.tagStill');
  });

  test('case and whitespace do not break the lookup', () => {
    assert.equal(assetTagLabelKey(' magazine '), 'gallery.tagMagazine');
  });

  test('ingest-only and unknown tags have no label, so the raw value is shown', () => {
    assert.equal(assetTagLabelKey('Telegram'), null);
    assert.equal(assetTagLabelKey('something-new'), null);
    assert.equal(assetTagLabelKey(null), null);
    assert.equal(assetTagLabelKey(undefined), null);
  });

  test('gallery card and lightbox both localize the badge', () => {
    // 2026-10-25: gallery rendering moved to the client island of the SSR page.
    assert.ok(src('app/(en)/gallery/gallery-client.tsx').includes('assetTagLabelKey(item.tag)'));
    assert.ok(src('app/(en)/gallery/lightbox.tsx').includes('assetTagLabelKey(currentImage.tag)'));
  });
});

describe('shared navigation copy is not hardcoded', () => {
  test('no page re-introduces a back-to-hub logo above the title', () => {
    // The global header is the only navigation entry point now. A second
    // "back to hub" logo pushed every title block down and duplicated the
    // logo, so both components and every call site were removed.
    assert.ok(!existsSync('components/back-button.tsx'));
    assert.ok(!existsSync('components/space-hub-return.tsx'));
    const surfaces = [
      'components/page-intro.tsx',
      'components/chronicle-chrome.tsx',
      'app/(en)/admin/preview/[id]/project-detail-client.tsx',
      'app/(en)/schedule/page.tsx',
      'app/(en)/resonance/page.tsx',
      'app/(en)/whispers/page.tsx',
    ];
    for (const file of surfaces) {
      assert.ok(!src(file).includes('BackButton'), `${file} has no back logo`);
    }
  });

  test('footer copyright link is localized', () => {
    const footer = src('components/site-footer.tsx');
    assert.ok(footer.includes("t(language, 'nav.copyright')"));
  });

  test('archive credit lines are localized, not hardcoded English', () => {
    const credit = src('components/archive-credit.tsx');
    assert.ok(credit.includes("t(language, 'credit.official')"));
    assert.ok(credit.includes("t(language, 'credit.fan')"));
    assert.ok(!credit.includes('All media assets belong to the original publishers. Preserved'));
    assert.ok(!credit.includes('Special thanks to the Besties who captured these fleeting moments.'));
  });
});

describe('editorial artifact counting', () => {
  const pages = [
    { image_url: 'a.webp' },
    { image_url: 'b.webp' },
    { image_url: 'c.webp' },
  ];

  test('cover that is already a page is not counted twice', () => {
    assert.equal(countIssueArtifacts(pages, 'a.webp'), 3);
  });

  test('a separate cover adds one artifact', () => {
    assert.equal(countIssueArtifacts(pages, 'cover.webp'), 4);
  });

  test('no cover means just the pages', () => {
    assert.equal(countIssueArtifacts(pages, null), 3);
  });

  test('cover without pages is still one real artifact', () => {
    assert.equal(countIssueArtifacts([], 'cover.webp'), 1);
  });

  test('nothing at all is zero', () => {
    assert.equal(countIssueArtifacts(null, null), 0);
    assert.equal(countIssueArtifacts([], null), 0);
  });
});

describe('editorial corner plate keeps non-latin titles readable', () => {
  test('latin titles keep the archive convention', () => {
    assert.equal(titlePlateLabel('Retro Soul'), 'RETRO_SOUL');
    assert.equal(titlePlateLabel('  U!  '), 'U!');
  });

  test('CJK title is not stripped to underscores', () => {
    const label = titlePlateLabel('20241217【天津Fan sign PB】');
    assert.ok(label.includes('天津'), 'chinese characters survive');
    assert.ok(!label.includes('___'), 'no underscore run replaces the title');
  });

  test('thai title is preserved', () => {
    assert.equal(titlePlateLabel('นิตยสารพิเศษ'), 'นิตยสารพิเศษ');
  });

  test('empty title stays empty', () => {
    assert.equal(titlePlateLabel('   '), '');
  });
});

describe('project detail tabs only offer real facets', () => {
  test('live data shape collapses to ALL only', () => {
    // Every asset currently has category_tag = NULL, so stills == all and the
    // other two facets are empty.
    assert.deepEqual(
      visibleProjectTabs({ all: 18, official_stills: 18, bts: 0, press_events: 0 }),
      ['all']
    );
  });

  test('a genuinely distinct subset is offered', () => {
    assert.deepEqual(
      visibleProjectTabs({ all: 10, official_stills: 6, bts: 4, press_events: 0 }),
      ['all', 'official_stills', 'bts']
    );
  });

  test('empty gallery hides the whole tab bar', () => {
    assert.deepEqual(visibleProjectTabs({ all: 0, official_stills: 0, bts: 0, press_events: 0 }), []);
  });
});

describe('new copy exists in all languages', () => {
  // 2026-10-25: locale strings split into per-language files.
  // 2026-10-25: pt-BR added (Brazil is the top traffic region in GSC).
  const languages = ['en', 'zh', 'th', 'es', 'pt']
    .map((locale) => src(`lib/languages/${locale}.ts`))
    .join('\n');
  const keys = [
    'common.viewDetails',
    'common.watch',
    'common.loadMore',
    'common.loading',
    'common.imagesOne',
    'common.imagesMany',
    'common.source',
    'common.noImage',
    'common.curatorNote',
    'common.close',
    'common.previous',
    'nav.copyright',
    'credit.official',
    'credit.fan',
    'credit.officialTitle',
    'credit.fanTitle',
    'common.next',
    'category.series',
    'category.editorial',
    'category.appearance',
    'category.commercial',
    'category.daily',
    'category.travel',
    'category.other',
    'project.tabAll',
    'project.tabStills',
    'project.tabBts',
    'project.tabPress',
    'project.watchNow',
    'project.emptyTitle',
    'project.emptyDesc',
    'project.cover',
    'project.featured',
    'project.unsorted',
    'project.dateUnknown',
    'project.noteStillsTitle',
    'project.noteStills',
    'project.noteBtsTitle',
    'project.noteBts',
    'project.notePressTitle',
    'project.notePress',
    'gallery.emptyAll',
    'gallery.emptyFiltered',
    'gallery.resetFilter',
    'projects.emptyAll',
    'projects.photoCount',
    'projects.noImages',
    'editorial.issueCount',
    'editorial.releaseDate',
    'editorial.artifacts',
    'editorial.curatorNote',
    'editorial.insideIssue',
    'editorial.pagesPreserved',
    'editorial.pagesEmpty',
    'editorial.pagesEmptyHint',
    'editorial.noCover',
    'editorial.dateTbd',
    'editorial.loading',
    'chronicle.tryAnotherYear',
    'home.explore',
    'home.enterArchive',
    'home.storyContinues',
  ];

  for (const key of keys) {
    test(`${key} is defined once per language`, () => {
      const count = languages.split(`'${key}':`).length - 1;
      assert.equal(count, 5, `${key} present in en/zh/th/es/pt`);
    });
  }
});

describe('homepage', () => {
  test('portal CTA is localized', () => {
    const portals = src('components/sections/portals-section.tsx');
    assert.ok(portals.includes("t(language, 'home.explore')"));
    assert.ok(!portals.includes('EXPLORE'));
  });
});

describe('the event index is gone', () => {
  // 2026-10-21: /projects left the front end. What a visitor browses is the
  // doors, and every card there opens the entry at its own address.
  test('there is no shared index page', () => {
    assert.ok(!existsSync('app/projects/page.tsx'));
    assert.ok(!existsSync('app/projects/projects-client.tsx'));
  });

  test('door cards open the address the loader computed', () => {
    const doors = src('components/doors/door-views.tsx');
    assert.ok(doors.includes('href={entry.href}'), 'entry cards use the server address');
    assert.ok(doors.includes("t(language, 'drama.eventImages'"), 'counts stay localized');
    assert.ok(!doors.includes("'/projects"), 'no /projects link left');
  });
});

describe('gallery', () => {
  // 2026-10-25: gallery went SSR-first — copy and interaction moved to the
  // client island (gallery-client.tsx), the server page fetches first paint.
  const page = src('app/(en)/gallery/gallery-client.tsx');
  const lightbox = src('app/(en)/gallery/lightbox.tsx');

  test('empty state tells the truth instead of claiming construction', () => {
    assert.ok(!page.includes('>Gallery Under Construction<'));
    assert.ok(!page.includes('画廊建设中'));
    assert.ok(page.includes("t(language, 'gallery.emptyAll')"));
    assert.ok(page.includes("t(language, 'gallery.emptyFiltered')"));
    assert.ok(page.includes("t(language, 'gallery.resetFilter')"));
  });

  test('load more uses shared copy instead of inline language ternaries', () => {
    assert.ok(page.includes("t(language, 'common.loadMore')"));
    assert.ok(!page.includes('โหลดเพิ่มเติม'));
  });

  test('visibility gate and anchor behaviour are untouched', () => {
    assert.ok(src('app/(en)/gallery/page.tsx').includes('fetchPublicProjectIds'));
    assert.ok(page.includes("addEventListener('hashchange'"));
    assert.ok(page.includes('window.history.replaceState'));
  });

  test('lightbox copy is localized', () => {
    assert.ok(lightbox.includes("t(language, 'common.source')"));
    assert.ok(lightbox.includes("t(language, 'common.curatorNote')"));
    assert.ok(lightbox.includes("t(language, 'common.noImage')"));
    assert.ok(!lightbox.includes('aria-label="Close lightbox"'));
  });

  test('lightbox no longer syncs the index in an effect', () => {
    assert.ok(!lightbox.includes('const index = images.findIndex(img => img.id === image.id);'));
    assert.ok(lightbox.includes('useState(() => {'));
  });
});

describe('editorial', () => {
  const list = src('app/(en)/editorial/page.tsx');
  const api = src('app/api/editorial/route.ts');

  // The magazine rack is its own surface: covers, catalog ids and the
  // per-issue reading entry. It is NOT the project index with a locked
  // filter. Since 2026-10-21 it is also read on the server, so the issues are
  // in the HTML instead of arriving after paint.
  test('editorial is the issue rack, rendered on the server', () => {
    assert.ok(list.includes('loadEditorialIssues'), 'the rack is read before paint');
    assert.ok(list.includes('EditorialClient'), 'covers are drawn by the rack view');
    assert.ok(!list.includes('lockedCategory'), 'it does not reuse the project index');
    assert.ok(!list.includes('ProjectsClient'), 'no locked project list');
  });

  test('every homepage portal opens its own door', () => {
    const portals = src('components/sections/portals-section.tsx');
    assert.ok(
      portals.includes('categoryHref(entry.value)'),
      'the card asks the registry where its hall lives'
    );
    assert.ok(
      !portals.includes('/projects?category=${entry.value}'),
      'no entry points at a filtered copy of the index any more'
    );
  });

  test('the old editorial chrome is gone', () => {
    assert.ok(!list.includes('MAGAZINE ARCHIVE COLLECTION'));
    assert.ok(!list.includes('ISSUES CURATED'));
    assert.ok(!list.includes('NO_COVER'));
    assert.ok(!list.includes('ARTIFACT{'));
    assert.ok(!list.includes('DATABASE_MISMATCH'));
  });

  test('api no longer leaks internals or logs every request', () => {
    assert.ok(!api.includes('console.log'));
    assert.ok(!api.includes('fullError:'));
    assert.ok(!api.includes('stack: error'));
    // The query moved into lib/data/projects.ts (listEditorialIssuesForApi),
    // so the strict editorial filter and the shared visibility rule are pinned
    // there - one layer without the other would let either be dropped.
    assert.ok(api.includes('listEditorialIssuesForApi'), 'reads through the repository');
    const repo = src('lib/data/projects.ts');
    assert.ok(repo.includes('listEditorialIssuesForApi'), 'the repository owns the read');
    assert.ok(repo.includes('applyPublicProjectFilter'), 'shared visibility rule');
    assert.ok(repo.includes(".eq('category', 'editorial')"), 'strict editorial filter');
  });
});

describe('chronicle', () => {
  const timeline = src('components/chronicle-timeline.tsx');
  const chroniclePage = src('app/(en)/timeline/page.tsx');

  test('no position-by-percentage dots that never lined up with cards', () => {
    assert.ok(!timeline.includes('(index / Math.max(events.length - 1, 1)) * 100'));
  });

  test('chronological order is kept on mobile', () => {
    // A single grid in DOM order with explicit desktop columns replaced the
    // even/odd array split, which used to stack 0,2,4…,1,3,5… on mobile.
    assert.ok(!timeline.includes('leftEvents'));
    assert.ok(!timeline.includes('rightEvents'));
    assert.ok(timeline.includes('md:col-start-1'));
    assert.ok(timeline.includes('md:col-start-2'));
  });

  test('project cards show the localized category', () => {
    assert.ok(timeline.includes('categoryMeta(event.category).labelKey'));
    assert.ok(!timeline.includes('{event.category}'));
  });

  test('group lightbox supports keyboard and locks page scroll', () => {
    assert.ok(timeline.includes("e.key === 'Escape'"));
    assert.ok(timeline.includes("e.key === 'ArrowLeft'"));
    assert.ok(timeline.includes("document.body.style.overflow = 'hidden'"));
  });

  test('lightbox index steps outside the state updater', () => {
    assert.ok(!timeline.includes('setLightboxIndex(next)'));
  });

  test('empty year offers the years that do have events', () => {
    assert.ok(timeline.includes("t(language, 'chronicle.tryAnotherYear')"));
    assert.ok(timeline.includes('availableYears.map'));
    assert.ok(chroniclePage.includes('availableYears={availableYears}'));
  });

  test('timeline data source is still works + images only', () => {
    assert.ok(!timeline.includes('draft_items'));
    assert.ok(!chroniclePage.includes('draft_items'));
  });
});

describe('shared page intro', () => {
  test('the doors and the gallery use the same header component', () => {
    assert.ok(src('components/doors/door-views.tsx').includes('<PageIntro'));
    assert.ok(src('app/(en)/gallery/gallery-client.tsx').includes('<PageIntro'));
    const intro = src('components/page-intro.tsx');
    assert.ok(intro.includes('font-serif'));
    // The intro starts directly with the title: no logo row, no extra top
    // padding reserved for one.
    assert.ok(!intro.includes('BackButton'));
    assert.ok(intro.includes('pt-14 pb-10 md:pt-20 md:pb-14'));
  });
});

describe('no database writes were introduced', () => {
  const touched = [
    'app/(en)/admin/preview/[id]/page.tsx',
    'app/(en)/admin/preview/[id]/project-detail-client.tsx',
    'app/(en)/gallery/page.tsx',
    'app/(en)/gallery/lightbox.tsx',
    'app/(en)/editorial/page.tsx',
    'app/(en)/editorial/[id]/editorial-detail-content.tsx',
    'components/chronicle-timeline.tsx',
    'components/sections/portals-section.tsx',
  ];

  for (const file of touched) {
    test(`${file} only reads`, () => {
      const content = src(file);
      assert.ok(!content.includes('.insert('), 'no insert');
      assert.ok(!content.includes('.update('), 'no update');
      assert.ok(!content.includes('.delete('), 'no delete');
      assert.ok(!content.includes('.upsert('), 'no upsert');
    });
  }
});
