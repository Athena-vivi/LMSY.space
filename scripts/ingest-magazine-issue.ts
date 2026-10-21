/**
 * Ingest one magazine issue's images: local files -> WebP -> R2 -> gallery_assets.
 *
 * Usage:
 *   node --experimental-strip-types scripts/ingest-magazine-issue.ts <spec.json>
 *
 * Spec format:
 * {
 *   "project_id": "<uuid>",
 *   "project_title": "KAZZ 217 - Youth Choice (Sonya)",
 *   "r2_dir": "lmsy/mag/2026",
 *   "file_stem": "SY-MAG-KAZZ-217-20260701",
 *   "event_date": "2026-07-01",
 *   "tag": "Magazine",
 *   "images": [
 *     { "file": "t01.jpg", "source_post_id": "2083135932195299635", "source_url": "https://x.com/..." },
 *     ...
 *   ]
 * }
 *
 * Writes a report to stdout as JSON: keys -> R2 object key, width, height.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { convertToWebP, generateBlurData } from '../lib/image-processing.ts';
import { uploadToR2 } from '../lib/r2-client.ts';

config({ path: '.env.local' });

interface ImageSpec {
  file: string;
  caption?: string;
  source_post_id?: string;
  source_url?: string;
  source_platform?: string;
  source_account?: string;
}

interface Spec {
  project_id: string;
  project_title: string;
  r2_dir: string;
  file_stem: string;
  event_date: string;
  tag?: string;
  base_dir: string;
  images: ImageSpec[];
}

const specPath = process.argv[2];
if (!specPath) {
  console.error('usage: ingest-magazine-issue.ts <spec.json>');
  process.exit(1);
}

const spec: Spec = JSON.parse(readFileSync(specPath, 'utf-8'));
const tag = spec.tag ?? 'Magazine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const report: Record<string, { key: string; w: number; h: number; url: string; catalog_id: string }> = {};
  const seq = spec.images.length;

  for (let i = 0; i < spec.images.length; i++) {
    const img = spec.images[i];
    const n = String(i + 1).padStart(3, '0');
    const stem = `${spec.file_stem}-${n}`;
    const r2Path = `${spec.r2_dir}/${stem}.webp`;
    const localPath = resolve(spec.base_dir, img.file);

    const raw = readFileSync(localPath);
    const processed = await convertToWebP(raw, 95, true);
    const blur = await generateBlurData(raw).catch(() => null);

    const up = await uploadToR2(processed.buffer, r2Path, 'image/webp');
    if (!up.success || !up.url) throw new Error(`R2 upload failed for ${r2Path}: ${up.error ?? 'no url returned'}`);

    const caption = img.caption ?? `${spec.project_title} p.${n}`;
    const insert: Record<string, unknown> = {
      image_url: up.url,
      caption,
      title: caption,
      tag,
      is_featured: false,
      catalog_id: stem,
      is_editorial: false,
      blur_data: blur,
      project_id: spec.project_id,
      event_date: spec.event_date,
      display_role: 'regular',
      integrity_status: 'ok',
      is_cover: i === 0,
      is_portal_candidate: false,
      sequence: i + 1,
      rotation: 0,
    };
    if (img.source_post_id) insert.source_post_id = img.source_post_id;
    if (img.source_url) insert.source_url = img.source_url;
    if (img.source_platform) insert.source_platform = img.source_platform;
    if (img.source_account) insert.source_account = img.source_account;

    const { data, error } = await supabase
      .schema('lmsy_archive')
      .from('gallery_assets')
      .insert(insert)
      .select('id, catalog_id, image_url')
      .single();
    if (error) throw new Error(`DB insert failed for ${stem}: ${error.message}`);

    report[r2Path] = {
      key: r2Path,
      w: processed.width,
      h: processed.height,
      url: up.url,
      catalog_id: data.catalog_id,
    };
    console.log(`[OK] ${stem} ${processed.width}x${processed.height} ${(processed.sizeBytes / 1024).toFixed(0)}KB -> ${up.url}`);
  }

  // Point the project's cover at the first image.
  const first = report[Object.keys(report)[0]];
  const { data: upd, error: updErr } = await supabase
    .schema('lmsy_archive')
    .from('projects')
    .update({ cover_url: first.url, homepage_cover_url: first.url })
    .eq('id', spec.project_id)
    .select('id, cover_url, homepage_cover_url')
    .single();
  if (updErr) throw new Error(`project cover update failed: ${updErr.message}`);
  console.log('[COVER]', JSON.stringify(upd));

  const outPath = specPath.replace(/\.json$/, '.report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`[REPORT] ${outPath} (${seq} images)`);
}

main().catch((e) => {
  console.error('FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
