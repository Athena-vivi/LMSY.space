// One-off schema probe: list lmsy_archive tables and key columns (English comments only)
const fs = require('fs');
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
);
const token = env.SUPABASE_ACCESS_TOKEN;
const REF = 'obylptsyyqydbbawkvxd';

async function q(sql) {
  const r = await fetch('https://api.supabase.com/v1/projects/' + REF + '/database/query', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return r.json();
}

(async () => {
  const tables = await q("SELECT table_name FROM information_schema.tables WHERE table_schema='lmsy_archive' ORDER BY table_name");
  console.log('TABLES:', tables.map(t => t.table_name).join(', '));
  for (const t of ['gallery', 'gallery_assets', 'draft_items', 'projects']) {
    const cols = await q("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_schema='lmsy_archive' AND table_name='" + t + "' ORDER BY ordinal_position");
    if (Array.isArray(cols)) {
      console.log('--- ' + t + ' ---');
      console.log(cols.map(c => c.column_name + ':' + c.data_type).join(', '));
    } else {
      console.log('--- ' + t + ' ---', JSON.stringify(cols).slice(0, 120));
    }
  }
  const counts = await q("SELECT 'gallery' t, count(*) n FROM lmsy_archive.gallery UNION ALL SELECT 'gallery_assets', count(*) FROM lmsy_archive.gallery_assets UNION ALL SELECT 'draft_items', count(*) FROM lmsy_archive.draft_items UNION ALL SELECT 'projects', count(*) FROM lmsy_archive.projects");
  console.log('COUNTS:', JSON.stringify(counts));
})();
