/**
 * R2 <-> database reference audit (READ ONLY).
 *
 * WHY THIS EXISTS
 *   The phase 1 audit found 300+ objects in R2 that no database row points at.
 *   "No reference found" is NOT the same as "unused": some of those files are
 *   the only copy of historical magazine pages. Before any future cleanup, the
 *   owner needs an authoritative, repeatable picture of what references what.
 *
 * THIS SCRIPT NEVER DELETES ANYTHING. It only lists and classifies.
 *
 * CLASSIFICATION
 *   referenced          : at least one database field points at the object
 *   unreferenced        : no database field points at the object (keep it!)
 *   missing             : a database field points at a key that is not in R2
 *   unknown-source      : object exists but its key shape is not recognised
 *
 * REFERENCE SOURCES SCANNED
 *   gallery_assets.image_url
 *   draft_items.r2_media_url, draft_items.r2_key
 *   projects.cover_url, projects.homepage_cover_url
 *   every text/jsonb field of site_content_blocks (any cdn.lmsy.space URL)
 *
 * USAGE
 *   node scripts/audit-r2-references.mjs [--out reports]
 */

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { loadEnv, requireEnv } from './lib/ops-common.mjs';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir = resolve(process.cwd(), outIdx >= 0 ? args[outIdx + 1] : 'reports');

loadEnv();
requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CDN_MARKERS = ['cdn.lmsy.space/', 'r2.dev/', 'r2.cloudflarestorage.com/'];

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function fetchAll(table, select = '*') {
  const rows = [];
  let offset = 0;
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=1000&offset=${offset}`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Accept-Profile': 'lmsy_archive',
      },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < 1000) break;
    offset += 1000;
  }
  return rows;
}

async function listR2() {
  const objects = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      MaxKeys: 1000,
      ContinuationToken: token,
    }));
    for (const o of res.Contents || []) objects.push({ key: o.Key, size: o.Size || 0 });
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

/** Extract an R2 key from a stored value (full URL or bare key). */
function toKey(value) {
  if (!value || typeof value !== 'string') return null;
  for (const marker of CDN_MARKERS) {
    if (value.includes(marker)) {
      const key = value.split(marker)[1];
      return key ? key.split('?')[0] : null;
    }
  }
  if (/^https?:\/\//i.test(value)) return null;   // external URL, not our bucket
  return value.replace(/^\/+/, '').split('?')[0] || null;
}

/**
 * True when a string looks like a path to an object in our bucket rather than
 * ordinary copy text (site_content_blocks stores titles and paragraphs too).
 */
const MEDIA_EXTENSION = /\.(webp|jpe?g|png|gif|avif|mp4|webm|mov)$/i;
function looksLikeObjectKey(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  if (CDN_MARKERS.some(marker => value.includes(marker))) return true;
  if (/^https?:\/\//i.test(value)) return false;             // external asset
  const cleaned = value.replace(/^\/+/, '').split('?')[0];
  if (!MEDIA_EXTENSION.test(cleaned)) return false;           // no media extension
  return cleaned.includes('/');                               // e.g. draft/... or magazines/...
}

/** Walk any nested value and collect plausible R2 keys. */
function collectKeysFromValue(value, sink, sourceLabel) {
  if (value === null || value === undefined) return;
  if (typeof value === 'string') {
    if (!looksLikeObjectKey(value)) return;
    const key = toKey(value);
    if (key) sink.push({ key, source: sourceLabel });
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectKeysFromValue(item, sink, sourceLabel);
    return;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) collectKeysFromValue(item, sink, sourceLabel);
  }
}

async function main() {
  console.log('R2 <-> database reference audit (read only)');

  const [objects, assets, drafts, projects, blocks] = await Promise.all([
    listR2(),
    fetchAll('gallery_assets'),
    fetchAll('draft_items'),
    fetchAll('projects'),
    fetchAll('site_content_blocks'),
  ]);
  const r2Keys = new Set(objects.map(o => o.key));

  const references = [];
  for (const a of assets) {
    const key = toKey(a.image_url);
    if (key) references.push({ key, source: `gallery_assets.image_url (id=${a.id})` });
  }
  for (const d of drafts) {
    const k1 = toKey(d.r2_media_url);
    if (k1) references.push({ key: k1, source: `draft_items.r2_media_url (id=${d.id})` });
    const k2 = toKey(d.r2_key);
    if (k2) references.push({ key: k2, source: `draft_items.r2_key (id=${d.id})` });
  }
  for (const p of projects) {
    for (const field of ['cover_url', 'homepage_cover_url']) {
      const key = toKey(p[field]);
      if (key) references.push({ key, source: `projects.${field} (id=${p.id})` });
    }
  }
  for (const b of blocks) {
    collectKeysFromValue(b, references, `site_content_blocks (id=${b.id})`);
  }

  const referencedKeys = new Map();
  for (const ref of references) {
    if (!referencedKeys.has(ref.key)) referencedKeys.set(ref.key, []);
    referencedKeys.get(ref.key).push(ref.source);
  }

  const referenced = [...referencedKeys.keys()].filter(k => r2Keys.has(k));
  const missing = [...referencedKeys.keys()].filter(k => !r2Keys.has(k));
  const unreferenced = [...r2Keys].filter(k => !referencedKeys.has(k));

  const byPrefix = (keys) => {
    const out = {};
    for (const k of keys) {
      const p = k.split('/')[0];
      out[p] = (out[p] || 0) + 1;
    }
    return out;
  };

  const sizeOf = new Map(objects.map(o => [o.key, o.size]));
  const sumSize = (keys) => keys.reduce((s, k) => s + (sizeOf.get(k) || 0), 0);

  const report = {
    generatedAt: new Date().toISOString(),
    bucket: process.env.R2_BUCKET_NAME,
    totals: {
      r2Objects: objects.length,
      r2Bytes: sumSize([...r2Keys]),
      databaseReferences: references.length,
      distinctReferencedKeys: referencedKeys.size,
      referenced: referenced.length,
      unreferenced: unreferenced.length,
      missing: missing.length,
    },
    byPrefix: {
      referenced: byPrefix(referenced),
      unreferenced: byPrefix(unreferenced),
      missing: byPrefix(missing),
    },
    unreferencedDetail: unreferenced.map(k => ({ key: k, size: sizeOf.get(k) || 0 })),
    missingDetail: missing.map(k => ({ key: k, referencedBy: referencedKeys.get(k) })),
    publishedAssetsOnDraftPrefix: assets
      .filter(a => typeof a.image_url === 'string' && a.image_url.includes('/draft/'))
      .map(a => ({ id: a.id, image_url: a.image_url, project_id: a.project_id, catalog_id: a.catalog_id, objectExists: r2Keys.has(toKey(a.image_url)) })),
    note: 'Nothing was deleted or modified. "unreferenced" means no database field was found pointing at the object; it does NOT mean the file is safe to remove.',
  };

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, 'r2-reference-audit.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 1), 'utf-8');

  const md = [
    '# R2 <-> Database Reference Audit',
    '',
    `Generated: ${report.generatedAt}`,
    `Bucket: ${report.bucket}`,
    '',
    '| Category | Objects | Size |',
    '|---|---|---|',
    `| R2 objects total | ${objects.length} | ${(sumSize([...r2Keys]) / 1048576).toFixed(1)} MB |`,
    `| Referenced by a database field | ${referenced.length} | ${(sumSize(referenced) / 1048576).toFixed(1)} MB |`,
    `| Unreferenced (keep!) | ${unreferenced.length} | ${(sumSize(unreferenced) / 1048576).toFixed(1)} MB |`,
    `| Referenced but missing from R2 | ${missing.length} | - |`,
    '',
    '## Unreferenced objects by prefix',
    '',
    ...Object.entries(report.byPrefix.unreferenced).map(([p, n]) => `- ${p}/ : ${n}`),
    '',
    '## Missing objects (database points at a key that is not in R2)',
    '',
    missing.length ? missing.map(k => `- ${k}`).join('\n') : '- none',
    '',
    '## Published assets stored under the draft/ prefix (must not be broken by draft cleanup)',
    '',
    `Count: ${report.publishedAssetsOnDraftPrefix.length}`,
    '',
    '| Asset id | Exists in R2 | image_url |',
    '|---|---|---|',
    ...report.publishedAssetsOnDraftPrefix.map(a => `| ${a.id} | ${a.objectExists ? 'yes' : 'NO'} | ${a.image_url} |`),
    '',
    '> This report is read-only. It must be consulted before any future cleanup:',
    '> anything listed as unreferenced may still be the only copy of historical content.',
    '',
  ].join('\n');
  const mdPath = join(outDir, 'r2-reference-audit.md');
  writeFileSync(mdPath, md, 'utf-8');

  console.log('');
  console.log(`R2 objects: ${objects.length} | referenced: ${referenced.length} | unreferenced: ${unreferenced.length} | missing: ${missing.length}`);
  console.log(`Published assets on draft/ prefix: ${report.publishedAssetsOnDraftPrefix.length} (all present in R2: ${report.publishedAssetsOnDraftPrefix.every(a => a.objectExists)})`);
  console.log('Report: ' + jsonPath.replace(process.cwd(), '').replace(/\\/g, '/'));
  console.log('        ' + mdPath.replace(process.cwd(), '').replace(/\\/g, '/'));

  if (missing.length) {
    console.error(`WARNING: ${missing.length} database reference(s) point at missing R2 objects.`);
  }
}

main().catch(error => {
  console.error('FATAL: audit failed:', error.message);
  process.exit(1);
});
