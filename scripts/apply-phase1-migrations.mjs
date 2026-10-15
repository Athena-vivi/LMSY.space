/**
 * Apply the three pending phase-1 migrations to the Supabase Postgres database
 * and verify the result from the OUTSIDE, with the public anon key.
 *
 * WHY THIS SCRIPT EXISTS
 *   The pending migration set includes a confirmed production data-exposure
 *   fix: with only the public anon key, `lmsy_archive.draft_items` currently
 *   returns unpublished drafts. That cannot be fixed from application code -
 *   it has to be fixed in the database, and PostgREST cannot execute DDL.
 *   So the last missing piece is a real Postgres session. This script opens
 *   one and runs the reviewed SQL files in order.
 *
 * SAFETY
 *   - Refuses to run unless a database logical backup newer than
 *     MAX_BACKUP_AGE_HOURS exists AND its own manifest reports ok=true.
 *   - Runs each migration inside a transaction and rolls back on error.
 *   - Prints every RAISE NOTICE emitted by the SQL, so skipped blocks
 *     (for example a duplicate found when creating a unique index) are visible
 *     instead of silent.
 *   - Row counts are captured before and after and compared; the migrations
 *     contain no DELETE/UPDATE/TRUNCATE, so any difference aborts the run.
 *   - Never prints the password or the connection string.
 *
 * CREDENTIALS (never commit these)
 *   SUPABASE_DB_PASSWORD   database password (Supabase Dashboard ->
 *                          Project Settings -> Database -> Database password)
 *   or DATABASE_URL        full postgres:// connection string
 * Optional:
 *   SUPABASE_DB_HOST / SUPABASE_DB_PORT / SUPABASE_DB_USER
 *
 * USAGE
 *   npm run backup:db                 # required first
 *   SUPABASE_DB_PASSWORD=... npm run migrate:phase1
 *   SUPABASE_DB_PASSWORD=... npm run migrate:phase1 -- --dry-run
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'fs';
import { resolve as _r, join } from 'path';
import { loadEnv, requireEnv, writeJson, ensureDir } from './lib/ops-common.mjs';

loadEnv();

const DRY_RUN = process.argv.includes('--dry-run');
const MAX_BACKUP_AGE_HOURS = Number(process.env.MIGRATE_MAX_BACKUP_AGE_HOURS || 24);

/**
 * Order rationale (checked against the actual SQL on 2026-10-16):
 *   The three files have NO interdependency:
 *     - rls_hardening iterates pg_tables for schema lmsy_archive; it never
 *       reads a column added by the other two.
 *     - data_integrity touches draft_items / gallery_assets, both of which
 *       already exist in production (330 and 71 rows), and runs as the
 *       migration role, which is unaffected by RLS either way.
 *     - baseline is entirely CREATE ... IF NOT EXISTS.
 *   So the security fix can safely go FIRST, which is what the P0 priority
 *   requires: it closes a confirmed exposure instead of waiting behind two
 *   structural migrations.
 */
const MIGRATIONS = [
  '20261015_phase1_rls_hardening.sql',
  '20261015_phase1_baseline_gallery_assets.sql',
  '20261015_phase1_data_integrity.sql',
];

const ROW_COUNT_TABLES = [
  'gallery_assets', 'projects', 'draft_items', 'admin_users',
  'gallery', 'chronicle_events', 'site_content_blocks',
];

const VERIFY_SQL = {
  writeGrants:
    `SELECT table_name, grantee, privilege_type
       FROM information_schema.role_table_grants
      WHERE table_schema = 'lmsy_archive'
        AND grantee IN ('anon','authenticated')
        AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')`,
  rlsDisabled:
    `SELECT c.relname
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='lmsy_archive' AND c.relkind='r' AND NOT c.relrowsecurity`,
  policies:
    `SELECT tablename, policyname, cmd, roles
       FROM pg_policies WHERE schemaname='lmsy_archive' ORDER BY tablename, policyname`,
  indexes:
    `SELECT indexname FROM pg_indexes
      WHERE schemaname='lmsy_archive'
        AND indexname IN ('uq_gallery_assets_catalog_id','uq_draft_items_file_hash')`,
  platformCheck:
    `SELECT pg_get_constraintdef(oid) FROM pg_constraint
      WHERE conname='draft_items_source_platform_check'`,
};

// Emit the concatenated migration SQL for environments where no Postgres
// credential can be supplied to this script - the output can be pasted into
// the Supabase SQL Editor, which needs only a dashboard login.
// Must stay after MIGRATIONS/VERIFY_SQL are declared.
const emitIdx = process.argv.findIndex((a) => a === '--emit-sql');
if (emitIdx !== -1) {
  const out = process.argv[emitIdx + 1];
  if (!out) {
    console.error('FATAL: --emit-sql needs an output path');
    process.exit(1);
  }
  const dir = _r(process.cwd(), 'supabase', 'migrations');
  const parts = MIGRATIONS.map((f) => {
    const p = join(dir, f);
    if (!existsSync(p)) {
      console.error('FATAL: missing migration ' + f);
      process.exit(1);
    }
    return `-- ===================== ${f} =====================\n` + readFileSync(p, 'utf-8');
  });
  const verify = `\n-- ===================== VERIFICATION =====================\n` +
    Object.entries(VERIFY_SQL)
      .map(([k, sql]) => `-- ${k}\n${sql};`)
      .join('\n\n') + '\n';
  writeFileSync(out, parts.join('\n\n') + verify, 'utf-8');
  console.log(`Wrote ${out} (${MIGRATIONS.length} migrations + verification queries).`);
  console.log('Paste into Supabase Dashboard -> SQL Editor -> New query, then Run.');
  process.exit(0);
}

function fail(msg) {
  console.error('FATAL: ' + msg);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Precondition: a recent, self-verified logical backup must exist.
// ---------------------------------------------------------------------------
const backupRoot = _r(process.cwd(), 'backups', 'db');
if (!existsSync(backupRoot)) fail('no backups/db directory. Run `npm run backup:db` first.');

const snapshots = readdirSync(backupRoot)
  .filter((d) => statSync(join(backupRoot, d)).isDirectory())
  .sort();
if (!snapshots.length) fail('no database snapshot found. Run `npm run backup:db` first.');

const newestDir = join(backupRoot, snapshots[snapshots.length - 1]);
const manifest = JSON.parse(readFileSync(join(newestDir, 'manifest.json'), 'utf-8'));
const ageHours = (Date.now() - Date.parse(manifest.finishedAt)) / 36e5;

console.log('=== precondition: logical backup ===');
console.log(`  snapshot : ${snapshots[snapshots.length - 1]}`);
console.log(`  ok       : ${manifest.ok}`);
console.log(`  age      : ${ageHours.toFixed(1)}h (limit ${MAX_BACKUP_AGE_HOURS}h)`);
if (manifest.ok !== true) fail('newest backup manifest reports ok=false. Fix the backup first.');
if (ageHours > MAX_BACKUP_AGE_HOURS) {
  fail(`newest backup is older than ${MAX_BACKUP_AGE_HOURS}h. Run \`npm run backup:db\` first.`);
}

// ---------------------------------------------------------------------------
// 2. Credentials
// ---------------------------------------------------------------------------
let pg;
try {
  pg = await import('pg');
} catch {
  fail('the `pg` package is not installed. Run `npm install`.');
}
const { Client } = pg.default ?? pg;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ref = url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
if (!ref) fail('could not derive the project ref from NEXT_PUBLIC_SUPABASE_URL.');

let conn;
if (process.env.DATABASE_URL) {
  conn = { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
} else {
  if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error('');
    console.error('FATAL: no database credentials available.');
    console.error('  SUPABASE_DB_PASSWORD (or DATABASE_URL) is required to open a Postgres');
    console.error('  session. PostgREST cannot execute DDL, so the migrations cannot be');
    console.error('  applied with the anon or service_role key alone.');
    console.error('  Get it from Supabase Dashboard -> Project Settings -> Database.');
    process.exit(2);
  }
  const host = process.env.SUPABASE_DB_HOST || `${ref}.pooler.supabase.com`;
  conn = {
    host,
    port: Number(process.env.SUPABASE_DB_PORT || 6543),
    user: process.env.SUPABASE_DB_USER || `postgres.${ref}`,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  };
}
console.log(`\n=== connection ===\n  ${conn.host ?? '(from DATABASE_URL)'}:${conn.port ?? ''} user=${conn.user ?? '(from DATABASE_URL)'}`);

const client = new Client(conn);
const notices = [];
client.on('notice', (n) => notices.push(String(n.message)));

try {
  await client.connect();
} catch (e) {
  console.error('');
  console.error('FATAL: could not connect - ' + e.message);
  console.error('  If the host is wrong, set SUPABASE_DB_HOST / SUPABASE_DB_PORT,');
  console.error('  or supply a full DATABASE_URL from the Supabase dashboard.');
  process.exit(2);
}

const q = async (sql) => (await client.query(sql)).rows;

async function rowCounts() {
  const out = {};
  for (const t of ROW_COUNT_TABLES) {
    try {
      const r = await q(`SELECT count(*)::int AS n FROM lmsy_archive.${t}`);
      out[t] = r[0].n;
    } catch {
      out[t] = null; // table does not exist
    }
  }
  return out;
}

try {
  // -------------------------------------------------------------------------
  // 3. Before-state
  // -------------------------------------------------------------------------
  console.log('\n=== before ===');
  const before = await rowCounts();
  for (const [t, n] of Object.entries(before)) {
    console.log(`  ${t.padEnd(22)} ${n === null ? '(absent)' : n}`);
  }

  const report = {
    kind: 'phase1-migration-apply',
    dryRun: DRY_RUN,
    startedAt: new Date().toISOString(),
    backupSnapshot: snapshots[snapshots.length - 1],
    migrations: [],
    rowCountsBefore: before,
    rowCountsAfter: null,
    verification: null,
    ok: false,
  };

  if (DRY_RUN) {
    console.log('\n(--dry-run: no DDL executed)');
  } else {
    // -----------------------------------------------------------------------
    // 4. Apply each migration, in order, in its own transaction
    // -----------------------------------------------------------------------
    const dir = _r(process.cwd(), 'supabase', 'migrations');
    for (const file of MIGRATIONS) {
      const path = join(dir, file);
      if (!existsSync(path)) {
        console.error(`\nFATAL: migration file missing: ${file}`);
        process.exit(1);
      }
      const sql = readFileSync(path, 'utf-8');
      notices.length = 0;
      const startedAt = new Date().toISOString();
      console.log(`\n=== applying ${file} ===`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        console.error(`  FAILED: ${e.message}`);
        console.error('  transaction rolled back; no partial migration was applied.');
        report.migrations.push({ file, status: 'failed', error: e.message, startedAt });
        writeJson(_r(process.cwd(), 'reports', 'migration-apply.json'), report);
        process.exit(1);
      }
      for (const n of notices) console.log('  NOTICE: ' + n);
      console.log(`  applied at ${startedAt}`);
      report.migrations.push({ file, status: 'applied', startedAt, notices: [...notices] });
    }
  }

  // -------------------------------------------------------------------------
  // 5. Structural verification (safe to run in dry-run too)
  // -------------------------------------------------------------------------
  console.log('\n=== verification (from inside the database) ===');
  const v = {};
  for (const [name, sql] of Object.entries(VERIFY_SQL)) {
    v[name] = await q(sql).catch((e) => [{ error: e.message }]);
  }

  console.log(`\n  write grants to anon/authenticated (must be EMPTY): ${v.writeGrants.length}`);
  for (const r of v.writeGrants) {
    console.log(`    ${r.table_name} -> ${r.grantee}: ${r.privilege_type}`);
  }
  console.log(`  tables with RLS disabled (must be EMPTY): ${v.rlsDisabled.length}`);
  for (const r of v.rlsDisabled) console.log(`    ${r.relname}`);
  console.log(`  unique indexes present (expect 2): ${v.indexes.length}`);
  for (const r of v.indexes) console.log(`    ${r.indexname}`);
  console.log(`  source_platform CHECK: ${v.platformCheck[0]?.pg_get_constraintdef ?? '(missing)'}`);
  console.log('  policies:');
  for (const r of v.policies) {
    console.log(`    ${r.tablename} | ${r.policyname} | ${r.cmd} | ${(r.roles || []).join(',')}`);
  }

  // -------------------------------------------------------------------------
  // 6. Row-count guard
  // -------------------------------------------------------------------------
  const after = await rowCounts();
  console.log('\n=== after (row counts must be unchanged) ===');
  let drift = false;
  for (const [t, n] of Object.entries(after)) {
    const b = before[t];
    const mark = b === n ? '' : '  <-- CHANGED';
    if (b !== n) drift = true;
    console.log(`  ${t.padEnd(22)} ${n === null ? '(absent)' : n}${mark}`);
  }
  if (drift && !DRY_RUN) {
    console.error('\nFATAL: row counts changed. The migrations must not modify data.');
    process.exit(1);
  }

  report.rowCountsAfter = after;
  report.verification = v;
  report.finishedAt = new Date().toISOString();
  report.ok = v.writeGrants.length === 0 && v.rlsDisabled.length === 0;
  ensureDir(_r(process.cwd(), 'reports'));
  writeJson(_r(process.cwd(), 'reports', 'migration-apply.json'), report);
  console.log('\nReport: reports/migration-apply.json');
} finally {
  await client.end().catch(() => {});
}

// ---------------------------------------------------------------------------
// 7. Outside-in verification with the PUBLIC anon key - the actual attack path
// ---------------------------------------------------------------------------
console.log('\n=== outside-in check with the public anon key ===');
const rest = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const headers = { apikey: anon, Authorization: `Bearer ${anon}`, 'Accept-Profile': 'lmsy_archive' };

let exposed = false;
for (const t of ['draft_items', 'admin_users']) {
  const r = await fetch(`${rest}/rest/v1/${t}?select=id&limit=1`, { headers });
  let n = -1;
  try { n = (await r.json()).length; } catch { /* non-json */ }
  const good = r.status !== 200 || n === 0;
  if (!good) exposed = true;
  console.log(`  ${t.padEnd(14)} HTTP ${r.status} rows=${n}  ${good ? 'OK (no leak)' : 'STILL EXPOSED'}`);
}
for (const t of ['gallery_assets', 'projects', 'site_content_blocks']) {
  const r = await fetch(`${rest}/rest/v1/${t}?select=id&limit=1`, { headers });
  let n = -1;
  try { n = (await r.json()).length; } catch { /* non-json */ }
  console.log(`  ${t.padEnd(14)} HTTP ${r.status} rows=${n}  ${r.status === 200 && n > 0 ? 'OK (public read works)' : 'BROKEN'}`);
}

console.log('');
if (DRY_RUN) {
  console.log('Dry run finished - nothing was changed.');
} else if (exposed) {
  console.error('MIGRATIONS APPLIED BUT THE LEAK IS STILL PRESENT. Do not mark this as fixed.');
  process.exit(1);
} else {
  console.log('Data-exposure fix verified: anon can no longer read draft_items or admin_users.');
}
