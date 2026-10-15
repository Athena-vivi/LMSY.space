/**
 * Offsite R2 backup: mirror every object from the source bucket into a SECOND
 * bucket, using server-side CopyObject.
 *
 * WHY: `npm run backup:r2` writes a mirror to the local machine. That protects
 * against losing objects, but not against losing the local machine, and it
 * shares a failure domain with nothing else. A second bucket is a separate
 * object namespace, so accidentally deleting objects in the source bucket does
 * NOT affect the copy.
 *
 * Cost: R2 -> R2 copy is server-side (no egress). The archive is ~152MB, inside
 * the R2 free tier (10GB). CopyObject counts against the Class A free allowance
 * (1M/month); this uses ~400.
 *
 * LIMITATION: both buckets live in the SAME Cloudflare account, so it does not
 * protect against account-level loss (billing lockout, account compromise).
 * For that, replicate to a different provider/account.
 *
 * USAGE
 *   node scripts/backup-r2-offsite.mjs                 # verify + copy
 *   node scripts/backup-r2-offsite.mjs --dry-run       # show what would copy
 *   R2_OFFSITE_BUCKET=my-other-bucket node scripts/backup-r2-offsite.mjs
 */

import { readFileSync } from 'fs';
import { resolve as _r } from 'path';
import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { loadEnv, requireEnv, writeJson, ensureDir } from './lib/ops-common.mjs';

loadEnv();
requireEnv(['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']);

const SOURCE = process.env.R2_BUCKET_NAME;
const TARGET = process.env.R2_OFFSITE_BUCKET || `${SOURCE}-backup`;
const DRY_RUN = process.argv.includes('--dry-run');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function listAll(bucket) {
  const out = [];
  let token;
  for (;;) {
    const r = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token, MaxKeys: 1000 })
    );
    for (const o of r.Contents || []) out.push({ key: o.Key, size: o.Size, etag: o.ETag });
    if (!r.IsTruncated) break;
    token = r.NextContinuationToken;
  }
  return out;
}

async function exists(bucket, key) {
  try {
    const h = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { size: h.ContentLength, etag: h.ETag };
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Offsite mirror: ${SOURCE}  ->  ${TARGET}${DRY_RUN ? '  (dry run)' : ''}`);

  const src = await listAll(SOURCE);
  console.log(`source objects: ${src.length}`);

  let target = [];
  try {
    target = await listAll(TARGET);
  } catch (e) {
    if (!DRY_RUN) {
      console.log(`target bucket not found (${e.name}); creating ${TARGET} ...`);
      await s3.send(new CreateBucketCommand({ Bucket: TARGET }));
      target = [];
    } else {
      console.log(`target bucket missing: ${e.name}`);
    }
  }
  const targetByKey = new Map(target.map((o) => [o.key, o]));

  const toCopy = [];
  const skipped = [];
  for (const o of src) {
    const t = targetByKey.get(o.key);
    if (t && t.size === o.size) skipped.push(o.key);
    else toCopy.push(o);
  }

  console.log(`already present and same size: ${skipped.length}`);
  console.log(`to copy: ${toCopy.length}`);

  if (DRY_RUN) {
    for (const o of toCopy.slice(0, 10)) console.log(`  would copy ${o.key} (${o.size}B)`);
    if (toCopy.length > 10) console.log(`  ... and ${toCopy.length - 10} more`);
    return;
  }

  const failures = [];
  let copied = 0;
  let bytes = 0;
  for (const o of toCopy) {
    try {
      await s3.send(
        new CopyObjectCommand({
          Bucket: TARGET,
          Key: o.key,
          CopySource: `${SOURCE}/${encodeURIComponent(o.key).replace(/%2F/g, '/')}`,
        })
      );
      copied++;
      bytes += o.size || 0;
      if (copied % 50 === 0) console.log(`  ${copied}/${toCopy.length} copied`);
    } catch (e) {
      failures.push(`${o.key}: ${e.name} ${e.message}`);
    }
  }
  console.log(`copied: ${copied} (${(bytes / 1024 / 1024).toFixed(1)}MB), failures: ${failures.length}`);
  for (const f of failures) console.error('  - ' + f);

  // Verification: every source key must exist in the target with the same size.
  const after = await listAll(TARGET);
  const afterByKey = new Map(after.map((o) => [o.key, o]));
  const missing = src.filter((o) => !afterByKey.has(o.key));
  const sizeMismatch = src.filter((o) => {
    const t = afterByKey.get(o.key);
    return t && t.size !== o.size;
  });

  console.log('');
  console.log(`verify -> target objects: ${after.length}, missing: ${missing.length}, size mismatch: ${sizeMismatch.length}`);
  for (const m of missing.slice(0, 10)) console.error('  missing ' + m.key);
  for (const m of sizeMismatch.slice(0, 10)) console.error('  size mismatch ' + m.key);

  const outDir = ensureDir(_r(process.cwd(), 'backups', 'r2-offsite'));
  writeJson(`${outDir}/offsite-report.json`, {
    kind: 'r2-offsite-mirror',
    source: SOURCE,
    target: TARGET,
    startedAt: new Date().toISOString(),
    sourceObjects: src.length,
    targetObjects: after.length,
    copied,
    skippedExisting: skipped.length,
    failures,
    missing: missing.map((m) => m.key),
    sizeMismatch: sizeMismatch.map((m) => m.key),
    ok: failures.length === 0 && missing.length === 0 && sizeMismatch.length === 0,
  });

  if (failures.length || missing.length || sizeMismatch.length) {
    console.error('OFFSITE BACKUP FAILED');
    process.exit(1);
  }
  console.log('Offsite backup OK. Report: backups/r2-offsite/offsite-report.json');
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
