/**
 * Guards for search term sanitization (remediation B2-T3, audit P1-5).
 *
 * The search API interpolates the term into PostgREST .or() filter syntax.
 * These tests pin the sanitizer's contract: nothing that carries meaning in
 * the filter grammar survives, and the output is clamped.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeSearchTerm,
  MAX_SEARCH_TERM_LENGTH,
  MIN_SEARCH_TERM_LENGTH,
} from '../lib/search-term.ts';

describe('sanitizeSearchTerm', () => {
  test('keeps plain words and lowercases', () => {
    assert.equal(sanitizeSearchTerm('  Radar '), 'radar');
    assert.equal(sanitizeSearchTerm('Lookmhee'), 'lookmhee');
  });

  test('strips or()-syntax separators and grouping', () => {
    assert.equal(sanitizeSearchTerm('foo,bar'), 'foobar');
    assert.equal(sanitizeSearchTerm('fo(o)b'), 'foob');
    assert.equal(sanitizeSearchTerm('foo)or(tag.eq'), 'fooortag.eq');
  });

  test('strips wildcard characters so they cannot widen the match', () => {
    assert.equal(sanitizeSearchTerm('foo%bar'), 'foobar');
    assert.equal(sanitizeSearchTerm('fo*o'), 'foo');
    assert.equal(sanitizeSearchTerm('fo_o_b'), 'foob');
  });

  test('a term made only of dangerous characters becomes empty', () => {
    assert.equal(sanitizeSearchTerm('%'), '');
    assert.equal(sanitizeSearchTerm('(),()'), '');
    assert.equal(sanitizeSearchTerm('***'), '');
  });

  test('clamps to the maximum length', () => {
    assert.equal(sanitizeSearchTerm('a'.repeat(500)).length, MAX_SEARCH_TERM_LENGTH);
  });

  test('length thresholds match the route contract', () => {
    // The route returns empty results below MIN_SEARCH_TERM_LENGTH.
    assert.ok(MIN_SEARCH_TERM_LENGTH >= 1);
    assert.ok(MAX_SEARCH_TERM_LENGTH >= MIN_SEARCH_TERM_LENGTH);
  });
});
