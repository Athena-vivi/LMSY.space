/**
 * A date is only required where the id has nowhere else to get one.
 *
 * Before 2026-10-27 the promote flow refused every project without an
 * `event_date` except a FEAT topic, so a drama work's promo set ("Series
 * Stills", which has no single day by definition) could not receive a batch at
 * all. The naming spec already allows an unknown segment to be omitted, so the
 * gate was stricter than the format.
 *
 * What must stay true:
 *   - every door except EVENT / APPEAR builds a legal id without a date;
 *   - EVENT / APPEAR still refuse one without a date, because their subject is
 *     type + city and the date is the only thing telling two of them apart;
 *   - a project that already carries an event number never needs a date,
 *     whichever door it belongs to.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  assetIdPrefixFor,
  buildProjectCatalogId,
  parseCatalogId,
  r2KeyForCatalogId,
} from '../lib/catalog-id.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p: string) => readFileSync(path.join(ROOT, p), 'utf-8');

describe('date-less ids', () => {
  test('a drama event number omits the date entirely', () => {
    assert.equal(buildProjectCatalogId('DRAMA', 'AFFAIR-SERIESSTILLS', null, 'LMSY'), 'LMSY-DRAMA-AFFAIR-SERIESSTILLS');
    // With a date it stays exactly as before - this is not a format change.
    assert.equal(buildProjectCatalogId('DRAMA', 'AFFAIR-PROMO-PREMIERE', '2024-08-30', 'LMSY'), 'LMSY-DRAMA-AFFAIR-PROMO-PREMIERE');
  });

  test('EVENT / APPEAR cannot build a number without a date', () => {
    assert.equal(buildProjectCatalogId('EVENT', 'FANMEET-BKK', null, 'LMSY'), null);
    assert.equal(buildProjectCatalogId('APPEAR', 'AWARDS-BKK', '', 'LMSY'), null);
  });

  test('the asset prefix adds the date only when there is one', () => {
    assert.equal(assetIdPrefixFor('LMSY-DRAMA-AFFAIR-SERIESSTILLS', 'DRAMA', null), 'LMSY-DRAMA-AFFAIR-SERIESSTILLS');
    assert.equal(assetIdPrefixFor('LMSY-MAG-OAT', 'MAG', '2024-12-11'), 'LMSY-MAG-OAT-20241211');
  });

  test('a date-less id parses back with date null', () => {
    const parsed = parseCatalogId('LMSY-DRAMA-AFFAIR-SERIESSTILLS-007');
    assert.ok(parsed, 'the short shape is a legal id');
    assert.equal(parsed?.date, null);
    assert.equal(parsed?.door, 'DRAMA');
    assert.equal(parsed?.subject, 'AFFAIR-SERIESSTILLS');
    assert.equal(parsed?.sequence, 7);
  });

  test('a date-less id gets a key without a year segment', () => {
    assert.equal(
      r2KeyForCatalogId('LMSY-DRAMA-AFFAIR-SERIESSTILLS-001'),
      'lmsy/drama/LMSY-DRAMA-AFFAIR-SERIESSTILLS-001.webp'
    );
    assert.equal(
      r2KeyForCatalogId('LMSY-DRAMA-AFFAIR-PROMO-PREMIERE-20240830-001'),
      'lmsy/drama/2024/LMSY-DRAMA-AFFAIR-PROMO-PREMIERE-20240830-001.webp'
    );
  });
});

describe('the promote gate matches the format', () => {
  const promoteSrc = src('lib/promote.ts');

  test('the blanket "every door but FEAT needs a date" rule is gone', () => {
    // It was `if (!project.event_date && doorCode !== 'FEAT')` - stricter than
    // the naming spec, and the reason a work with no day could not take one.
    assert.ok(!promoteSrc.includes("doorCode !== 'FEAT'"), 'no door-wide date requirement');
  });

  test('the date is still demanded where the number embeds it', () => {
    assert.ok(promoteSrc.includes("doorCode === 'EVENT' || doorCode === 'APPEAR'"), 'EVENT / APPEAR keep the gate');
    assert.ok(promoteSrc.includes('normalizeEventNumber(project.catalog_id)'), 'an existing number needs no date');
  });

  test('creating an event only demands a date for the two halls that embed it', () => {
    const routeSrc = src('app/api/admin/projects/route.ts');
    assert.ok(routeSrc.includes("category === 'live_event' || category === 'public_appearance'"));
    assert.ok(!routeSrc.includes("'event_date is required for an event'"), 'the blanket message is gone');
  });
});
