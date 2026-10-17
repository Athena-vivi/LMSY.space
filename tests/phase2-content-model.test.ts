import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAssetTagFromDraft } from '../lib/asset-tag.ts';
import {
  allocateNextCatalogId,
  isCatalogIdConflict,
  CATEGORY_TO_CATALOG_PREFIX,
  generateCatalogId,
  parseCatalogId,
} from '../lib/catalog-id.ts';

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

function mkSupabase(existingCatalogId: string | null) {
  let likePrefix: string | null = null;
  const chain = {
    select: () => chain,
    like: (_col: string, prefix: string) => {
      likePrefix = prefix;
      return chain;
    },
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => {
      // Emulate the SQL prefix filter: a row whose catalog_id does not start
      // with the requested LMSY-<prefix>-<date> pattern is not returned.
      const pattern = likePrefix !== null ? likePrefix.replace(/%/g, '') : null;
      const matches = existingCatalogId && pattern !== null && existingCatalogId.startsWith(pattern);
      return {
        data: matches ? { catalog_id: existingCatalogId } : null,
        error: null,
      };
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

test('CATEGORY_TO_CATALOG_PREFIX keeps the existing production mapping', () => {
  // Guard: these prefixes already exist in real catalog_id data; changing
  // them would fork the numbering scheme (ADR-001 D5).
  assert.deepEqual(CATEGORY_TO_CATALOG_PREFIX, {
    series: 'STILL',
    editorial: 'MAG',
    appearance: 'STAGE',
    daily: 'DAILY',
    travel: 'TRV',
    commercial: 'AD',
  });
});

test('allocated ids satisfy the catalog-id format and round-trip parsing', async () => {
  const id = await allocateNextCatalogId(mkSupabase('LMSY-MAG-20241023-004'), 'MAG', '2024-10-23');
  assert.ok(/^LMSY-[A-Z]+-\d{8}-\d{3}$/.test(id));
  const parsed = parseCatalogId(id);
  assert.equal(parsed?.sequence, 5);
});

test('generateCatalogId keeps the standard format (cover = 000)', () => {
  assert.equal(generateCatalogId({ category: 'MAG', eventDate: '2024-10-23', sequence: 0 }), 'LMSY-MAG-20241023-000');
  assert.equal(generateCatalogId({ category: 'G', eventDate: '2024-10-23', sequence: 1 }), 'LMSY-G-20241023-001');
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
