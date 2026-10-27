/**
 * The date segment inside a catalog id has to follow the event date.
 *
 * These are the pure helpers of lib/catalog-date-sync.ts - the shapes that
 * live in the archive today, including the single-person asset whose -LM /
 * -SY tail sits between the date and the sequence. A shape that is not
 * recognised here is a batch that silently keeps the old day in its file
 * name, which is the drift this module exists to remove.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assetIdUnder, dateSegmentOf, replaceDateSegment } from '../lib/catalog-date-sync.ts';

test('an event number keeps its tail and gains the new day', () => {
  assert.equal(
    replaceDateSegment('LMSY-EVENT-FANSIGN-CKG-20250420', '20250426'),
    'LMSY-EVENT-FANSIGN-CKG-20250426'
  );
  assert.equal(
    replaceDateSegment('LMSY-EVENT-FANMEET-WUH-20251129-LM', '20251130'),
    'LMSY-EVENT-FANMEET-WUH-20251130-LM'
  );
});

test('an asset keeps its sequence', () => {
  assert.equal(
    replaceDateSegment('LMSY-EVENT-FANSIGN-CKG-20250420-001', '20250426'),
    'LMSY-EVENT-FANSIGN-CKG-20250426-001'
  );
  assert.equal(
    replaceDateSegment('LMSY-APPEAR-CHARITY-BKK-20250608-034', '20250607'),
    'LMSY-APPEAR-CHARITY-BKK-20250607-034'
  );
});

test('a single-person asset keeps the tail and the sequence', () => {
  assert.equal(
    replaceDateSegment('LMSY-APPEAR-FASHION-BKK-20251130-SY-034', '20251201'),
    'LMSY-APPEAR-FASHION-BKK-20251201-SY-034'
  );
  assert.equal(
    replaceDateSegment('LMSY-EVENT-FANMEET-WUH-20251129-LM-024', '20251130'),
    'LMSY-EVENT-FANMEET-WUH-20251130-LM-024'
  );
  // The reverse order is accepted too, so a batch written that way is not
  // left behind.
  assert.equal(
    replaceDateSegment('LMSY-EVENT-FANMEET-WUH-20251129-024-LM', '20251130'),
    'LMSY-EVENT-FANMEET-WUH-20251130-024-LM'
  );
});

test('a magazine asset keeps its subject and sequence', () => {
  assert.equal(
    replaceDateSegment('LMSY-MAG-KAZZ217-YOUTHCHOICE-20260731-001', '20260801'),
    'LMSY-MAG-KAZZ217-YOUTHCHOICE-20260801-001'
  );
});

test('an id without a date is left alone', () => {
  assert.equal(replaceDateSegment('LMSY-FEAT-BACKVIEW-025', '20260801'), null);
  assert.equal(replaceDateSegment('LMSY-MAG-OAT-LM', '20260801'), null);
  assert.equal(dateSegmentOf('LMSY-FEAT-BACKVIEW-025'), null);
  assert.equal(dateSegmentOf(null), null);
});

test('an asset moves under the rebuilt event number', () => {
  // The BaBi Blushing party was re-filed to Shanghai: the city code inside the
  // number has to follow, sequence and day untouched.
  assert.equal(
    assetIdUnder(
      'LMSY-EVENT-BRANDDAY-BKK-20250628-001',
      'LMSY-EVENT-BRANDDAY-BKK-20250628',
      'LMSY-EVENT-BRANDDAY-SHA-20250628',
      '20250628'
    ),
    'LMSY-EVENT-BRANDDAY-SHA-20250628-001'
  );
  assert.equal(
    assetIdUnder(
      'LMSY-EVENT-FANMEET-WUH-20251129-LM-024',
      'LMSY-EVENT-FANMEET-WUH-20251129-LM',
      'LMSY-EVENT-FANMEET-WUH-20251130-LM',
      '20251130'
    ),
    'LMSY-EVENT-FANMEET-WUH-20251130-LM-024'
  );
});

test('a door whose date is its own segment keeps that segment', () => {
  assert.equal(
    assetIdUnder(
      'LMSY-MAG-OAT-LM-20241211-012',
      'LMSY-MAG-OAT-LM',
      'LMSY-MAG-OAT-LM',
      '20250101'
    ),
    'LMSY-MAG-OAT-LM-20250101-012'
  );
  // No new date known: a topic that is not pinned to a day must not gain one.
  assert.equal(
    assetIdUnder('LMSY-FEAT-BACKVIEW-025', 'LMSY-FEAT-BACKVIEW', 'LMSY-FEAT-BACKVIEW', null),
    'LMSY-FEAT-BACKVIEW-025'
  );
});

test('an asset that belongs to another event is not touched', () => {
  assert.equal(
    assetIdUnder(
      'LMSY-EVENT-FANSIGN-CKG-20250426-001',
      'LMSY-EVENT-BRANDDAY-BKK-20250628',
      'LMSY-EVENT-BRANDDAY-SHA-20250628',
      '20250628'
    ),
    null
  );
});

test('the date segment is read back the same way it is written', () => {
  assert.equal(dateSegmentOf('LMSY-APPEAR-FASHION-BKK-20251130-SY-034'), '20251130');
  assert.equal(dateSegmentOf('LMSY-EVENT-FANSIGN-CKG-20250426-001'), '20250426');
  assert.equal(dateSegmentOf('LMSY-EVENT-FANSIGN-CKG-20250426'), '20250426');
  assert.equal(dateSegmentOf('LMSY-EVENT-FANMEET-WUH-20251129-024-LM'), '20251129');
});
