/**
 * Guards around the pending phase-1 migrations.
 *
 * These tests read the SQL files as text. They cannot prove the database was
 * migrated - that needs a live connection - but they do protect the two
 * properties that are easy to break by accident while editing:
 *
 *   1. the tables that must stop leaking are actually in the deny list, and
 *      the tables the public site reads are actually in the allow list;
 *   2. none of the migrations destroys data (no DELETE / UPDATE / TRUNCATE /
 *      DROP TABLE / DROP COLUMN), and structural statements are idempotent.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const MIGRATIONS_DIR = resolve(process.cwd(), 'supabase', 'migrations');

function sql(name: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, name), 'utf-8');
}

const HARDENING = sql('20261015_phase1_rls_hardening.sql');
const INTEGRITY = sql('20261015_phase1_data_integrity.sql');
const BASELINE = sql('20261015_phase1_baseline_gallery_assets.sql');

/** Strip SQL comments so assertions look at statements, not prose. */
function stripComments(src: string): string {
  return src
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');
}

describe('phase 1 migrations: existence and order', () => {
  test('all three migration files are readable', () => {
    assert.ok(HARDENING.length > 0);
    assert.ok(INTEGRITY.length > 0);
    assert.ok(BASELINE.length > 0);
  });

  test('the security hardening is scheduled first', () => {
    // Applied in scripts/apply-phase1-migrations.mjs. Serialising it here
    // keeps test and runner from silently drifting apart.
    const runner = readFileSync(
      resolve(process.cwd(), 'scripts', 'apply-phase1-migrations.mjs'),
      'utf-8'
    );
    const hardeningPos = runner.indexOf('20261015_phase1_rls_hardening.sql');
    const baselinePos = runner.indexOf('20261015_phase1_baseline_gallery_assets.sql');
    const integrityPos = runner.indexOf('20261015_phase1_data_integrity.sql');
    assert.ok(hardeningPos > -1 && baselinePos > -1 && integrityPos > -1);
    assert.ok(
      hardeningPos < baselinePos && hardeningPos < integrityPos,
      'the confirmed data-exposure fix must run before the structural migrations'
    );
  });
});

describe('rls hardening: the leak is actually closed', () => {
  const deny = HARDENING.slice(HARDENING.indexOf('deny_read'), HARDENING.indexOf('BEGIN'));
  const pub = HARDENING.slice(HARDENING.indexOf('public_read'), HARDENING.indexOf('deny_read'));

  test('draft_items and admin_users are denied to anon/authenticated', () => {
    assert.match(deny, /'draft_items'/);
    assert.match(deny, /'admin_users'/);
  });

  test('SELECT is revoked, not just RLS-enabled', () => {
    // RLS alone is not enough: without revoking SELECT a table with no policy
    // still resolves for roles that hold the grant on some configurations.
    assert.match(HARDENING, /REVOKE SELECT ON lmsy_archive\.%I FROM anon, authenticated/);
  });

  test('read policies on deny-listed tables are dropped too', () => {
    // Production evidence (2026-10-16): RLS was already enabled on every table
    // and anon held SELECT through PUBLIC, so REVOKE alone was a no-op. The
    // leak was carried by a permissive SELECT policy
    // ("Public can view published draft_items"). A policy has to be dropped,
    // not just a grant revoked.
    assert.match(HARDENING, /tablename = ANY \(deny_read\)/);
    assert.match(HARDENING, /cmd IN \('SELECT', 'ALL'\)/);
    assert.match(HARDENING, /roles::text ILIKE '%anon%' OR roles::text ILIKE '%authenticated%'/);
  });

  test('the service_role policy survives the read-policy cleanup', () => {
    // draft_items carries "Service role full access on draft_items" (cmd ALL).
    // Dropping it would break the admin UI, ingest, webhook and cron job.
    assert.match(HARDENING, /roles::text NOT ILIKE '%service_role%'/);
  });

  test('write privileges are revoked from anon and authenticated', () => {
    assert.match(
      HARDENING,
      /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER/
    );
  });

  test('RLS is enabled on every table in the schema', () => {
    assert.match(HARDENING, /ALTER TABLE lmsy_archive\.%I ENABLE ROW LEVEL SECURITY/);
  });

  test('public read is kept for the tables the frontend reads', () => {
    for (const t of ['gallery_assets', 'projects', 'site_content_blocks']) {
      assert.ok(pub.includes(`'${t}'`), `${t} must stay publicly readable`);
    }
  });

  test('public read policy is SELECT-only', () => {
    assert.match(HARDENING, /FOR SELECT TO anon, authenticated USING \(true\)/);
  });

  test('service_role path is untouched (no REVOKE from service_role)', () => {
    assert.doesNotMatch(HARDENING, /REVOKE[^\n;]*FROM[^\n;]*service_role/i);
  });
});

describe('migrations are non-destructive', () => {
  for (const [name, src] of [
    ['baseline', BASELINE],
    ['data_integrity', INTEGRITY],
    ['rls_hardening', HARDENING],
  ] as const) {
    test(`${name} contains no data-destroying statement`, () => {
      const body = stripComments(src).toUpperCase();
      for (const forbidden of ['\nDELETE FROM', 'TRUNCATE TABLE', 'DROP TABLE', 'DROP COLUMN']) {
        assert.ok(!body.includes(forbidden), `${name} must not contain ${forbidden}`);
      }
      assert.ok(!/\bUPDATE\s+lmsy_archive\./.test(body), `${name} must not UPDATE rows`);
    });
  }

  test('baseline uses IF NOT EXISTS so it cannot rebuild an existing table', () => {
    assert.match(BASELINE, /CREATE TABLE IF NOT EXISTS/);
    assert.match(BASELINE, /CREATE SCHEMA IF NOT EXISTS/);
    assert.doesNotMatch(BASELINE, /^CREATE TABLE lmsy_archive/m);
  });

  test('unique indexes are only created when the data is already clean', () => {
    // Creating a unique index over duplicates would fail the whole migration;
    // the script must check first and skip with a NOTICE instead.
    assert.match(INTEGRITY, /IF dup_count = 0 THEN/);
    assert.match(INTEGRITY, /RAISE NOTICE 'SKIPPED/);
    assert.equal((INTEGRITY.match(/IF dup_count = 0 THEN/g) || []).length, 2);
  });

  test('source_platform CHECK is widened, never narrowed', () => {
    // production already stores 'telegram'; a narrower list would break inserts
    assert.match(INTEGRITY, /'telegram'/);
    for (const p of ['twitter', 'instagram', 'weibo', 'xiaohongshu', 'youtube', 'tiktok', 'manual']) {
      assert.ok(INTEGRITY.includes(`'${p}'`), `${p} must remain allowed`);
    }
  });
});
