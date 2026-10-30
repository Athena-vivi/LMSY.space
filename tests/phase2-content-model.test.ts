import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAssetTagFromDraft } from '../lib/asset-tag.ts';
import {
  allocateNextCatalogId,
  isCatalogIdConflict,
  CATEGORY_TO_CATALOG_PREFIX,
  DOOR_CODES,
  generateCatalogId,
  parseCatalogId,
} from '../lib/catalog-id.ts';
import { PROJECT_CATEGORIES } from '../lib/category-registry.ts';

// ---------------------------------------------------------------------------
// Task 1: source-channel words must never become the formal image tag
// ---------------------------------------------------------------------------

test('resolveAssetTagFromDraft ignores source-channel tags (e.g. Telegram)', () => {
  // Regression: to-gallery used to write draft.tags[0] (e.g. 'Telegram')
  // into gallery_assets.tag — a platform name leaking into the content
  // classification (ADR-001 D3).
  assert.equal(resolveAssetTagFromDraft(['Telegram', 'photo']), null);
  assert.equal(resolveAssetTagFromDraft(['weibo']), null);
});

test('resolveAssetTagFromDraft returns null for empty or missing tags', () => {
  assert.equal(resolveAssetTagFromDraft([]), null);
  assert.equal(resolveAssetTagFromDraft(undefined), null);
  assert.equal(resolveAssetTagFromDraft(null), null);
  assert.equal(resolveAssetTagFromDraft('not-an-array'), null);
});

// ---------------------------------------------------------------------------
// Task 3: shared catalog_id allocation (manual upload + draft promotion)
// ---------------------------------------------------------------------------

/**
 * Minimal PostgREST stand-in for the allocator: it holds a list of ids, answers
 * the LIKE prefix filter, and honours the .range() window. Ids are returned in
 * ascending string order, exactly as the database would.
 */
function mkSupabase(existing: string | string[] | null) {
  const all = existing === null ? [] : Array.isArray(existing) ? existing : [existing];
  let likePrefix: string | null = null;
  const chain = {
    select: () => chain,
    like: (_col: string, prefix: string) => {
      likePrefix = prefix;
      return chain;
    },
    order: () => chain,
    range: async (from: number, to: number) => {
      const pattern = likePrefix !== null ? likePrefix.replace(/%/g, '') : '';
      const matched = all
        .filter((id) => id.startsWith(pattern))
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      return { data: matched.slice(from, to + 1).map((catalog_id) => ({ catalog_id })), error: null };
    },
  };
  return { schema: () => ({ from: () => chain }) };
}

test('allocateNextCatalogId starts at 001 when nothing exists for the date', async () => {
  const id = await allocateNextCatalogId(mkSupabase(null), 'MAG', '2024-10-23');
  assert.equal(id, 'LMSY-MAG-20241023-001');
});

test('allocateNextCatalogId continues after the highest existing sequence', async () => {
  const id = await allocateNextCatalogId(mkSupabase('LMSY-MAG-20241023-004'), 'MAG', '2024-10-23');
  assert.equal(id, 'LMSY-MAG-20241023-005');
});

test('allocateNextCatalogId falls back to 001 on an unparseable max row', async () => {
  const id = await allocateNextCatalogId(mkSupabase('LMSY-MAG-20241023-XYZ'), 'MAG', '2024-10-23');
  assert.equal(id, 'LMSY-MAG-20241023-001');
});

test('allocateNextCatalogId is scoped to the category prefix', async () => {
  const id = await allocateNextCatalogId(mkSupabase('LMSY-MAG-20241023-004'), 'AD', '2024-10-23');
  assert.equal(id, 'LMSY-AD-20241023-001');
});

test('allocateNextCatalogId keeps counting when a prefix holds two id shapes', async () => {
  // 2026-10-30: Affair series stills held `...-20241028-001..009` next to a
  // `...-010`. The dated ids sort above the plain one, so reading the greatest
  // string returned 009 and every retry asked for 010 - which was taken. The
  // numeric maximum is 010, so the next free id is 011.
  const id = await allocateNextCatalogId(
    mkSupabase([
      'LMSY-DRAMA-AFFAIR-SERIESSTILLS-20241028-001',
      'LMSY-DRAMA-AFFAIR-SERIESSTILLS-20241028-009',
      'LMSY-DRAMA-AFFAIR-SERIESSTILLS-010',
    ]),
    'DRAMA',
    null,
    { head: 'LMSY-DRAMA-AFFAIR-SERIESSTILLS' }
  );
  assert.equal(id, 'LMSY-DRAMA-AFFAIR-SERIESSTILLS-011');
});

test('allocateNextCatalogId reads sequences past 999 as numbers', async () => {
  const id = await allocateNextCatalogId(mkSupabase('LMSY-DRAMA-X-SERIESSTILLS-1000'), 'DRAMA', null, {
    head: 'LMSY-DRAMA-X-SERIESSTILLS',
  });
  assert.equal(id, 'LMSY-DRAMA-X-SERIESSTILLS-1001');
});

test('CATEGORY_TO_CATALOG_PREFIX maps every real category onto a legal door code', () => {
  // Door codes come from the canonical naming spec
  // (docs/architecture/20261021-asset-naming.md section 3). The previous
  // STILL/STAGE/DAILY/TRV/AD mapping was a different scheme that produced IDs
  // no page could read, so it is intentionally gone.
  //
  // The key list is pinned to lib/category-registry.ts rather than written out
  // here: a category added there without a door code (or a leftover key for a
  // category that no longer exists) has to fail this test, not slip through.
  assert.deepEqual(
    Object.keys(CATEGORY_TO_CATALOG_PREFIX).sort(),
    PROJECT_CATEGORIES.filter((c) => c !== 'personal_travel').sort()
  );

  for (const [category, door] of Object.entries(CATEGORY_TO_CATALOG_PREFIX)) {
    assert.ok(
      (DOOR_CODES as readonly string[]).includes(door),
      `${category} maps to "${door}", which is not a door code`
    );
  }

  // The five homepage entries. A theme is NOT a category: it is
  // project_kind = 'theme' and reaches the FEAT door through
  // doorCodeForProject(), so it never appears as a key here.
  assert.deepEqual(
    {
      drama_work: CATEGORY_TO_CATALOG_PREFIX.drama_work,
      editorial: CATEGORY_TO_CATALOG_PREFIX.editorial,
      live_event: CATEGORY_TO_CATALOG_PREFIX.live_event,
      public_appearance: CATEGORY_TO_CATALOG_PREFIX.public_appearance,
      commercial: CATEGORY_TO_CATALOG_PREFIX.commercial,
    },
    {
      drama_work: 'DRAMA',
      editorial: 'MAG',
      live_event: 'EVENT',
      public_appearance: 'APPEAR',
      commercial: 'BRAND',
    }
  );

  // Two halls store their second level AS the category, so the project
  // category is the shelf / the platform - never the door name. `talks` and
  // `live` are door names, not categories, and must not come back as keys.
  assert.deepEqual(
    {
      interview: CATEGORY_TO_CATALOG_PREFIX.interview,
      variety: CATEGORY_TO_CATALOG_PREFIX.variety,
      radio: CATEGORY_TO_CATALOG_PREFIX.radio,
      live_stream: CATEGORY_TO_CATALOG_PREFIX.live_stream,
    },
    { interview: 'TALK', variety: 'TALK', radio: 'TALK', live_stream: 'LIVE' }
  );

  // Legacy halls: the codes stay parseable for the rows that already carry
  // them, but neither has a front door any more.
  assert.equal(CATEGORY_TO_CATALOG_PREFIX.behind_the_scenes, 'BTS');
  assert.equal(CATEGORY_TO_CATALOG_PREFIX.early_archive, 'EARLY');
});

test('allocated ids satisfy the catalog-id format and round-trip parsing', async () => {
  const id = await allocateNextCatalogId(
    mkSupabase('LMSY-MAG-THER-HEARTBEATFORYOU-20241023-004'),
    'MAG',
    '2024-10-23',
    { subject: 'THER-HEARTBEATFORYOU' }
  );
  assert.equal(id, 'LMSY-MAG-THER-HEARTBEATFORYOU-20241023-005');
  const parsed = parseCatalogId(id);
  assert.equal(parsed?.sequence, 5);
  assert.equal(parsed?.door, 'MAG');
  assert.equal(parsed?.subject, 'THER-HEARTBEATFORYOU');
});

test('buildCatalogId produces the canonical shape and omits empty segments', () => {
  assert.equal(
    generateCatalogId({ person: 'LMSY', door: 'MAG', subject: 'THER-HEARTBEATFORYOU', date: '2024-10-23', sequence: 1 }),
    'LMSY-MAG-THER-HEARTBEATFORYOU-20241023-001'
  );
  // Date unknown -> the whole segment is dropped, never a placeholder.
  assert.equal(
    generateCatalogId({ person: 'LM', door: 'MAG', subject: 'OAT', sequence: 12 }),
    'LM-MAG-OAT-012'
  );
  // There is no -000 cover: sequence 001 is the first file of a batch.
  assert.equal(parseCatalogId('LMSY-MAG-20241023-000'), null);
});

// ---------------------------------------------------------------------------
// Task 3: conflict classification (DB unique index is the final authority)
// ---------------------------------------------------------------------------

test('isCatalogIdConflict recognises unique-violation errors', () => {
  assert.equal(isCatalogIdConflict({ code: '23505', message: 'duplicate key value' }), true);
  assert.equal(isCatalogIdConflict({ message: 'duplicate key value violates unique constraint' }), true);
  assert.equal(isCatalogIdConflict(null), false);
  assert.equal(isCatalogIdConflict({ code: '42P01', message: 'relation does not exist' }), false);
});
