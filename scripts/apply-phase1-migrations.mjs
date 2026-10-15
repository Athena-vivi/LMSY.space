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
 * CREDENTIALS - supply ONE of these (never commit any of them)
 *   SUPABASE_ACCESS_TOKEN  a `sbp_...` personal access token for the Supabase
 *                          Management API. Create it at
 *                          https://supabase.com/dashboard/account/tokens
 *                          Prefer a SCOPED token: this project only,
 *                          `database_write`, short expiry. Revoke it afterwards.
 *                          This is usually the easiest option - it needs no
 *                          database password and no extra dependency.
 *   SUPABASE_DB_PASSWORD   database password (Supabase Dashboard ->
 *                          Project Settings -> Database), or DATABASE_URL.
 *                          Scoped to a single database, but longer-lived.
 * Optional:
 *   SUPABASE_DB_HOST / SUPABASE_DB_PORT / SUPABASE_DB_USER
 *   --via=pg | --via=api   force one transport
 *
 * NOTE: the project API keys (NEXT_PUBLIC_SUPABASE_ANON_KEY /
 * SUPABASE_SERVICE_ROLE_KEY) are NOT enough. They only reach PostgREST, which
 * serves rows and stored functions over HTTP and cannot run DDL.
 *
 * USAGE
 *   npm run backup:db                 # required first
 *   SUPABASE_ACCESS_TOKEN=sbp_... npm run migrate:phase1
 *   SUPABASE_DB_PASSWORD=... npm run migrate:phase1
 *   npm run migrate:phase1 -- --dry-run
 *   npm run migrate:phase1 -- --emit-sql backups/pending.sql   # no credential
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
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ref = url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
if (!ref) fail('could not derive the project ref from NEXT_PUBLIC_SUPABASE_URL.');

/**
 * Two independent ways to get a real SQL session, because the project API keys
 * cannot do this at all:
 *
 *   A. Direct Postgres (DATABASE_URL, or SUPABASE_DB_PASSWORD + pooler).
 *      Real transaction semantics, and RAISE NOTICE comes back to us.
 *
 *   B. Supabase Management API (SUPABASE_ACCESS_TOKEN, a `sbp_...` personal
 *      access token) -> POST /v1/projects/{ref}/database/query.
 *      Same SQL, no extra dependency, no need to share the DB password.
 *      Caveat: the endpoint is Beta, and it returns only the LAST statement's
 *      result set, so RAISE NOTICE is not surfaced. That is fine here because
 *      every "skipped" branch is also observable through the verification
 *      queries below (does the index exist, what does the CHECK say).
 */
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT || '';
const HAS_PG_CRED = Boolean(process.env.DATABASE_URL || process.env.SUPABASE_DB_PASSWORD);
const forced = (process.argv.find((a) => a.startsWith('--via=')) || '').split('=')[1];

let backend = null;
let client = null;
const notices = [];

async function mgmtQuery(sql, readOnly) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql, read_only: readOnly === true }),
    }
  );
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok) {
    const msg = json?.message || text.slice(0, 200);
    const e = new Error(`HTTP ${res.status}: ${msg}`);
    e.status = res.status;
    throw e;
  }
  return Array.isArray(json) ? json : (json?.result ?? []);
}

if (forced === 'api' || (!HAS_PG_CRED && TOKEN)) {
  if (!TOKEN) {
    console.error('FATAL: --via=api needs SUPABASE_ACCESS_TOKEN.');
    process.exit(2);
  }
  backend = {
    kind: 'api',
    exec: (sql) => mgmtQuery(sql, false),
    query: (sql) => mgmtQuery(sql, true),
    close: async () => {},
  };
  console.log(`\n=== connection ===\n  Supabase Management API -> project ${ref}`);
} else if (HAS_PG_CRED || forced === 'pg') {
  let pg;
  try {
    pg = await import('pg');
  } catch {
    fail('the `pg` package is not installed. Run `npm install`, or use a token instead.');
  }
  const { Client } = pg.default ?? pg;

  let conn;
  if (process.env.DATABASE_URL) {
    conn = { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
  } else {
    if (!process.env.SUPABASE_DB_PASSWORD) {
      fail('SUPABASE_DB_PASSWORD is set as empty; unset it to fall back to a token.');
    }
    conn = {
      host: process.env.SUPABASE_DB_HOST || `${ref}.pooler.supabase.com`,
      port: Number(process.env.SUPABASE_DB_PORT || 6543),
      user: process.env.SUPABASE_DB_USER || `postgres.${ref}`,
      password: process.env.SUPABASE_DB_PASSWORD,
      database: process.env.SUPABASE_DB_NAME || 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    };
  }
  console.log(`\n=== connection ===\n  ${conn.host ?? '(from DATABASE_URL)'}:${conn.port ?? ''} user=${conn.user ?? '(from DATABASE_URL)'}`);

  client = new Client(conn);
  client.on('notice', (n) => notices.push(String(n.message)));
  try {
    await client.connect();
  } catch (e) {
    console.error('');
    console.error('FATAL: could not connect - ' + e.message);
    console.error('  If the host is wrong, set SUPABASE_DB_HOST / SUPABASE_DB_PORT,');
    console.error('  or supply DATABASE_URL. A Management API token also works:');
    console.error('  SUPABASE_ACCESS_TOKEN=sbp_... npm run migrate:phase1');
    process.exit(2);
  }
  backend = {
    kind: 'pg',
    exec: (sql) => client.query(sql),
    query: async (sql) => (await client.query(sql)).rows,
    close: async () => { await client.end().catch(() => {}); },
  };
} else {
  console.error('');
  console.error('FATAL: no credential that can execute DDL.');
  console.error('  The project API keys (anon / service_role) only reach PostgREST,');
  console.error('  which cannot run CREATE / ALTER / GRANT / CREATE POLICY. Supply ONE of:');
  console.error('');
  console.error('    SUPABASE_ACCESS_TOKEN=sbp_...   personal access token (Management API)');
  console.error('      -> https://supabase.com/dashboard/account/tokens');
  console.error('      -> give it database_write on this project only, short expiry');
  console.error('');
  console.error('    SUPABASE_DB_PASSWORD=...        or DATABASE_URL=postgres://...');
  console.error('      -> Supabase Dashboard -> Project Settings -> Database');
  console.error('');
  console.error('  With no credential at all, run:');
  console.error('    npm run migrate:phase1 -- --emit-sql backups/phase1-pending-migrations.sql');
  console.error('  and paste the output into the Supabase SQL Editor.');
  process.exit(2);
}

const q = async (sql) => backend.query(sql);

async function rowCounts() {
  const out = {};
  for (const t of ROW_COUNT_TABLES) {
    try {
      const r = await q(`SELECT count(*)::int AS n FROM lmsy_archive.${t}`);
      out[t] = r[0].n;
    } catch (e) {
      // Only a missing relation is allowed to read as "absent". Anything else
      // (auth failure, network error) must surface, otherwise a broken
      // connection would look like an empty database and the row-count guard
      // below would compare null against null and pass silently.
      const msg = String(e?.message || e);
      if (/does not exist|42P01|undefined_table/i.test(msg)) {
        out[t] = null;
      } else {
        throw new Error(`row count for ${t} failed: ${msg}`);
      }
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
    transport: backend.kind,
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
        if (backend.kind === 'api') {
          // One request = one pooled connection; explicit BEGIN/COMMIT keeps the
          // whole migration atomic even across the HTTP boundary.
          await backend.exec(`BEGIN;\n${sql}\nCOMMIT;`);
        } else {
          await backend.exec('BEGIN');
          await backend.exec(sql);
          await backend.exec('COMMIT');
        }
      } catch (e) {
        if (backend.kind === 'pg') await backend.exec('ROLLBACK').catch(() => {});
        console.error(`  FAILED: ${e.message}`);
        if (backend.kind === 'api') {
          // Postgres aborts the whole transaction on statement error, so the
          // server side is already clean; nothing to compensate here.
          console.error('  the failed transaction is aborted server-side (no partial apply).');
        } else {
          console.error('  transaction rolled back; no partial migration was applied.');
        }
        report.migrations.push({ file, status: 'failed', error: e.message, startedAt });
        writeJson(_r(process.cwd(), 'reports', 'migration-apply.json'), report);
        process.exit(1);
      }
      for (const n of notices) console.log('  NOTICE: ' + n);
      if (backend.kind === 'api') {
        // RAISE NOTICE is not returned by the Management API. The verification
        // queries below cover the same ground (does the index exist, what is
        // the CHECK constraint), so a skipped block still shows up.
        console.log('  (RAISE NOTICE is not surfaced over the Management API;');
        console.log('   the verification step below proves the outcome instead)');
      }
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
} catch (e) {
  // Credential / connectivity problems land here before anything is applied.
  console.error('');
  console.error('FATAL: ' + e.message);
  console.error('  Nothing was applied. Fix the credential or the connection and re-run.');
  process.exit(1);
} finally {
  await backend.close().catch(() => {});
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
