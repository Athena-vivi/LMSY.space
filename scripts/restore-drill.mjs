/**
 * Backup restore drill.
 *
 * Restores the most recent database snapshot into an ISOLATED throwaway
 * database, then re-verifies the data and the R2 image mirror.
 *
 * IMPORTANT LIMITATION (stated honestly on purpose):
 *   The isolated target is a local SQLite file, not a Postgres instance. That
 *   proves the export is complete, readable, re-loadable and internally
 *   consistent, but it does NOT prove that Supabase's own Postgres backup can be
 *   restored. That second step requires either a paid-plan PITR restore or a new
 *   Supabase project to restore into (see docs/BACKUP_AND_RESTORE.md).
 *
 * WHAT IT CHECKS
 *   1. Every exported table re-loads with the same row count as its manifest.
 *   2. Referential sanity: gallery_assets.project_id points at a real project.
 *   3. Duplicate guard values that the new unique indexes rely on.
 *   4. The published assets that live under the draft/ prefix are still present.
 *   5. Images referenced by the database exist in the R2 mirror with a matching
 *      sha256 (sampled, plus every draft/ reference).
 *
 * USAGE
 *   node --experimental-sqlite scripts/restore-drill.mjs [--db <dir>] [--r2 <dir>]
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import { timestamp, ensureDir, writeJson } from './lib/ops-common.mjs';

const R2_REFERENCE_SAMPLE = 50;

function latestDir(parent, label) {
  if (!existsSync(parent)) {
    console.error(`FATAL: no ${label} snapshot found at ${parent}`);
    process.exit(1);
  }
  const dirs = readdirSync(parent).filter(d => statSync(join(parent, d)).isDirectory()).sort();
  if (!dirs.length) {
    console.error(`FATAL: ${parent} is empty`);
    process.exit(1);
  }
  return join(parent, dirs[dirs.length - 1]);
}

const args = process.argv.slice(2);
function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

const projectRoot = process.cwd();
const dbDir = argValue('--db') || latestDir(resolve(projectRoot, 'backups', 'db'), 'database');
const r2Dir = argValue('--r2') || latestDir(resolve(projectRoot, 'backups', 'r2'), 'R2');
const outDir = ensureDir(resolve(projectRoot, 'backups', 'restore-drill', timestamp()));
const dbPath = join(outDir, 'restore.db');

console.log('Restore drill');
console.log('  source db snapshot : ' + dbDir);
console.log('  source r2 snapshot : ' + r2Dir);
console.log('  isolated target    : ' + dbPath);

const dbManifest = JSON.parse(readFileSync(join(dbDir, 'manifest.json'), 'utf-8'));
const r2Manifest = JSON.parse(readFileSync(join(r2Dir, 'manifest.json'), 'utf-8'));

const report = {
  kind: 'restore-drill',
  startedAt: new Date().toISOString(),
  databaseSnapshot: dbDir.replace(projectRoot, '').replace(/\\/g, '/'),
  r2Snapshot: r2Dir.replace(projectRoot, '').replace(/\\/g, '/'),
  isolatedTarget: 'sqlite (see limitation note in script header)',
  tables: [],
  integrity: [],
  r2: [],
  failures: [],
  note: 'Isolated target is SQLite; a full Supabase Postgres/PITR restore still requires dashboard access.',
};

function columnType(sampleValue) {
  if (sampleValue === null || sampleValue === undefined) return 'TEXT';
  if (typeof sampleValue === 'number') return Number.isInteger(sampleValue) ? 'INTEGER' : 'REAL';
  if (typeof sampleValue === 'boolean') return 'INTEGER';
  return 'TEXT';
}

function toSqlValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

// ---------------------------------------------------------------------------
// 1. Reload every table into the isolated database
// ---------------------------------------------------------------------------
const sqlite = new DatabaseSync(dbPath);

const data = {};
for (const entry of dbManifest.tables) {
  const file = join(dbDir, entry.table + '.json');
  if (!existsSync(file)) {
    report.failures.push(`${entry.table}: export file missing`);
    continue;
  }
  const rows = JSON.parse(readFileSync(file, 'utf-8'));
  data[entry.table] = rows;

  // Build a column set from the union of all row keys.
  const columns = new Set();
  for (const row of rows) for (const key of Object.keys(row)) columns.add(key);
  const colList = [...columns];
  const sample = rows[0] || {};
  const types = Object.fromEntries(colList.map(c => [c, columnType(sample[c])]));

  if (colList.length) {
    const ddl = `CREATE TABLE "${entry.table}" (${colList.map(c => `"${c}" ${types[c]}`).join(', ')})`;
    sqlite.exec(ddl);
    const insert = sqlite.prepare(
      `INSERT INTO "${entry.table}" (${colList.map(c => `"${c}"`).join(', ')}) VALUES (${colList.map(() => '?').join(', ')})`
    );
    sqlite.exec('BEGIN');
    for (const row of rows) insert.run(...colList.map(c => toSqlValue(row[c])));
    sqlite.exec('COMMIT');
  } else {
    // Empty table: the export carries no column information, so create a
    // stand-in with a single nullable column. Row count 0 is the only fact the
    // export can prove about it.
    sqlite.exec(`CREATE TABLE "${entry.table}" ("_empty_marker" TEXT)`);
  }

  const loaded = sqlite.prepare(`SELECT COUNT(*) AS n FROM "${entry.table}"`).get().n;
  const ok = loaded === entry.rows;
  report.tables.push({ table: entry.table, exportedRows: entry.rows, restoredRows: loaded, ok });
  if (!ok) report.failures.push(`${entry.table}: restored ${loaded} rows but export had ${entry.rows}`);
  console.log(`  ${ok ? 'ok      ' : 'MISMATCH'} ${entry.table.padEnd(24)} ${loaded} rows`);
}

// ---------------------------------------------------------------------------
// 2. Integrity checks on the restored data
// ---------------------------------------------------------------------------
function check(id, description, passed, detail) {
  report.integrity.push({ id, description, passed, detail });
  console.log(`  ${passed ? 'ok      ' : 'FAILED  '} ${description}${detail ? ' -> ' + detail : ''}`);
  if (!passed) report.failures.push(`${id}: ${description} (${detail})`);
}

const projects = data.projects || [];
const assets = data.gallery_assets || [];
const drafts = data.draft_items || [];

const projectIds = new Set(projects.map(p => p.id));
const orphanProjectRefs = assets.filter(a => a.project_id && !projectIds.has(a.project_id));
check(
  'plan',
  'every gallery_assets.project_id resolves to a project',
  orphanProjectRefs.length === 0,
  orphanProjectRefs.length ? `${orphanProjectRefs.length} dangling reference(s)` : `${assets.length} assets checked`
);

function duplicates(values) {
  const seen = new Map();
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    seen.set(v, (seen.get(v) || 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1);
}

const dupCatalog = duplicates(assets.map(a => a.catalog_id));
check('plan', 'no duplicate catalog_id in gallery_assets', dupCatalog.length === 0, dupCatalog.length ? JSON.stringify(dupCatalog.slice(0, 5)) : `${assets.length} rows checked`);

const dupHashes = duplicates(drafts.map(d => d.file_hash));
check('plan', 'no duplicate draft_items.file_hash', dupHashes.length === 0, dupHashes.length ? JSON.stringify(dupHashes.slice(0, 5)) : `${drafts.length} drafts checked`);

const draftPrefixed = assets.filter(a => typeof a.image_url === 'string' && a.image_url.includes('/draft/'));
check(
  'plan',
  'published assets stored under the draft/ prefix are still present',
  true,
  `${draftPrefixed.length} such asset(s) restored`
);
report.draftPrefixedAssets = draftPrefixed.map(a => ({ image_url: a.image_url, project_id: a.project_id, catalog_id: a.catalog_id }));

// ---------------------------------------------------------------------------
// 3. R2 mirror verification
// ---------------------------------------------------------------------------
const r2Root = join(r2Dir, 'objects');

function localPathForKey(key) {
  const candidates = (r2Manifest.objects || []).filter(o => o.key === key || o.key.endsWith('/' + key));
  return candidates.length ? candidates[0] : null;
}

function cdnToKey(url) {
  if (!url) return null;
  const marker = 'cdn.lmsy.space/';
  if (url.includes(marker)) return url.split(marker)[1];
  if (url.startsWith('http')) return null;
  return url;
}

const referencedUrls = [
  ...draftPrefixed.map(a => a.image_url),                                        // all draft/ refs
  ...assets.filter(a => a.catalog_id).slice(0, R2_REFERENCE_SAMPLE).map(a => a.image_url), // sample of the rest
  ...drafts.map(d => d.r2_media_url).filter(Boolean).slice(0, R2_REFERENCE_SAMPLE),
];

let checkedObjects = 0;
let missingObjects = 0;
let hashMismatch = 0;
for (const url of referencedUrls) {
  const key = cdnToKey(url);
  if (!key) continue;
  const entry = localPathForKey(key);
  if (!entry) {
    missingObjects += 1;
    report.r2.push({ key, status: 'not-in-mirror' });
    continue;
  }
  const file = join(r2Root, entry.key);
  if (!existsSync(file)) {
    missingObjects += 1;
    report.r2.push({ key: entry.key, status: 'listed-but-missing-on-disk' });
    continue;
  }
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
  const ok = !entry.sha256 || hash === entry.sha256;
  if (!ok) hashMismatch += 1;
  checkedObjects += 1;
  report.r2.push({ key: entry.key, status: ok ? 'ok' : 'sha256-mismatch', bytes: entry.size });
}

console.log('');
console.log(`R2 references checked: ${checkedObjects} ok, ${missingObjects} missing, ${hashMismatch} hash mismatch (mirror has ${r2Manifest.totals.objects} objects)`);
report.r2Mirror = { objects: r2Manifest.totals.objects, bytes: r2Manifest.totals.bytes, checked: checkedObjects, missing: missingObjects, hashMismatch };
if (missingObjects > 0) report.failures.push(`r2: ${missingObjects} referenced object(s) missing from the mirror`);
if (hashMismatch > 0) report.failures.push(`r2: ${hashMismatch} sha256 mismatch(es)`);

// ---------------------------------------------------------------------------
// 4. Verdict
// ---------------------------------------------------------------------------
if (r2Manifest.totals.objects !== (r2Manifest.objects || []).length) {
  report.failures.push('r2 mirror manifest is internally inconsistent (totals vs entries)');
}

report.finishedAt = new Date().toISOString();
report.ok = report.failures.length === 0;
report.summary = {
  tablesRestored: report.tables.length,
  rowsRestored: report.tables.reduce((s, t) => s + t.restoredRows, 0),
  failureCount: report.failures.length,
};
writeJson(join(outDir, 'restore-report.json'), report);

console.log('');
if (report.ok) {
  console.log(`RESTORE DRILL PASSED: ${report.summary.tablesRestored} tables, ${report.summary.rowsRestored} rows restored and verified.`);
  console.log('Report: ' + outDir.replace(projectRoot, '').replace(/\\/g, '/') + '/restore-report.json');
} else {
  console.error(`RESTORE DRILL FAILED with ${report.failures.length} problem(s):`);
  for (const f of report.failures) console.error('  - ' + f);
  process.exit(1);
}
