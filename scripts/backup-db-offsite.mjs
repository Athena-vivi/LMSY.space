/**
 * Offsite copy of the newest database logical backup.
 *
 * WHY
 *   `npm run backup:db` writes to this machine only. If the machine is lost,
 *   or `backups/` is deleted, the only copy of the rows is gone. Uploading the
 *   snapshot to the SECOND R2 bucket puts a copy on independent storage that
 *   is reachable from anywhere with the R2 credentials.
 *
 * SAFETY
 *   - Upload only. Nothing in the source bucket or the database is modified,
 *     moved, renamed or deleted.
 *   - Keys are namespaced under `db-logical/<timestamp>/` so an upload can
 *     never overwrite image objects.
 *   - Every uploaded file is verified afterwards by re-downloading it and
 *     comparing SHA-256, not just by checking the size.
 *   - The snapshot is never written into the git working tree outside
 *     `backups/`, and `backups/` is git-ignored.
 *
 * PRIVACY
 *   The snapshot contains every business row, including the unpublished draft
 *   queue. R2 buckets are private by default (no public bucket policy, no
 *   r2.dev access), so the upload is only readable with the R2 credentials.
 *   Keep those credentials out of git.
 *
 * USAGE
 *   npm run backup:db:offsite
 *   R2_DB_BACKUP_BUCKET=other-bucket npm run backup:db:offsite
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve as _r, join } from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { loadEnv, requireEnv, sha256, writeJson, ensureDir } from './lib/ops-common.mjs';

loadEnv();
requireEnv(['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']);

const BACKUP_ROOT = _r(process.cwd(), 'backups', 'db');
const TARGET = process.env.R2_DB_BACKUP_BUCKET || 'lmsy-archive-backup';
const PREFIX = 'db-logical';
const KEEP = Number(process.env.R2_DB_BACKUP_KEEP || 10);

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function newestSnapshot() {
  if (!existsSync(BACKUP_ROOT)) return null;
  const dirs = readdirSync(BACKUP_ROOT)
    .filter((d) => statSync(join(BACKUP_ROOT, d)).isDirectory())
    .sort();
  if (!dirs.length) return null;
  const dir = dirs[dirs.length - 1];
  const manifestPath = join(BACKUP_ROOT, dir, 'manifest.json');
  if (!existsSync(manifestPath)) return null;
  return { dir, path: join(BACKUP_ROOT, dir) };
}

async function bucketExists(bucket) {
  try {
    await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const snap = newestSnapshot();
  if (!snap) {
    console.error('FATAL: no database snapshot found. Run `npm run backup:db` first.');
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(join(snap.path, 'manifest.json'), 'utf-8'));
  const totals = manifest.totals || {};
  console.log(`snapshot : ${snap.dir}`);
  console.log(`manifest : ${totals.tables ?? manifest.tables?.length ?? '?'} tables, ` +
    `${totals.rows ?? '?'} rows, ok=${manifest.ok ?? 'unknown'}`);
  if (manifest.ok === false) {
    console.error('FATAL: refusing to ship a snapshot whose own manifest says it failed.');
    process.exit(1);
  }

  const files = readdirSync(snap.path).filter((f) => statSync(join(snap.path, f)).isFile());
  console.log(`files    : ${files.length}`);
  console.log(`target   : ${TARGET}/${PREFIX}/${snap.dir}/`);

  if (!(await bucketExists(TARGET))) {
    console.log(`bucket ${TARGET} not found; creating ...`);
    await s3.send(new CreateBucketCommand({ Bucket: TARGET }));
  }

  const uploaded = [];
  const failures = [];
  let bytes = 0;

  for (const f of files) {
    const buf = readFileSync(join(snap.path, f));
    const key = `${PREFIX}/${snap.dir}/${f}`;
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: TARGET,
          Key: key,
          Body: buf,
          ContentType: f.endsWith('.json') ? 'application/json' : 'application/octet-stream',
          Metadata: { 'sha256': sha256(buf), 'source-snapshot': snap.dir },
        })
      );
      uploaded.push({ file: f, key, size: buf.length, sha256: sha256(buf) });
      bytes += buf.length;
    } catch (e) {
      failures.push(`${f}: ${e.name} ${e.message}`);
    }
  }
  console.log(`uploaded : ${uploaded.length}/${files.length} (${(bytes / 1024).toFixed(1)}KB)`);
  for (const f of failures) console.error('  - ' + f);

  // Verify by re-downloading and hashing - a HEAD check alone cannot prove the
  // bytes survived.
  const mismatch = [];
  for (const u of uploaded) {
    try {
      const g = await s3.send(new GetObjectCommand({ Bucket: TARGET, Key: u.key }));
      const body = Buffer.from(await g.Body.transformToByteArray());
      if (sha256(body) !== u.sha256 || body.length !== u.size) {
        mismatch.push(u.key);
      }
    } catch (e) {
      mismatch.push(`${u.key} (readback failed: ${e.name})`);
    }
  }
  console.log(`verify   : ${uploaded.length - mismatch.length}/${uploaded.length} hash-verified`);
  for (const m of mismatch) console.error('  mismatch ' + m);

  // Retention: list existing snapshots in the bucket, report the oldest ones.
  const listed = await s3.send(
    new ListObjectsV2Command({ Bucket: TARGET, Prefix: `${PREFIX}/`, Delimiter: '/' })
  );
  const snapshots = (listed.CommonPrefixes || [])
    .map((p) => p.Prefix.replace(`${PREFIX}/`, '').replace(/\/$/, ''))
    .sort();
  const toPrune = snapshots.slice(0, Math.max(0, snapshots.length - KEEP));
  console.log(`retention: ${snapshots.length} snapshot(s) stored, keep ${KEEP}, ` +
    `${toPrune.length} older than the retention window`);
  if (toPrune.length) {
    console.log('  (pruning is intentionally NOT automatic - review before deleting)');
    for (const s of toPrune) console.log('  candidate: ' + s);
  }

  const ok = failures.length === 0 && mismatch.length === 0;
  writeJson(_r(process.cwd(), 'backups', 'db-offsite', 'offsite-report.json'), {
    kind: 'db-logical-offsite',
    target: TARGET,
    prefix: PREFIX,
    snapshot: snap.dir,
    snapshotManifest: {
      tables: totals.tables ?? manifest.tables?.length ?? null,
      rows: totals.rows ?? null,
      ok: manifest.ok ?? null,
    },
    startedAt: new Date().toISOString(),
    files: uploaded.length,
    bytes,
    failures,
    hashMismatch: mismatch,
    snapshotsStored: snapshots.length,
    ok,
  });

  if (!ok) {
    console.error('DB OFFSITE BACKUP FAILED');
    process.exit(1);
  }
  console.log('DB offsite backup OK. Report: backups/db-offsite/offsite-report.json');
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
