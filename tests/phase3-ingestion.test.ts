import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildManualDraftRecord } from '../lib/manual-draft.ts';
import { buildProvenanceFields } from '../lib/provenance.ts';
import { isCatalogIdConflict, isDuplicateFileHash } from '../lib/catalog-id.ts';

// ---------------------------------------------------------------------------
// Phase 3 P0-1: manual upload payloads must satisfy
// draft_items_source_platform_required ((url NOT NULL AND platform NOT NULL)
// OR (url IS NULL AND platform IS NULL)). Manual uploads have no source page,
// so both must stay NULL and 'manual' lives in tags[0].
// ---------------------------------------------------------------------------

function assertSatisfiesSourceCheck(record: { source_url: unknown; source_platform: unknown }) {
  const bothSet = record.source_url !== null && record.source_platform !== null;
  const bothNull = record.source_url === null && record.source_platform === null;
  assert.ok(
    bothSet || bothNull,
    `payload violates draft_items_source_platform_required: url=${record.source_url} platform=${record.source_platform}`
  );
}

test('manual draft record satisfies the source CHECK (both NULL)', () => {
  const record = buildManualDraftRecord({
    catalogId: 'LMSY-MAG-20261017-001',
    r2Key: 'magazines/2026/LMSY-MAG-20261017-001.webp',
    imageUrl: 'https://cdn.example.com/magazines/2026/LMSY-MAG-20261017-001.webp',
    eventDate: '2026-10-17',
    caption: 'Cover',
    tag: 'Magazine',
    projectId: 'p1',
    isFeatured: true,
  });

  assertSatisfiesSourceCheck(record);
  assert.equal(record.source_platform, null);
  assert.equal(record.source_url, null);
});

test('manual draft record marks provenance in tags[0], keeps chosen tag second', () => {
  const withTag = buildManualDraftRecord({
    catalogId: 'LMSY-MAG-20261017-001',
    r2Key: 'k',
    imageUrl: 'https://cdn.example.com/k',
    eventDate: '2026-10-17',
    caption: null,
    tag: 'Magazine',
    projectId: null,
    isFeatured: false,
  });
  assert.deepEqual(withTag.tags, ['manual', 'Magazine']);

  const withoutTag = buildManualDraftRecord({
    catalogId: 'LMSY-MAG-20261017-001',
    r2Key: 'k',
    imageUrl: 'https://cdn.example.com/k',
    eventDate: '2026-10-17',
    caption: null,
    tag: null,
    projectId: null,
    isFeatured: false,
  });
  assert.deepEqual(withoutTag.tags, ['manual']);
});

test('manual draft record normalizes caption and empty projectId', () => {
  const record = buildManualDraftRecord({
    catalogId: 'LMSY-G-20261017-001',
    r2Key: 'k',
    imageUrl: 'https://cdn.example.com/k',
    eventDate: '2026-10-17',
    caption: '   ',
    tag: '  ',
    projectId: '',
    isFeatured: false,
  });
  assert.equal(record.title.en, '');
  assert.equal(record.project_id, null);
  assert.deepEqual(record.tags, ['manual']);
  assert.equal(record.status, 'draft');
  assert.equal(record.ingestion_stage, 'ready');
  assert.equal(record.source_post_id, 'LMSY-G-20261017-001');
  assert.equal(record.event_date, record.raw_event_date);
});

test('manual draft record keeps catalog id traceable in source_post_id', () => {
  const record = buildManualDraftRecord({
    catalogId: 'LMSY-AD-20261017-004',
    r2Key: 'k',
    imageUrl: 'https://cdn.example.com/k',
    eventDate: '2026-10-17',
    caption: null,
    tag: null,
    projectId: null,
    isFeatured: false,
  });
  assert.equal(record.source_post_id, 'LMSY-AD-20261017-004');
});

// ---------------------------------------------------------------------------
// Provenance normalization (promotion path): empty -> NULL, never faked
// ---------------------------------------------------------------------------

test('buildProvenanceFields trims and nulls empty provenance values', () => {
  assert.deepEqual(
    buildProvenanceFields({ source_url: '  ', source_platform: 'telegram', source_account: ' x ' }),
    { source_url: null, source_platform: 'telegram', source_account: 'x' }
  );
  assert.deepEqual(buildProvenanceFields(null), {
    source_url: null,
    source_platform: null,
    source_account: null,
  });
});

// ---------------------------------------------------------------------------
// Error classification: 23505 retry is only for real conflicts
// ---------------------------------------------------------------------------

test('conflict helpers distinguish unique violations from other DB errors', () => {
  assert.equal(isCatalogIdConflict({ code: '23505' }), true);
  assert.equal(isCatalogIdConflict({ message: 'duplicate key value violates unique constraint "gallery_assets_catalog_id_key"' }), true);
  assert.equal(isCatalogIdConflict({ code: '23514', message: 'new row violates check constraint' }), false);
  assert.equal(isCatalogIdConflict({ code: '42P01', message: 'relation does not exist' }), false);
  assert.equal(isCatalogIdConflict(null), false);

  assert.equal(isDuplicateFileHash({ code: '23505', message: 'duplicate key ... file_hash ...' }), true);
  assert.equal(isDuplicateFileHash({ code: '23505', message: 'duplicate key ... catalog_id ...' }), false);
  assert.equal(isDuplicateFileHash({ code: '23514' }), false);
});
