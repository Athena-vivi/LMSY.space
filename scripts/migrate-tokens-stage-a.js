// Stage A: site-wide semantic token migration.
// Rules verified in stage-1 samples (reports/samples/*):
//   text-white/N, text-foreground/N :  N < 85 -> text-ink-2 ; N >= 85 -> text-ink
//   text-muted-foreground[/N]       :  -> text-ink-2 (secondary info color)
// Prefix variants (hover:, focus:, md: ...) keep their prefix.
// Excluded on purpose (category rules, not mechanical):
//   - disabled:* variants (disabled text SHOULD stay dim)
//   - placeholder:* (handled separately below: floor raised to ink-3)
//   - border-*, bg-*, from-*, via-*, to-*, shadow-* (not text)
//   - text-lmsy-yellow / lmsy-blue / green / red / yellow / blue (brand & status)
// Idempotent: skips files already migrated.

const fs = require('fs');
const path = require('path');

const roots = ['app', 'components'];
const exts = new Set(['.tsx', '.ts']);
const SKIP = [
  'app/admin/drafts/page-old.tsx', // dead code, scheduled for removal
  'scripts',
  'node_modules',
];

let filesChanged = 0, totalRepl = 0;
const log = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.some((s) => p.replace(/\\/g, '/').includes(s))) continue;
    if (e.isDirectory()) { walk(p); continue; }
    if (!exts.has(path.extname(e.name))) continue;
    const src = fs.readFileSync(p, 'utf8');
    let count = 0;

    // main mapping; keeps variant prefix (hover:, md:, ...)
    let out = src.replace(
      /((?:[a-zA-Z-]+:)*)text-(white|foreground|muted-foreground)\/(\d{1,3})\b/g,
      (m, prefix, base, num) => {
        const n = parseInt(num, 10);
        if (prefix === 'disabled:') return m; // keep dedicated dim rule
        count++;
        const token = n >= 85 ? 'text-ink' : 'text-ink-2';
        return prefix + token;
      }
    );

    // bare text-muted-foreground -> text-ink-2 (it IS the secondary role)
    out = out.replace(/((?:[a-zA-Z-]+:)*)text-muted-foreground\b/g, (m, prefix) => {
      if (prefix === 'disabled:') return m;
      count++;
      return prefix + 'text-ink-2';
    });

    // placeholder floor: placeholder:text-white/N (N<60) -> placeholder:text-ink-3
    out = out.replace(/placeholder:text-white\/(\d{1,3})\b/g, (m, num) => {
      const n = parseInt(num, 10);
      if (n >= 60) return m;
      count++;
      return 'placeholder:text-ink-3';
    });

    if (count > 0) {
      fs.writeFileSync(p, out);
      filesChanged++; totalRepl += count;
      log.push(`${p}: ${count}`);
    }
  }
}

roots.forEach((r) => walk(r));
console.log(`files changed: ${filesChanged}, replacements: ${totalRepl}`);
console.log(log.slice(0, 40).join('\n'));
