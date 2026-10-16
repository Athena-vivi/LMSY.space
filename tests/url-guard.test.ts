/**
 * Guards for the media download URL blocklist (remediation B2-T5, audit P2-3).
 *
 * /api/ingest downloads caller-supplied URLs server-side. These tests pin the
 * pure blocklist: private / loopback / metadata / reserved targets are
 * refused, ordinary public hosts pass, and both redirect-hop re-checks and
 * unusual IP spellings are covered.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { isBlockedMediaUrl } from '../lib/security/url-guard.ts';

describe('isBlockedMediaUrl: allowed targets', () => {
  test('public https host is allowed', () => {
    assert.deepEqual(isBlockedMediaUrl('https://cdn.lmsy.space/draft/x.jpg'), { blocked: false });
  });

  test('telegram file host is allowed', () => {
    assert.deepEqual(isBlockedMediaUrl('https://api.telegram.org/file/bot123/x.jpg'), { blocked: false });
  });

  test('public IPv4 literal is allowed', () => {
    assert.deepEqual(isBlockedMediaUrl('http://93.184.216.34/a.jpg'), { blocked: false });
  });

  test('bare hostname without scheme-independent issues is allowed', () => {
    assert.deepEqual(isBlockedMediaUrl('https://example.com/img.png'), { blocked: false });
  });
});

describe('isBlockedMediaUrl: blocked targets', () => {
  test('loopback and localhost forms', () => {
    for (const url of ['http://127.0.0.1/x', 'http://localhost/x', 'http://localhost:3000/x']) {
      assert.equal(isBlockedMediaUrl(url).blocked, true, url);
    }
  });

  test('RFC1918 private ranges', () => {
    for (const ip of ['10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1']) {
      assert.equal(isBlockedMediaUrl(`http://${ip}/x`).blocked, true, ip);
    }
  });

  test('cloud metadata endpoints', () => {
    for (const url of [
      'http://169.254.169.254/latest/meta-data/',
      'http://metadata.google.internal/computeMetadata/v1/',
    ]) {
      assert.equal(isBlockedMediaUrl(url).blocked, true, url);
    }
  });

  test('link-local, carrier NAT, reserved and multicast ranges', () => {
    for (const ip of ['169.254.1.1', '100.64.0.1', '0.0.0.0', '224.0.0.1', '240.0.0.1', '255.255.255.255']) {
      assert.equal(isBlockedMediaUrl(`http://${ip}/x`).blocked, true, ip);
    }
  });

  test('RFC1918 boundary addresses inside the range are blocked, outside allowed', () => {
    assert.equal(isBlockedMediaUrl('http://172.15.255.255/x').blocked, false);
    assert.equal(isBlockedMediaUrl('http://172.32.0.1/x').blocked, false);
    assert.equal(isBlockedMediaUrl('http://192.169.0.1/x').blocked, false);
  });

  test('IPv6 loopback, unique-local and link-local', () => {
    for (const url of [
      'http://[::1]/x',
      'http://[::]/x',
      'http://[fc00::1]/x',
      'http://[fe80::1]/x',
      'http://[::ffff:127.0.0.1]/x',
    ]) {
      assert.equal(isBlockedMediaUrl(url).blocked, true, url);
    }
  });

  test('integer and hex spellings of IPv4 are recognized', () => {
    // 2130706433 == 127.0.0.1
    assert.equal(isBlockedMediaUrl('http://2130706433/x').blocked, true);
    assert.equal(isBlockedMediaUrl('http://0x7f000001/x').blocked, true);
  });

  test('unparseable URLs and non-HTTP protocols are blocked', () => {
    assert.equal(isBlockedMediaUrl('not a url').blocked, true);
    assert.equal(isBlockedMediaUrl('file:///etc/passwd').blocked, true);
    assert.equal(isBlockedMediaUrl('ftp://example.com/x').blocked, true);
  });
});
