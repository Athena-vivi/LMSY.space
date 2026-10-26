/**
 * The front door: how long it stays shut, what it says, and how often it opens.
 *
 * Two complaints drove this file, and they are separate mechanisms:
 *   1. the door opened again on every client-side return to the homepage, so it
 *      felt like a page transition instead of an entrance;
 *   2. the curtain was dropped after 500ms while its own choreography runs for
 *      2.5s, so the wordmark was cut mid-fade and the plaque never appeared.
 *
 * Source assertions, like the rest of the chrome tests: these strings are the
 * ones that decide the behaviour.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p: string) => readFileSync(path.join(ROOT, p), 'utf-8');

describe('the curtain stays shut for the length of its own choreography', () => {
  const wrapper = src('components/loading/loading-wrapper.tsx');
  const curtain = src('components/loading/immersive-loading.tsx');

  test('the hold matches the wordmark sequence, not a paint budget', () => {
    assert.ok(/const SPLASH_HOLD_MS = 2600/.test(wrapper), 'hold is 2.6s');
    assert.ok(/minDuration = SPLASH_HOLD_MS/.test(wrapper), 'the default is that hold');
    assert.ok(!/const SPLASH_HOLD_MS = 500/.test(wrapper), 'the 500ms cut is gone');
  });

  test('the exit duration is the same number in both files', () => {
    assert.ok(/const SPLASH_EXIT_MS = 1200/.test(wrapper));
    assert.ok(/transition=\{\{ duration: 1\.2/.test(curtain), 'exit is 1.2s, in one place');
  });

  test('the wordmark itself is untouched', () => {
    // Her design: 1.5s blur-in, hairline drawn by 2.5s, 'LMSY' in the curator's
    // photo. Only the line under it changes.
    assert.ok(/transition=\{\{ duration: 1\.5, ease: 'easeOut' \}\}/.test(curtain));
    assert.ok(/transition=\{\{ duration: 2, delay: 0\.5 \}\}/.test(curtain));
    assert.ok(curtain.includes('LMSY'));
  });

  test('the room rises after the curtain starts to go, not with it', () => {
    assert.ok(/CONTENT_REVEAL_DELAY_MS = 300/.test(wrapper));
    assert.ok(/content\.style\.opacity = '0'/.test(wrapper), 'page dropped behind an opaque curtain');
    assert.ok(/opacity \$\{CONTENT_FADE_MS\}ms ease-out/.test(wrapper));
  });

  test('reduced motion gets a blink instead of a sequence', () => {
    assert.ok(/prefers-reduced-motion: reduce/.test(wrapper));
    assert.ok(/REDUCED_HOLD_MS = 300/.test(wrapper));
  });
});

describe('one door per visit, not one door per mount', () => {
  const wrapper = src('components/loading/loading-wrapper.tsx');
  const intro = src('lib/splash-intro.ts');

  test('a client-side return hides the curtain before paint', () => {
    // This is the actual fix for "每一次返回首页都要重新开门": the curtain is
    // in the server markup, so it re-mounts without a document load, and the
    // <html> attribute was never set because nothing was in storage yet.
    assert.ok(/hasPlayedSplash\(\)/.test(wrapper));
    assert.ok(/doorAlreadyOpen\.current/.test(wrapper));
    assert.ok(
      /curtainRef\.current\.style\.display = 'none'/.test(wrapper),
      'the curtain is hidden in a layout effect, before the browser paints'
    );
    assert.ok(
      /useIsomorphicLayoutEffect = typeof window !== 'undefined' \? useLayoutEffect : useEffect/.test(
        wrapper
      ),
      'layout effect on the client, effect on the server'
    );
  });

  test('an already-open door never fades the page in again', () => {
    assert.ok(
      /if \(doorAlreadyOpen\.current \|\| reduced \|\| !content\) return;/.test(wrapper),
      'content is left alone when the door was already open'
    );
  });

  test('storage is written when the door opens, and read before paint', () => {
    assert.ok(/markSplashPlayed\(\);/.test(wrapper));
    assert.ok(intro.includes('sessionStorage.setItem'));
    assert.ok(intro.includes("sessionStorage.getItem('${SPLASH_STORAGE_KEY}')==='1'"));
    assert.ok(/documentElement\.setAttribute\('data-splash','seen'\)/.test(intro));
  });

  test('the css rule and the script agree on the attribute', () => {
    const css = src('app/globals.css');
    assert.ok(/html\[data-splash='seen'\] \.lmsy-splash/.test(css));
  });
});

describe('the homepage does not stack a spinner in front of the door', () => {
  const fallback = src('app/(en)/loading.tsx');
  const shell = src('app/[lang]/loading.tsx');

  test('the homepage waits on the curtain colour, not on "Loading archive"', () => {
    assert.ok(/stripLangPrefix\(pathname\) === '\//.test(fallback), 'the homepage is detected by its bare path');
    assert.ok(/bg-black/.test(fallback), 'same fill as the curtain');
    assert.ok(/site\.loading/.test(fallback), 'other routes keep the label');
  });

  test('the spinner sits behind that branch, so it never reaches the homepage', () => {
    const branch = fallback.indexOf("stripLangPrefix(pathname) === '/'");
    const spinner = fallback.indexOf('animate-spin');
    assert.ok(branch > -1 && spinner > branch, 'the spinner is the fallback of the fallback');
  });

  test('the localised root reuses the same file', () => {
    assert.ok(/export \{ default \} from '\.\.\/\(en\)\/loading'/.test(shell));
  });
});

describe('the plaque says what is behind the door', () => {
  const curtain = src('components/loading/immersive-loading.tsx');
  const page = src('app/(en)/page.tsx');
  const counts = src('lib/data/archive-counts.ts');

  test('the line under the wordmark is the archive count', () => {
    assert.ok(/t\(language, 'splash\.plaque'/.test(curtain));
    assert.ok(!/\{t\(language, 'splash\.entering'\)\}/.test(curtain), 'the old label is only the fallback');
    assert.ok(/const counted = \(archiveCounts\?\.events \?\? 0\) > 0/.test(curtain), 'falls back instead of printing zero');
  });

  test('counts are read on the server and handed down', () => {
    assert.ok(/getPublicArchiveCounts/.test(page));
    assert.ok(/archiveCounts=\{archiveCounts\}/.test(page));
  });

  test('counting cannot be truncated by the 1000-row response cap', () => {
    assert.ok(/count: 'exact', head: true/.test(counts));
    assert.ok(/applyPublicProjectFilter/.test(counts), 'same visibility rule as the doors');
    assert.ok(/\.in\('project_id', projectIds\)/.test(counts), 'same rule as the gallery');
  });

  test('every language carries the plaque', () => {
    for (const lang of ['en', 'zh', 'th', 'es', 'pt']) {
      const file = src(`lib/languages/${lang}.ts`);
      assert.ok(file.includes("'splash.plaque'"), `${lang} has the plaque line`);
      const line = file.split('\n').find((l) => l.includes("'splash.plaque'")) ?? '';
      assert.ok(line.includes('{events}') && line.includes('{images}'), `${lang} has both counts`);
      assert.ok(file.includes("'splash.entering'"), `${lang} keeps the fallback line`);
    }
  });
});
