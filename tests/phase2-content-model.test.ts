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
  // Door codes come from the canonical naming spec
  // (docs/architecture/20261021-asset-naming.md section 3). The previous
  // STILL/STAGE/DAILY/TRV/AD mapping was a different scheme that produced IDs
  // no page could read, so it is intentionally gone.
  assert.deepEqual(CATEGORY_TO_CATALOG_PREFIX, {
    drama_work: 'DRAMA',
    editorial: 'MAG',
    live_event: 'EVENT',
    public_appearance: 'APPEAR',
    commercial: 'BRAND',
    talks: 'TALK',
    live: 'LIVE',
    behind_the_scenes: 'BTS',
    early_archive: 'EARLY',
  });
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
