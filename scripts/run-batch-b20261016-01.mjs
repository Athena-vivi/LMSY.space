/**
 * Batch b20261016-01 ingest runner.
 *
 * Flow (approved by the site owner, 2026-10-16):
 *   1. Find or create the candidate project (curation_status='draft',
 *      portal_visible=false - mirrors the create-project API semantics).
 *   2. POST each official photo to the production /api/ingest with
 *      project_id + batch_id + source_account.
 *   3. Point project.cover_url at the first stored draft's R2 url.
 *   4. Write reports/batch-b20261016-01/report.json.
 *
 * All comments in this file are pure ASCII per the project convention.
 * Idempotent: ingest dedupes by file_hash; project lookup by exact title.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const INGEST_KEY = env.INGEST_API_KEY;
const SITE = 'https://lmsy.space';

const manifest = JSON.parse(readFileSync('reports/batch-b20261016-01/manifest.json', 'utf8'));
const BATCH_ID = manifest.batch_id;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(90000) });
      return res;
    } catch (err) {
      lastErr = err;
      console.log(`  network retry ${i}/${attempts}: ${err.message}`);
      await sleep(2000 * i);
    }
  }
  throw lastErr;
}

const restHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  // All content tables live in the lmsy_archive schema, not public.
  'Accept-Profile': 'lmsy_archive',
  'Content-Profile': 'lmsy_archive',
};

async function findOrCreateProject() {
  const title = manifest.project.title;
  const q = `${SUPABASE_URL}/rest/v1/projects?select=id,title,curation_status&title=${encodeURIComponent(title)}`;
  const res = await fetchWithRetry(q, { headers: restHeaders });
  const rows = await res.json();
  if (Array.isArray(rows) && rows.length > 0) {
    console.log('Project exists:', rows[0].id, rows[0].title, rows[0].curation_status);
    return rows[0].id;
  }

  const body = {
    title,
    title_i18n: manifest.project.title_i18n,
    category: manifest.project.category,
    description:
      'LOOKMHEE SONYA "EVERAFTER: BLOOM" fan meeting. 2026-10-09 20:00 (GMT-3), BTG Pactual Hall, Sao Paulo, Brazil. ' +
      'Organizer: CHANGE2561. Date/venue evidenced by official X posts 2107851146174058763 / 2107089025052115384 ' +
      '(@CHANGEARTIST_) and the official promo post of 2026-07-27.',
    description_i18n: {
      en: 'LOOKMHEE SONYA "EVERAFTER: BLOOM" fan meeting - 2026-10-09 20:00 (GMT-3), BTG Pactual Hall, Sao Paulo, Brazil. Organized by CHANGE2561.',
      zh: 'LOOKMHEE SONYA "EVERAFTER: BLOOM" 圣保罗粉丝见面会 —— 2026-10-09 20:00（GMT-3），巴西圣保罗 BTG Pactual Hall。主办方 CHANGE2561。',
      th: 'LOOKMHEE SONYA "EVERAFTER: BLOOM" fan meeting - 2026-10-09 20:00 (GMT-3), BTG Pactual Hall, Sao Paulo, Brazil.',
    },
    start_date: manifest.project.start_date,
    end_date: manifest.project.end_date,
    release_date: manifest.project.release_date,
    curation_status: 'draft',
    portal_visible: false,
    portal_priority: 0,
  };

  const insertRes = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/projects`, {
    method: 'POST',
    headers: { ...restHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  const created = await insertRes.json();
  if (!Array.isArray(created) || !created[0]?.id) {
    throw new Error('Project insert failed: ' + JSON.stringify(created).slice(0, 300));
  }
  console.log('Project created:', created[0].id);
  return created[0].id;
}

async function ingestItem(item, projectId) {
  const postUrl = `https://x.com/CHANGEARTIST_/status/${item.post}`;
  const payload = {
    source_url: postUrl,
    source_platform: 'twitter',
    source_account: 'CHANGEARTIST_',
    source_post_id: item.post,
    media_url: item.media,
    title: {
      en: 'LOOKMHEE SONYA EVERAFTER BLOOM IN SAO PAULO - official photo',
      zh: 'LOOKMHEE SONYA 圣保罗 "EVERAFTER: BLOOM" 官方照片',
      th: 'LOOKMHEE SONYA EVERAFTER BLOOM IN SAO PAULO - official photo',
    },
    original_text: 'LOOKMHEE SONYA EVERAFTER BLOOM IN SAO PAULO @Lookmheewang @sonyasarann #LMSYbloominsaopaulo #LMSY #ChangeArtist',
    event_date: '2026-10-09',
    raw_event_date: item.posted_utc,
    tags: ['Official', 'Organizer', 'Event-photography', 'Unknown'],
    project_id: projectId,
    batch_id: BATCH_ID,
  };

  const res = await fetchWithRetry(`${SITE}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-ingest-key': INGEST_KEY },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  return { http: res.status, body: json };
}

async function main() {
  const report = { batch_id: BATCH_ID, started_at: new Date().toISOString(), items: [] };

  const projectId = await findOrCreateProject();
  report.project_id = projectId;

  let firstDraftUrl = null;
  for (const item of manifest.items) {
    process.stdout.write(`Ingest ${item.file} ... `);
    let out;
    try {
      out = await ingestItem(item, projectId);
      const stage = out.body?.ingestion_stage || out.body?.error || 'unknown';
      console.log(`HTTP ${out.http} stage=${stage} draft=${out.body?.draft_item_id || '-'}`);
      report.items.push({ file: item.file, http: out.http, draft_item_id: out.body?.draft_item_id || null, stage, duplicate: !!out.body?.is_duplicate });
      if (out.body?.draft_item_id && !firstDraftUrl) {
        // Read the stored draft's r2 url for the project cover
        const q = `${SUPABASE_URL}/rest/v1/draft_items?select=r2_media_url&id=eq.${out.body.draft_item_id}`;
        const r = await fetchWithRetry(q, { headers: restHeaders });
        const rows = await r.json();
        if (rows?.[0]?.r2_media_url) firstDraftUrl = rows[0].r2_media_url;
      }
    } catch (err) {
      console.log('FAILED:', err.message);
      report.items.push({ file: item.file, error: err.message });
    }
    await sleep(1500);
  }

  if (firstDraftUrl) {
    const patch = await fetchWithRetry(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}`,
      {
        method: 'PATCH',
        headers: { ...restHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ cover_url: firstDraftUrl }),
      }
    );
    console.log('Cover set:', patch.status);
    report.cover_set = patch.status === 204 || patch.status === 200;
  }

  report.finished_at = new Date().toISOString();
  const ok = report.items.filter((i) => i.draft_item_id && !i.duplicate).length;
  const dup = report.items.filter((i) => i.duplicate).length;
  const failed = report.items.filter((i) => i.error).length;
  report.summary = { created: ok, duplicate: dup, failed, total: report.items.length };
  writeFileSync('reports/batch-b20261016-01/report.json', JSON.stringify(report, null, 2));
  console.log('SUMMARY:', JSON.stringify(report.summary));
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
