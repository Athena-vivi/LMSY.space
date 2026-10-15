/**
 * Deep security tests for the phase 1 hardening.
 *
 * Run with: npm test
 * (node --experimental-strip-types --test tests/)
 *
 * Why these modules: they are the pieces that decide whether a request is
 * allowed. They are dependency-free on purpose, so they can be exercised
 * without a running Next.js server or a database.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { timingSafeEqualString, matchesAnySecret, isStrongEnoughKey, MIN_MACHINE_KEY_LENGTH } from '../lib/security/timing-safe.ts';
import { getAdminEmail, isAdminEmail } from '../lib/security/admin-email.ts';
import { requireMachineKey } from '../lib/security/machine-auth.ts';
import { consumeRateLimit, resetRateLimit, peekRateLimit, clearAllRateLimits } from '../lib/security/rate-limit.ts';
import {
  validateUploadFile,
  validateObjectKey,
  sanitizeFilename,
  isAllowedMimeType,
  sniffImageMime,
  UPLOAD_POLICY,
} from '../lib/security/upload-guard.ts';
import { isCatalogIdConflict, isDuplicateFileHash, generateCatalogId, CATALOG_ID_MAX_ATTEMPTS } from '../lib/catalog-id.ts';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Minimal structural stand-in for NextRequest (the guard only uses these). */
function makeRequest(url: string, headers: Record<string, string> = {}) {
  const lower = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    url,
    headers: { get: (name: string) => lower.get(name.toLowerCase()) ?? null },
    nextUrl: { searchParams: { get: (name: string) => new URL(url).searchParams.get(name) } },
  };
}

const SECRET = 'a'.repeat(40);

/** Minimal File-like object; uses the real File when available. */
function fakeFile(bytes: number[], name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0];
const GIF_HEADER = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

// ---------------------------------------------------------------------------
// timing-safe
// ---------------------------------------------------------------------------

describe('timing-safe comparison', () => {
  test('matches identical strings', () => {
    assert.equal(timingSafeEqualString('abc123', 'abc123'), true);
  });

  test('rejects different values, different lengths and empty input', () => {
    assert.equal(timingSafeEqualString('abc123', 'abc124'), false);
    assert.equal(timingSafeEqualString('abc', 'abc123'), false);
    assert.equal(timingSafeEqualString('', ''), false);
    assert.equal(timingSafeEqualString(null, 'abc'), false);
    assert.equal(timingSafeEqualString('abc', undefined), false);
  });

  test('never matches an empty expected secret', () => {
    assert.equal(matchesAnySecret('', ['']), false);
    assert.equal(matchesAnySecret('anything', ['', undefined, null]), false);
  });

  test('matches any of several candidates and trims whitespace', () => {
    assert.equal(matchesAnySecret(' second ', ['first', 'second']), true);
    assert.equal(matchesAnySecret('third', ['first', 'second']), false);
  });

  test('enforces a minimum machine key length', () => {
    assert.equal(isStrongEnoughKey('x'.repeat(MIN_MACHINE_KEY_LENGTH)), true);
    assert.equal(isStrongEnoughKey('x'.repeat(MIN_MACHINE_KEY_LENGTH - 1)), false);
  });
});

// ---------------------------------------------------------------------------
// admin email resolution
// ---------------------------------------------------------------------------

describe('admin email resolution', () => {
  const originalAdmin = process.env.ADMIN_EMAIL;
  const originalPublic = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  afterEach(() => {
    if (originalAdmin === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = originalAdmin;
    if (originalPublic === undefined) delete process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    else process.env.NEXT_PUBLIC_ADMIN_EMAIL = originalPublic;
  });

  test('prefers ADMIN_EMAIL and normalizes case/whitespace', () => {
    process.env.ADMIN_EMAIL = '  Owner@Example.COM ';
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = 'other@example.com';
    assert.equal(getAdminEmail(), 'owner@example.com');
  });

  test('falls back to the public variable only when the server one is absent', () => {
    delete process.env.ADMIN_EMAIL;
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = 'Legacy@Example.com';
    assert.equal(getAdminEmail(), 'legacy@example.com');
  });

  test('fails closed when nothing is configured', () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    assert.equal(getAdminEmail(), null);
    assert.equal(isAdminEmail('owner@example.com'), false);
  });

  test('isAdminEmail is case-insensitive and rejects others', () => {
    process.env.ADMIN_EMAIL = 'owner@example.com';
    assert.equal(isAdminEmail('OWNER@example.com'), true);
    assert.equal(isAdminEmail('intruder@example.com'), false);
    assert.equal(isAdminEmail(null), false);
  });
});

// ---------------------------------------------------------------------------
// machine key guard
// ---------------------------------------------------------------------------

describe('machine key guard', () => {
  const originalCron = process.env.CRON_SECRET;
  const originalTeamSecret = process.env.TEST_MACHINE_SECRET;

  beforeEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.TEST_MACHINE_SECRET;
  });

  afterEach(() => {
    if (originalCron === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCron;
    if (originalTeamSecret === undefined) delete process.env.TEST_MACHINE_SECRET;
    else process.env.TEST_MACHINE_SECRET = originalTeamSecret;
  });

  test('fails closed with 503 when the secret is not configured', () => {
    const result = requireMachineKey(makeRequest('https://x.test/api/cron'), {
      envVars: ['CRON_SECRET'],
      label: 'test',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.response.status, 503);
  });

  test('the literal "Bearer undefined" can never authenticate', () => {
    const result = requireMachineKey(
      makeRequest('https://x.test/api/cron', { authorization: 'Bearer undefined' }),
      { envVars: ['CRON_SECRET'], label: 'test' }
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.response.status, 503);
  });

  test('rejects a wrong bearer token and accepts the right one', () => {
    process.env.CRON_SECRET = SECRET;
    const wrong = requireMachineKey(
      makeRequest('https://x.test/api/cron', { authorization: 'Bearer nope' }),
      { envVars: ['CRON_SECRET'], label: 'test' }
    );
    assert.equal(wrong.ok, false);
    if (!wrong.ok) assert.equal(wrong.response.status, 401);

    const right = requireMachineKey(
      makeRequest('https://x.test/api/cron', { authorization: `Bearer ${SECRET}` }),
      { envVars: ['CRON_SECRET'], label: 'test' }
    );
    assert.equal(right.ok, true);
    if (right.ok) assert.equal(right.via, 'bearer');
  });

  test('accepts a dedicated secret header, with or without the Bearer prefix', () => {
    process.env.TEST_MACHINE_SECRET = SECRET;
    for (const value of [SECRET, `Bearer ${SECRET}`]) {
      const result = requireMachineKey(
        makeRequest('https://x.test/api/webhook', { 'x-test-key': value }),
        { envVars: ['TEST_MACHINE_SECRET'], secretHeader: 'x-test-key', label: 'test' }
      );
      assert.equal(result.ok, true);
    }
  });

  test('still accepts the legacy query parameter (flagged as deprecated)', () => {
    process.env.CRON_SECRET = SECRET;
    const result = requireMachineKey(
      makeRequest(`https://x.test/api/cron?secret=${SECRET}`),
      { envVars: ['CRON_SECRET'], queryParam: 'secret', label: 'test' }
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.via, 'query');
  });

  test('rejects the wrong query parameter value', () => {
    process.env.CRON_SECRET = SECRET;
    const result = requireMachineKey(
      makeRequest('https://x.test/api/cron?secret=wrong'),
      { envVars: ['CRON_SECRET'], queryParam: 'secret', label: 'test' }
    );
    assert.equal(result.ok, false);
  });

  test('a weak configured secret is still enforced (not silently ignored)', () => {
    process.env.CRON_SECRET = 'short';
    const ok = requireMachineKey(
      makeRequest('https://x.test/api/cron', { authorization: 'Bearer short' }),
      { envVars: ['CRON_SECRET'], label: 'test' }
    );
    assert.equal(ok.ok, true, 'a weak key still protects the endpoint (it is only logged)');
    const bad = requireMachineKey(
      makeRequest('https://x.test/api/cron', { authorization: 'Bearer other' }),
      { envVars: ['CRON_SECRET'], label: 'test' }
    );
    assert.equal(bad.ok, false);
  });
});

// ---------------------------------------------------------------------------
// rate limiting
// ---------------------------------------------------------------------------

describe('login rate limiting', () => {
  beforeEach(() => clearAllRateLimits());

  test('allows up to the limit and then blocks with Retry-After', () => {
    const key = 'login:1.2.3.4:owner@example.com';
    for (let i = 0; i < 3; i++) {
      assert.equal(consumeRateLimit(key, { limit: 3, windowMs: 1000, blockMs: 500 }).allowed, true);
    }
    const blocked = consumeRateLimit(key, { limit: 3, windowMs: 1000, blockMs: 500 });
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds >= 1);
    assert.equal(peekRateLimit(key).allowed, false);
  });

  test('independent keys do not interfere', () => {
    assert.equal(consumeRateLimit('a', { limit: 1, windowMs: 1000 }).allowed, true);
    assert.equal(consumeRateLimit('a', { limit: 1, windowMs: 1000 }).allowed, false);
    assert.equal(consumeRateLimit('b', { limit: 1, windowMs: 1000 }).allowed, true);
  });

  test('a successful login resets the counter for that identity', () => {
    const key = 'login:1.2.3.4:owner@example.com';
    consumeRateLimit(key, { limit: 2, windowMs: 1000, blockMs: 1000 });
    consumeRateLimit(key, { limit: 2, windowMs: 1000, blockMs: 1000 });
    resetRateLimit(key);
    assert.equal(consumeRateLimit(key, { limit: 2, windowMs: 1000, blockMs: 1000 }).allowed, true);
  });

  test('the window expires', async () => {
    const key = 'window-test';
    consumeRateLimit(key, { limit: 1, windowMs: 60, blockMs: 0 });
    assert.equal(consumeRateLimit(key, { limit: 1, windowMs: 60, blockMs: 0 }).allowed, false);
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(consumeRateLimit(key, { limit: 1, windowMs: 60, blockMs: 0 }).allowed, true);
  });
});

// ---------------------------------------------------------------------------
// upload validation
// ---------------------------------------------------------------------------

describe('upload validation', () => {
  test('rejects SVG (active content) and unknown types', () => {
    assert.equal(isAllowedMimeType('image/svg+xml'), false);
    assert.equal(isAllowedMimeType('application/pdf'), false);
    assert.equal(isAllowedMimeType('image/jpeg'), true);
    assert.equal(isAllowedMimeType('image/webp'), true);
  });

  test('sniffs real content and refuses a renamed file', async () => {
    const pngOk = await validateUploadFile(fakeFile(PNG_HEADER, 'a.png', 'image/png'));
    assert.equal(pngOk.ok, true);

    // A text file claiming to be a PNG must be rejected by magic bytes.
    const fake = await validateUploadFile(fakeFile([0x3c, 0x68, 0x74, 0x6d, 0x6c], 'evil.png', 'image/png'));
    assert.equal(fake.ok, false);
    if (!fake.ok) assert.equal(fake.status, 415);

    // An SVG renamed to .jpg: declared type allowed, content rejected.
    const svg = await validateUploadFile(fakeFile([0x3c, 0x73, 0x76, 0x67], 'x.jpg', 'image/jpeg'));
    assert.equal(svg.ok, false);
  });

  test('accepts jpeg and gif headers', async () => {
    assert.equal((await validateUploadFile(fakeFile(JPEG_HEADER, 'a.jpg', 'image/jpeg'))).ok, true);
    assert.equal((await validateUploadFile(fakeFile(GIF_HEADER, 'a.gif', 'image/gif'))).ok, true);
  });

  test('rejects oversized files, empty files and missing files', async () => {
    const big = new File([new Uint8Array(10)], 'big.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: UPLOAD_POLICY.maxFileSizeBytes + 1 });
    const tooBig = await validateUploadFile(big);
    assert.equal(tooBig.ok, false);
    if (!tooBig.ok) assert.equal(tooBig.status, 413);

    const empty = await validateUploadFile(fakeFile([], 'e.png', 'image/png'));
    assert.equal(empty.ok, false);

    const missing = await validateUploadFile(null);
    assert.equal(missing.ok, false);
  });

  test('sniffImageMime returns null for unknown bytes', () => {
    assert.equal(sniffImageMime(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])), null);
  });

  test('object keys are confined to allowed prefixes and traversal is blocked', () => {
    assert.equal(validateObjectKey('draft/telegram/2026/02/a.jpg', ['draft/']).ok, true);
    assert.equal(validateObjectKey('magazines/2025/LMSY-MAG-20250117-001.webp', ['magazines/']).ok, true);
    assert.equal(validateObjectKey('../../etc/passwd', ['draft/']).ok, false);
    assert.equal(validateObjectKey('draft/../secret.txt', ['draft/']).ok, false);
    assert.equal(validateObjectKey('/draft/a.jpg', ['draft/']).ok, false);
    assert.equal(validateObjectKey('other/a.jpg', ['draft/']).ok, false);
    assert.equal(validateObjectKey('', ['draft/']).ok, false);
  });

  test('filenames are sanitized', () => {
    assert.equal(sanitizeFilename('../../evil<script>.png'), 'evil-script-.png');
    assert.equal(sanitizeFilename('C:\\Users\\x\\photo 1.jpg'), 'photo-1.jpg');
    assert.equal(sanitizeFilename(''), 'upload');
    assert.equal(sanitizeFilename(null), 'upload');
  });
});

// ---------------------------------------------------------------------------
// catalog id concurrency helpers
// ---------------------------------------------------------------------------

describe('catalog id concurrency', () => {
  test('recognises unique-constraint violations', () => {
    assert.equal(isCatalogIdConflict({ code: '23505' }), true);
    assert.equal(isCatalogIdConflict({ message: 'duplicate key value violates unique constraint "uq_gallery_assets_catalog_id"' }), true);
    assert.equal(isCatalogIdConflict({ code: '42P01', message: 'relation does not exist' }), false);
    assert.equal(isCatalogIdConflict(null), false);
    assert.equal(isCatalogIdConflict(undefined), false);
  });

  test('distinguishes the file_hash index from the catalog index', () => {
    assert.equal(isDuplicateFileHash({ code: '23505', message: 'duplicate key value violates unique constraint "uq_draft_items_file_hash"' }), true);
    assert.equal(isDuplicateFileHash({ code: '23505', message: 'duplicate key value violates unique constraint "uq_gallery_assets_catalog_id"' }), false);
  });

  test('catalog ids follow the documented format', () => {
    assert.equal(generateCatalogId({ category: 'MAG', eventDate: '2025-01-17', sequence: 0 }), 'LMSY-MAG-20250117-000');
    assert.equal(generateCatalogId({ category: 'G', eventDate: '2025-01-17', sequence: 14 }), 'LMSY-G-20250117-014');
  });

  test('retry budget is bounded', () => {
    assert.ok(CATALOG_ID_MAX_ATTEMPTS >= 2 && CATALOG_ID_MAX_ATTEMPTS <= 10);
  });
});
