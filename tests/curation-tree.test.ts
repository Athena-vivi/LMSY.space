import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { assembleCurationTree, type CurationRow } from '../lib/curation-assemble.ts';

/**
 * The admin curation tree must answer one question correctly: which shelf does
 * this row sit on, and which picture does that shelf show?
 *
 * Both are pure arithmetic over the registry, so they are tested without a
 * database. A mistake here is invisible on the site (the site derives its own
 * covers) but makes the admin screen lie about what is pinned.
 */

function row(partial: Partial<CurationRow> & { id: string; title: string }): CurationRow {
  return {
    slug: partial.id,
    category: 'live_event',
    subtype: null,
    project_kind: 'event',
    work_id: null,
    event_date: null,
    release_date: null,
    cover_url: null,
    ...partial,
  };
}

describe('assembleCurationTree', () => {
  test('a hall with sub-classes gets one shelf each, plus an unfiled bucket', () => {
    const doors = assembleCurationTree({
      rows: [
        row({ id: 'a', title: 'Manila', subtype: 'fanmeeting', event_date: '2026-09-19' }),
        row({ id: 'b', title: 'Bangkok', subtype: 'fanmeeting', event_date: '2026-03-01' }),
        row({ id: 'c', title: 'Birthday', subtype: 'birthday', event_date: '2025-12-01' }),
        row({ id: 'd', title: 'Stray', subtype: null, event_date: '2025-01-01' }),
      ],
      assets: [],
      shelfCovers: new Map(),
    });

    const door = doors.find((item) => item.key === 'live_event');
    assert.ok(door);

    const fanmeeting = door.shelves.find((shelf) => shelf.key === '/live-events/fanmeeting');
    assert.ok(fanmeeting);
    assert.equal(fanmeeting.count, 2);
    // newest first inside a shelf
    assert.deepEqual(
      fanmeeting.events.map((event) => event.title),
      ['Manila', 'Bangkok']
    );
    assert.equal(door.shelves.at(-1)?.label, '未归类');
  });

  test('a pinned shelf cover wins over the first covered entry', () => {
    const doors = assembleCurationTree({
      rows: [
        row({
          id: 'a',
          title: 'Manila',
          subtype: 'fanmeeting',
          event_date: '2026-09-19',
          cover_url: 'https://cdn.lmsy.space/from-event.webp',
        }),
      ],
      assets: [],
      shelfCovers: new Map([['/live-events/fanmeeting', 'https://cdn.lmsy.space/pinned.webp']]),
    });

    const shelf = doors
      .find((item) => item.key === 'live_event')
      ?.shelves.find((item) => item.key === '/live-events/fanmeeting');

    assert.equal(shelf?.cover, 'https://cdn.lmsy.space/pinned.webp');
    assert.equal(shelf?.pinned, true);
  });

  test('a row with no cover falls back to its first page, unsorted assets do not matter', () => {
    const doors = assembleCurationTree({
      rows: [row({ id: 'p1', title: 'Issue', category: 'editorial', event_date: '2026-07-01' })],
      assets: [
        {
          id: 'x2',
          project_id: 'p1',
          image_url: 'https://cdn.lmsy.space/page-002.webp',
          catalog_id: 'MAG-X-002',
          portal_slot: null,
          interview_slot: null,
        },
        {
          id: 'x1',
          project_id: 'p1',
          image_url: 'https://cdn.lmsy.space/page-001.webp',
          catalog_id: 'MAG-X-001',
          portal_slot: null,
          interview_slot: null,
        },
      ],
      shelfCovers: new Map(),
    });

    const event = doors.find((item) => item.key === 'editorial')?.events[0];
    assert.equal(event?.cover, 'https://cdn.lmsy.space/page-001.webp');
    assert.equal(event?.pinned, false);
    assert.equal(event?.imageCount, 2);
  });

  test('talk categories are one door with three category shelves', () => {
    const doors = assembleCurationTree({
      rows: [
        row({ id: 'i1', title: 'Praew', category: 'interview', event_date: '2025-09-08' }),
        row({ id: 'r1', title: 'Radio hour', category: 'radio', event_date: '2025-06-01' }),
      ],
      assets: [],
      shelfCovers: new Map(),
    });

    const talks = doors.find((item) => item.key === 'talks');
    assert.ok(talks);
    assert.deepEqual(
      talks.shelves.map((shelf) => shelf.key),
      ['/talks/interview', '/talks/variety', '/talks/radio']
    );
    assert.equal(talks.shelves[0].count, 1);
    assert.equal(talks.shelves[1].count, 0);
  });

  test('series are the second level of door 1 and own their cover', () => {
    const doors = assembleCurationTree({
      rows: [
        row({
          id: 's1',
          title: 'Hometown Romance',
          category: 'drama_work',
          project_kind: 'series',
          work_id: 'w1',
          event_date: '2026-04-03',
          cover_url: 'https://cdn.lmsy.space/series.webp',
        }),
        row({
          id: 'e1',
          title: 'Premiere',
          category: 'drama_work',
          work_id: 'w1',
          event_date: '2026-04-03',
        }),
      ],
      assets: [],
      shelfCovers: new Map(),
    });

    const shelf = doors.find((item) => item.key === 'drama_work')?.shelves[0];
    assert.equal(shelf?.label, 'Hometown Romance');
    assert.equal(shelf?.path, null);
    assert.equal(shelf?.count, 1);
    assert.equal(shelf?.cover, 'https://cdn.lmsy.space/series.webp');
  });
});
