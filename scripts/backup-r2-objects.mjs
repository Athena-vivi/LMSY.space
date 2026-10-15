/**
 * Cloudflare R2 image backup (full mirror to local disk).
 *
 * WHY: the database and the object store are separate backup problems. The
 * audit found 315+ historical magazine images that are NOT referenced by any
 * database row, so a database-only backup would not preserve them.
 *
 * OUTPUT
 *   backups/r2/<timestamp>/
 *     manifest.json   every object: key, size, etag, sha256, local path
 *     objects/<key>   the actual file content
 *
 * BEHAVIOUR
 *   - Read-only against R2 (ListObjectsV2 + GetObject).
 *   - Verifies every downloaded file against the listing size and computes a
 *     checksum, so a truncated download is detected.
 *   - Skips re-downloading a key that already exists in the target snapshot
 *     with the same size (makes re-runs cheap after a partial failure).
 *   - Exits non-zero on any error.
 *
 * USAGE
 *   node scripts/backup-r2-objects.mjs [--prefix magazines/]
 */

import { createWriteStream, existsSync, statSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join, resolve, dirname } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { loadEnv, requireEnv, timestamp, ensureDir, writeJson } from './lib/ops-common.mjs';

const args = process.argv.slice(2);
const prefixArgIndex = args.indexOf('--prefix');
const PREFIX = prefixArgIndex >= 0 ? args[prefixArgIndex + 1] : '';

loadEnv();
requireEnv(['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']);

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function listObjects() {
  const objects = [];
  let token;
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: PREFIX || undefined,
      MaxKeys: 1000,
      ContinuationToken: token,
    }));
    for (const o of res.Contents || []) objects.push({ key: o.Key, size: o.Size || 0, etag: o.ETag });
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

async function download(key, target) {
  const res = await client.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
  ensureDir(dirname(target));
  const body = res.Body;
  // The SDK may return a Node Readable (ChecksumStream) rather than a WHATWG
  // ReadableStream, so handle both shapes.
  if (body && typeof body.pipe === 'function') {
    await pipeline(body, createWriteStream(target));
  } else {
    await pipeline(Readable.fromWeb(body), createWriteStream(target));
  }
}

function fileSha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

async function main() {
  const stamp = timestamp();
  const root = ensureDir(resolve(process.cwd(), 'backups', 'r2', stamp));
  console.log('R2 backup -> ' + root + (PREFIX ? ` (prefix: ${PREFIX})` : ' (all objects)'));

  const objects = await listObjects();
  console.log(`Objects to mirror: ${objects.length}`);

  const manifest = {
    kind: 'r2-object-mirror',
    bucket: process.env.R2_BUCKET_NAME,
    endpointHost: new URL(process.env.R2_ENDPOINT).host,
    prefix: PREFIX || null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    objects: [],
    failures: [],
    totals: { objects: 0, bytes: 0 },
  };

  let index = 0;
  for (const obj of objects) {
    index += 1;
    const target = join(root, 'objects', obj.key);
    try {
      const already = existsSync(target) && statSync(target).size === obj.size;
      if (!already) await download(obj.key, target);

      const size = statSync(target).size;
      const sizeOk = size === obj.size;
      const hash = sizeOk ? fileSha256(target) : null;

      manifest.objects.push({
        key: obj.key,
        size: obj.size,
        etag: obj.etag,
        sha256: hash,
        localPath: `r2/${stamp}/objects/${obj.key}`,
        verified: sizeOk,
      });
      manifest.totals.objects += 1;
      manifest.totals.bytes += size;

      if (!sizeOk) {
        manifest.failures.push(`${obj.key}: size mismatch (local ${size}, remote ${obj.size})`);
        console.error(`  MISMATCH  ${obj.key} local=${size} remote=${obj.size}`);
      } else if (index % 50 === 0 || index === objects.length) {
        console.log(`  ${index}/${objects.length} objects, ${(manifest.totals.bytes / 1048576).toFixed(1)}MB`);
      }
    } catch (error) {
      console.error(`  FAILED    ${obj.key}: ${error.message}`);
      manifest.failures.push(`${obj.key}: ${error.message}`);
    }
  }

  manifest.finishedAt = new Date().toISOString();
  manifest.ok = manifest.failures.length === 0;
  writeJson(join(root, 'manifest.json'), manifest);

  console.log('');
  console.log(`Objects mirrored: ${manifest.totals.objects}/${objects.length} | size: ${(manifest.totals.bytes / 1048576).toFixed(1)}MB`);
  if (!manifest.ok) {
    console.error(`R2 BACKUP FAILED for ${manifest.failures.length} object(s).`);
    process.exit(1);
  }
  console.log('R2 backup OK. Manifest: ' + `backups/r2/${stamp}/manifest.json`);
}

main().catch(error => {
  console.error('FATAL: R2 backup aborted:', error.message);
  process.exit(1);
});
