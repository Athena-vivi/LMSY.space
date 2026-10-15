/**
 * Backfill historical magazine inner pages into lmsy_archive.gallery_assets
 *
 * Background (see MAGAZINE_INVESTIGATION_2026-10-15.md):
 *   Commit b60e2e2 (2026-03-16) switched /projects/[id] from the legacy
 *   `gallery` table to `gallery_assets` without migrating data. The legacy
 *   table was later emptied outside version control. R2 still holds all
 *   inner pages under magazines/{year}/LMSY-{TYPE}-{YYYYMMDD}-{NNN}.webp,
 *   where -001 is the real cover (matches a project's cover_url).
 *
 * Usage (run with: node --experimental-strip-types scripts/backfill-magazine-pages.ts [--apply|--manifest] )
 *   (no flag)   Dry-run: print what would be inserted, insert nothing
 *   --manifest  Also write temp/backfill-manifest.json + temp/backfill-manifest.md
 *   --apply     Insert missing rows into gallery_assets (idempotent by image_url)
 *
 * Safety:
 *   - Pending groups (no project match confirmed) are NEVER inserted.
 *   - Rows are matched to projects only via exact cover_url == -001 file URL.
 *   - Idempotent: existing image_url values are skipped.
 *   - Read-only against R2. Never deletes or moves objects.
 */

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const APPLY = process.argv.includes('--apply');
const MANIFEST = process.argv.includes('--manifest');

// Groups confirmed to have no matching project. Keep files untouched, insert nothing.
const PENDING_GROUPS = new Set(['AD-20251216', 'TRV-20251216']);

const CDN_BASE = 'https://cdn.lmsy.space/';

// ---------- env loading (same pattern as reset-admin-password.ts) ----------
function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          const value = trimmed.slice(eq + 1).trim();
          if (key && value) process.env[key] = value;
        }
      }
    });
    console.log('Loaded .env.local');
  } catch {
    console.error('WARNING: .env.local not found, relying on process env');
  }
}
loadEnvFile();

// ---------- validate env ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_AK = process.env.R2_ACCESS_KEY_ID;
const R2_SK = process.env.R2_SECRET_ACCESS_KEY;

for (const [name, val] of [['NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL], ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_KEY], ['R2_ENDPOINT', R2_ENDPOINT], ['R2_BUCKET_NAME', R2_BUCKET], ['R2_ACCESS_KEY_ID', R2_AK], ['R2_SECRET_ACCESS_KEY', R2_SK]]) {
  if (!val) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

// ---------- R2 listing ----------
const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_AK!, secretAccessKey: R2_SK! },
});

interface R2Object { key: string; size: number }

async function listR2(): Promise<R2Object[]> {
  const out: R2Object[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 1000, ContinuationToken: token }));
    for (const o of res.Contents || []) out.push({ key: o.Key!, size: o.Size ?? 0 });
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

// ---------- magazine file naming ----------
const FILE_RE = /^magazines\/(\d{4})\/LMSY-([A-Z]+)-(\d{8})-(\d{3})\.webp$/;

interface PageFile {
  group: string;      // e.g. MAG-20251216
  type: string;       // MAG | AD | STAGE | ...
  issueDate: string;  // YYYY-MM-DD
  seq: string;        // 001, 002...
  seqNum: number;
  key: string;        // full R2 key
  url: string;        // full CDN URL
}

function parseMagazineKey(key: string): PageFile | null {
  const m = key.match(FILE_RE);
  if (!m) return null;
  const [, , type, ymd, seq] = m;
  const issueDate = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
  return {
    group: `${type}-${ymd}`,
    type,
    issueDate,
    seq,
    seqNum: parseInt(seq, 10),
    key,
    url: CDN_BASE + key,
  };
}

// ---------- main ----------
async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (will insert rows)' : 'DRY-RUN (no writes)'}`);
  console.log('Listing R2 objects...');
  const objects = await listR2();
  console.log(`R2 objects total: ${objects.length}`);

  const pages = objects.map(o => parseMagazineKey(o.key)).filter((p): p is PageFile => p !== null);
  const unknownMagKeys = objects.filter(o => o.key.startsWith('magazines/') && !parseMagazineKey(o.key)).map(o => o.key);
  console.log(`magazines/ files matching naming rule: ${pages.length}`);
  if (unknownMagKeys.length) console.log(`magazines/ files NOT matching rule (ignored): ${unknownMagKeys.length}`, unknownMagKeys.slice(0, 5));

  // group by TYPE-YYYYMMDD
  const groups = new Map<string, PageFile[]>();
  for (const p of pages) {
    if (!groups.has(p.group)) groups.set(p.group, []);
    groups.get(p.group)!.push(p);
  }
  for (const arr of groups.values()) arr.sort((a, b) => a.seqNum - b.seqNum);

  // fetch projects
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!, { db: { schema: 'lmsy_archive' } });
  const { data: projects, error: projErr } = await supabase.from('projects').select('id,title,category,cover_url,release_date');
  if (projErr) { console.error('Failed to fetch projects:', projErr.message); process.exit(1); }

  // match each group to a project via its -001 file (real cover in this dataset)
  interface IssuePlan {
    group: string;
    type: string;
    issueDate: string;
    projectId: string | null;
    projectTitle: string | null;
    coverFileUrl: string | null;
    pages: PageFile[];
    pending: boolean;
    matchError?: string;
  }
  const plans: IssuePlan[] = [];
  const usedProjectIds = new Set<string>();

  for (const [group, files] of [...groups.entries()].sort()) {
    const pending = PENDING_GROUPS.has(group);
    const cover = files.find(f => f.seq === '001') || null;
    let projectId: string | null = null;
    let projectTitle: string | null = null;
    let matchError: string | undefined;

    if (pending) {
      matchError = 'pending group, excluded by config';
    } else if (!cover) {
      matchError = 'no -001 cover file found in group';
    } else {
      // cover_url is stored in two legacy formats: full CDN URL or bare R2 key.
      // Normalize to a bare key before comparing.
      const matches = (projects || []).filter((p: { cover_url: string | null }) =>
        (p.cover_url || '').replace(CDN_BASE, '') === cover.key
      );
      if (matches.length === 1) {
        const proj = matches[0] as { id: string; title: string };
        if (usedProjectIds.has(proj.id)) {
          matchError = `project already matched by another group`;
        } else {
          projectId = proj.id;
          projectTitle = proj.title;
          usedProjectIds.add(proj.id);
        }
      } else if (matches.length === 0) {
        matchError = `no project whose cover_url equals ${cover.url}`;
      } else {
        matchError = `AMBIGUOUS: ${matches.length} projects share this cover_url`;
      }
    }

    plans.push({ group, type: files[0].type, issueDate: files[0].issueDate, projectId, projectTitle, coverFileUrl: cover?.url ?? null, pages: files, pending, matchError });
  }

  // print plan
  console.log('\n=== ISSUE PLAN ===');
  for (const plan of plans) {
    const status = plan.pending ? 'PENDING (skip)' : plan.projectId ? `-> ${plan.projectTitle}` : `!! ${plan.matchError}`;
    console.log(`${plan.group} | pages: ${plan.pages.length} | ${status}`);
  }

  const matched = plans.filter(p => p.projectId);
  const pendingList = plans.filter(p => p.pending);
  const unmatched = plans.filter(p => !p.projectId && !p.pending);
  console.log(`\ngroups matched: ${matched.length} | pending (skipped): ${pendingList.length} | unmatched (skipped): ${unmatched.length}`);
  if (unmatched.length) {
    console.log('UNMATCHED groups will NOT be inserted:');
    for (const u of unmatched) console.log('  ', u.group, '-', u.matchError);
  }

  // rows to insert
  interface InsertRow {
    image_url: string; title: string; caption: string; catalog_id: string;
    is_cover: boolean; sequence: number; event_date: string;
    project_id: string; integrity_status: string; display_role: string;
    is_featured: boolean; rotation: number; tag: string | null;
  }
  const rows: InsertRow[] = [];
  for (const plan of matched) {
    for (const f of plan.pages) {
      rows.push({
        image_url: f.url,
        title: `${plan.projectTitle} - Page ${f.seq}`,
        caption: `${plan.projectTitle} - Page ${f.seq}`,
        catalog_id: f.key.replace(/^magazines\/\d{4}\//, '').replace(/\.webp$/, ''),
        is_cover: f.seq === '001',
        sequence: f.seqNum,
        event_date: plan.issueDate,
        project_id: plan.projectId!,
        integrity_status: 'ok',
        display_role: 'regular',
        is_featured: false,
        rotation: 0,
        tag: plan.type === 'MAG' ? 'Magazine' : plan.type === 'AD' ? 'Advertising' : plan.type,
      });
    }
  }
  console.log(`\nrows to insert (before dedup check): ${rows.length}`);

  // idempotency: fetch existing image_url values
  const existing = new Set<string>();
  {
    let from = 0;
    for (;;) {
      const { data, error } = await supabase.from('gallery_assets').select('image_url').range(from, from + 999);
      if (error) { console.error('Failed to fetch existing assets:', error.message); process.exit(1); }
      for (const r of data || []) existing.add((r as { image_url: string }).image_url);
      if (!data || data.length < 1000) break;
      from += 1000;
    }
  }
  const toInsert = rows.filter(r => !existing.has(r.image_url));
  const alreadyThere = rows.length - toInsert.length;
  console.log(`already present (will skip): ${alreadyThere} | to insert: ${toInsert.length}`);

  // manifest output
  if (MANIFEST) {
    mkdirSync('temp', { recursive: true });
    writeFileSync('temp/backfill-manifest.json', JSON.stringify({ generatedAt: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run', plans, pendingGroups: [...PENDING_GROUPS], rowsToInsert: toInsert, skippedAlreadyPresent: alreadyThere }, null, 1), 'utf-8');
    const md = ['# Magazine Backfill Manifest', '', `Generated: ${new Date().toISOString()}`, `Mode: ${APPLY ? 'apply' : 'dry-run'}`, '', '| Group | Project | Pages | Cover file | Status |', '|---|---|---|---|---|', ...plans.map(p => `| ${p.group} | ${p.projectTitle || '(none)'} | ${p.pages.length} | ${p.coverFileUrl ? p.coverFileUrl.split('/').pop() : '-'} | ${p.pending ? 'PENDING skip' : p.projectId ? 'matched' : 'UNMATCHED skip'} |`)].join('\n');
    writeFileSync('temp/backfill-manifest.md', md + '\n', 'utf-8');
    console.log('Manifest written: temp/backfill-manifest.json, temp/backfill-manifest.md');
  }

  if (!APPLY) {
    console.log('\nDRY-RUM complete. Re-run with --apply to insert.');
    return;
  }

  if (toInsert.length === 0) {
    console.log('Nothing to insert.');
    return;
  }

  // insert in batches; on batch failure retry row-by-row for precise error reporting
  console.log('\nInserting...');
  let inserted = 0;
  const BATCH = 50;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from('gallery_assets').insert(batch);
    if (error) {
      console.warn(`Batch ${i}-${i + batch.length - 1} failed (${error.message}), retrying one by one...`);
      for (const row of batch) {
        const { error: rowErr } = await supabase.from('gallery_assets').insert(row);
        if (rowErr) console.error(`  STILL FAILED ${row.catalog_id}: ${rowErr.message}`);
        else inserted++;
      }
    } else {
      inserted += batch.length;
    }
    console.log(`  progress: ${Math.min(i + BATCH, toInsert.length)}/${toInsert.length}`);
  }
  console.log(`\nInserted ${inserted} rows, skipped ${alreadyThere} existing.`);

  // post-verify per project
  console.log('\n=== POST-VERIFY (rows per matched project) ===');
  for (const plan of matched) {
    const { count } = await supabase.from('gallery_assets').select('id', { count: 'exact', head: true }).eq('project_id', plan.projectId!);
    console.log(`${plan.group} | ${plan.projectTitle} | gallery_assets rows: ${count} (expected >= ${plan.pages.length})`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
