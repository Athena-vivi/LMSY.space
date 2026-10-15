/**
 * Build lib/generated/image-dimensions.json from the local R2 mirror.
 *
 * WHY: gallery components used <Image width={0} height={0} unoptimized>, so the
 * browser had no intrinsic size before load (layout shift) and downloaded the
 * full-size original (some are several MB).
 *
 * Reading the real dimensions once, offline, lets components pass proper
 * width/height — natural aspect ratio preserved, no shift — AND enables
 * Next.js image optimization, which needs intrinsic dimensions.
 *
 * The output is keyed by R2 object key, e.g.
 *   "magazines/2025/LMSY-MAG-20250117-014.webp": { "w": 1200, "h": 1800 }
 *
 * USAGE
 *   npm run backup:r2               # ensure a local mirror exists first
 *   npm run images:dims             # regenerate lib/generated/image-dimensions.json
 *   npm run images:dims -- <dir>    # or point at a different objects/ directory
 *
 * Re-run this after adding new assets. Unknown images fall back to a neutral
 * 2:3 box in lib/image-dimensions.ts.
 */

import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, relative, sep, resolve } from 'path';
import sharp from 'sharp';

const IMAGE_RE = /\.(webp|jpe?g|png|avif|gif)$/i;

function latestMirrorObjects() {
  const root = 'backups/r2';
  if (!existsSync(root)) return null;
  const dirs = readdirSync(root)
    .filter((d) => statSync(join(root, d)).isDirectory())
    .sort();
  if (dirs.length === 0) return null;
  return join(root, dirs[dirs.length - 1], 'objects');
}

const argDir = process.argv[2];
const objectsDir = resolve(argDir || latestMirrorObjects() || '');
if (!objectsDir || !existsSync(objectsDir)) {
  console.error(
    'No objects directory found. Run `npm run backup:r2` first, or pass a path:\n' +
      '  node scripts/extract-image-dimensions.mjs <objects-dir>'
  );
  process.exit(1);
}

console.log('Scanning', objectsDir);

const out = {};
const ratios = [];
let failed = 0;

async function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(p);
      continue;
    }
    const key = relative(objectsDir, p).split(sep).join('/');
    if (!IMAGE_RE.test(key)) continue;
    try {
      const md = await sharp(p).metadata();
      if (md.width && md.height) {
        out[key] = { w: md.width, h: md.height };
        ratios.push(md.width / md.height);
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
}

await walk(objectsDir);

ratios.sort((a, b) => a - b);
const median = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0;

if (!existsSync('lib/generated')) mkdirSync('lib/generated', { recursive: true });
const target = join('lib', 'generated', 'image-dimensions.json');
writeFileSync(target, JSON.stringify(out, null, 0));

console.log(`dimensions: ${Object.keys(out).length} ok, ${failed} failed`);
console.log(`aspect (w/h) median: ${median.toFixed(3)}`);
console.log('wrote ' + target);
if (failed > 0) process.exitCode = 1;
