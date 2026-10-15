/**
 * Supabase data backup (logical, table by table, via the REST API).
 *
 * WHY: the audit found no evidence of any working database backup or restore
 * drill. This script produces a timestamped, checksummed snapshot of every
 * table in the lmsy_archive schema plus the live schema description, so a
 * restore is possible without relying on the dashboard.
 *
 * OUTPUT
 *   backups/db/<timestamp>/
 *     manifest.json          table list, row counts, sha256 per file, totals
 *     schema.json            PostgREST OpenAPI description (column types)
 *     <table>.json           all rows
 *
 * BEHAVIOUR
 *   - Read-only against Supabase.
 *   - Verifies each file by re-reading it and comparing the row count.
 *   - Verifies the exported count against an exact count query.
 *   - Exits non-zero on ANY failure; never reports success when a table failed.
 *
 * USAGE
 *   node scripts/backup-supabase-data.mjs
 *
 * NOTE: this is a logical export. For point-in-time recovery of the whole
 * Postgres instance, Supabase's own backup/PITR feature must also be enabled in
 * the dashboard (see docs/BACKUP_AND_RESTORE.md).
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { loadEnv, requireEnv, timestamp, ensureDir, sha256, writeJson } from './lib/ops-common.mjs';

loadEnv();
requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCHEMA = 'lmsy_archive';
const PAGE_SIZE = 1000;

function headers(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Accept-Profile': SCHEMA,
    ...extra,
  };
}

async function api(path, extraHeaders = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(extraHeaders) });
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res;
}

/** Table list taken from the OpenAPI definition, which only exposes real tables. */
async function listTables() {
  const res = await api('');
  const spec = await res.json();
  return {
    tables: Object.keys(spec.definitions || {}).filter(name => !name.startsWith('rpc/')).sort(),
    spec,
  };
}

async function exactCount(table) {
  const res = await api(`${table}?select=*`, { Prefer: 'count=exact', Range: '0-0' });
  const range = res.headers.get('content-range') || '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : null;
}

async function fetchAllRows(table) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const res = await api(`${table}?select=*&limit=${PAGE_SIZE}&offset=${offset}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function main() {
  const startedAt = new Date();
  const stamp = timestamp();
  const outDir = ensureDir(resolve(process.cwd(), 'backups', 'db', stamp));
  console.log('Supabase backup -> ' + outDir);

  const { tables, spec } = await listTables();
  console.log(`Found ${tables.length} tables.`);

  writeJson(join(outDir, 'schema.json'), spec);

  const manifest = {
    kind: 'supabase-logical-backup',
    projectUrlHost: new URL(SUPABASE_URL).host,
    schema: SCHEMA,
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    tables: [],
    totals: { tables: 0, rows: 0, bytes: 0 },
    failures: [],
  };

  for (const table of tables) {
    try {
      const expected = await exactCount(table);
      const rows = await fetchAllRows(table);
      const file = join(outDir, `${table}.json`);
      const json = JSON.stringify(rows, null, 1);
      writeFileSync(file, json, 'utf-8');

      // Verification: re-read the file and compare counts.
      const reread = JSON.parse(readFileSync(file, 'utf-8'));
      const bytes = Buffer.byteLength(json);
      const hash = sha256(Buffer.from(json, 'utf-8'));

      const countOk = reread.length === rows.length;
      const expectedOk = expected === null || expected === rows.length;

      manifest.tables.push({
        table,
        rows: rows.length,
        expectedRows: expected,
        file: `db/${stamp}/${table}.json`,
        bytes,
        sha256: hash,
        verified: countOk && expectedOk,
      });
      manifest.totals.tables += 1;
      manifest.totals.rows += rows.length;
      manifest.totals.bytes += bytes;

      const flag = countOk && expectedOk ? 'ok' : 'MISMATCH';
      console.log(`  ${flag.padEnd(9)} ${table.padEnd(24)} rows=${rows.length}${expected !== null ? ` (expected ${expected})` : ''} ${(bytes / 1024).toFixed(1)}KB`);
      if (!(countOk && expectedOk)) {
        manifest.failures.push(`${table}: count mismatch (file=${rows.length}, expected=${expected})`);
      }
    } catch (error) {
      console.error(`  FAILED    ${table}: ${error.message}`);
      manifest.failures.push(`${table}: ${error.message}`);
    }
  }

  manifest.finishedAt = new Date().toISOString();
  manifest.durationSeconds = Math.round((Date.now() - startedAt.getTime()) / 1000);
  manifest.ok = manifest.failures.length === 0;

  writeJson(join(outDir, 'manifest.json'), manifest);

  console.log('');
  console.log(`Tables: ${manifest.totals.tables} | rows: ${manifest.totals.rows} | size: ${(manifest.totals.bytes / 1024 / 1024).toFixed(2)}MB | ${manifest.durationSeconds}s`);
  if (!manifest.ok) {
    console.error(`BACKUP FAILED for ${manifest.failures.length} table(s):`);
    for (const f of manifest.failures) console.error('  - ' + f);
    process.exit(1);
  }
  console.log('Backup OK. Manifest: ' + `backups/db/${stamp}/manifest.json`);
}

main().catch(error => {
  console.error('FATAL: backup aborted:', error.message);
  process.exit(1);
});
