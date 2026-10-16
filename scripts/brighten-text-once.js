// One-off pass 2: bump remaining /40-/69 to /70 (pass 1 already did <60).
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIRS = ["app", "components", "hooks", "lib"];
const exts = new Set([".tsx", ".ts"]);
let changed = 0, files = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full.includes("node_modules")) continue;
      walk(full);
    } else if (exts.has(path.extname(entry.name))) {
      // skip admin dir (already brightened)
      const norm = full.replace(/\\/g, "/");
      if (norm.includes("/app/admin/")) continue;
      let src = fs.readFileSync(full, "utf8");
      const re = /(text-(?:white|foreground|muted-foreground)\/)([1-5]?\d)(?![\d\w])/g;
      const out = src.replace(re, (m, pre, num) => {
        const n = parseInt(num, 10);
        if (n >= 60) return m;
        files++;
        return pre + (n <= 35 ? "70" : "80");
      });
      if (out !== src) {
        fs.writeFileSync(full, out, "utf8");
        changed++;
        console.log("modified:", norm.replace(ROOT.replace(/\\/g, "/") + "/", ""));
      }
    }
  }
}
for (const d of DIRS) walk(path.join(ROOT, d));
console.log(`done. files changed: ${changed}`);
