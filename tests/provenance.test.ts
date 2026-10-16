import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProvenanceFields, deriveTelegramDraftDates } from '../lib/provenance.ts';

test('buildProvenanceFields passes through a complete draft provenance', () => {
  const out = buildProvenanceFields({
    source_url: 'https://t.me/lmsy_channel/123',
    source_platform: 'telegram',
  });
  assert.deepEqual(out, {
    source_url: 'https://t.me/lmsy_channel/123',
    source_platform: 'telegram',
  });
});

test('buildProvenanceFields trims whitespace around values', () => {
  const out = buildProvenanceFields({
    source_url: '  https://example.com/post/1  ',
    source_platform: ' weibo ',
  });
  assert.equal(out.source_url, 'https://example.com/post/1');
  assert.equal(out.source_platform, 'weibo');
});

test('buildProvenanceFields maps empty and whitespace-only values to null', () => {
  assert.deepEqual(buildProvenanceFields({ source_url: '', source_platform: '   ' }), {
    source_url: null,
    source_platform: null,
  });
});

test('buildProvenanceFields tolerates null, undefined and missing drafts', () => {
  assert.deepEqual(buildProvenanceFields(null), { source_url: null, source_platform: null });
  assert.deepEqual(buildProvenanceFields(undefined), { source_url: null, source_platform: null });
  assert.deepEqual(buildProvenanceFields({}), { source_url: null, source_platform: null });
  assert.deepEqual(buildProvenanceFields({ source_url: null, source_platform: null }), {
    source_url: null,
    source_platform: null,
  });
});

test('deriveTelegramDraftDates never sets event_date - send time is evidence only', () => {
  const sendTime = new Date('2026-10-15T05:57:08.000Z');
  const out = deriveTelegramDraftDates(sendTime);
  assert.equal(out.event_date, null);
  assert.equal(out.raw_event_date, '2026-10-15T05:57:08.000Z');
});

test('deriveTelegramDraftDates preserves the exact instant in ISO format', () => {
  const out = deriveTelegramDraftDates(new Date('2026-03-16T01:55:39.000Z'));
  assert.equal(out.raw_event_date, '2026-03-16T01:55:39.000Z');
  assert.equal(out.event_date, null);
});
