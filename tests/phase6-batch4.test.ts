/**
 * Phase-6 batch 4 tests: the two date fields must stop sharing one value.
 *
 * event_date is a curation claim about when the depicted event happened.
 * raw_event_date is the timestamp the source gave us (post / message /
 * article time). A collector that only knows "now" must not be able to turn
 * its own clock into an event date - that is how 9 Affair images ended up
 * dated on their collection day and showed up as a 2026 event on the public
 * chronicle.
 *
 * The rule must not add work for callers that do supply a real date, so a
 * past date sent alone is still accepted as the event date.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p: string) => readFileSync(path.join(ROOT, p), 'utf-8');

import { deriveIngestDraftDates } from '../lib/provenance.ts';

describe('ingest dates keep evidence and curation apart', () => {
  test('both fields present: the event date is a claim, the raw date is evidence', () => {
    const result = deriveIngestDraftDates({
      eventDate: '2024-10-28',
      rawEventDate: '2024-10-28T09:15:00Z',
      today: '2026-10-18',
    });
    assert.equal(result.event_date, '2024-10-28');
    assert.equal(result.raw_event_date, '2024-10-28T09:15:00Z');
    assert.equal(result.date_needs_curation, false);
  });

  test('rss style pair (publish date in both fields) still works', () => {
    const result = deriveIngestDraftDates({
      eventDate: '2026-10-09',
      rawEventDate: '2026-10-09T12:00:00Z',
      today: '2026-10-18',
    });
    assert.equal(result.event_date, '2026-10-09');
    assert.equal(result.date_needs_curation, false);
  });

  test('a past date sent alone is accepted, not demoted', () => {
    const result = deriveIngestDraftDates({
      eventDate: '2024-08-29',
      today: '2026-10-18',
    });
    assert.equal(result.event_date, '2024-08-29');
    assert.equal(result.raw_event_date, '2024-08-29');
    assert.equal(result.date_needs_curation, false);
  });

  test("today's date alone is the caller's clock, never an event date", () => {
    // The exact shape the weibo collector sent: event_date only, value = the
    // day it downloaded the images.
    const result = deriveIngestDraftDates({
      eventDate: '2026-03-20',
      today: '2026-03-20',
    });
    assert.equal(result.event_date, null);
    assert.equal(result.raw_event_date, '2026-03-20');
    assert.equal(result.date_needs_curation, true);
  });

  test('no dates at all means unknown, not today', () => {
    const result = deriveIngestDraftDates({ today: '2026-10-18' });
    assert.equal(result.event_date, null);
    assert.equal(result.raw_event_date, null);
    assert.equal(result.date_needs_curation, true);
  });

  test('an unparsable event date never becomes an event date', () => {
    const result = deriveIngestDraftDates({
      eventDate: '20 March 2026',
      rawEventDate: '2026-03-20T06:52:00Z',
      today: '2026-10-18',
    });
    assert.equal(result.event_date, null);
    assert.equal(result.raw_event_date, '2026-03-20T06:52:00Z');
    assert.equal(result.date_needs_curation, true);
  });

  test('blank strings are treated as absent', () => {
    const result = deriveIngestDraftDates({
      eventDate: '   ',
      rawEventDate: '',
      today: '2026-10-18',
    });
    assert.equal(result.event_date, null);
    assert.equal(result.raw_event_date, null);
    assert.equal(result.date_needs_curation, true);
  });
});

describe('the ingest path uses the split rule', () => {
  const ingest = src('app/api/ingest/route.ts');

  test('it derives the two dates instead of storing the body value directly', () => {
    assert.ok(ingest.includes('deriveIngestDraftDates({'));
    assert.ok(ingest.includes('event_date: draftDates.event_date'));
    assert.ok(ingest.includes('raw_event_date: draftDates.raw_event_date'));
    assert.ok(!ingest.includes('event_date: body.event_date || null'));
  });

  test('it tells the caller when the date still needs a curator', () => {
    assert.ok(ingest.includes('date_needs_curation: draftDates.date_needs_curation'));
  });
});

describe('promotion is not gated on the date', () => {
  const toGallery = src('app/api/admin/drafts/[id]/to-gallery/route.ts');

  test('there is no blocking error for a draft without a date', () => {
    assert.ok(!toGallery.includes('EVENT_DATE_REQUIRED'));
  });

  test('the previous non-blocking fallback is still in place', () => {
    assert.ok(toGallery.includes("new Date().toISOString().split('T')[0]"));
    assert.ok(toGallery.includes('event_date: draft.event_date'));
  });
});
