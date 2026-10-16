// Stage-1 samples ONLY: apply semantic text tokens to the 5 representative
// pages (allowlisted files). No global replacement in this stage.
// Mapping: text-white/N, text-foreground/N -> N<=79: text-ink-2, N>=80: text-ink
//          text-muted-foreground(/N)? -> text-ink-2
const fs = require("fs");

const FILES = [
  "app/page.tsx",
  "components/home-header.tsx",
  "components/site-footer.tsx",
  "components/sections/hero-section.tsx",
  "components/sections/portals-section.tsx",
  "components/sections/longform-section.tsx",
  "components/sections/chronicle-section.tsx",
  "components/museum-preface.tsx",
  "app/gallery/page.tsx",
  "app/gallery/lightbox.tsx",
  "app/projects/[id]/project-detail-client.tsx",
  "app/admin/page.tsx",
  "app/admin/drafts/page.tsx",
  "app/admin/drafts/components/drafts-header.tsx",
  "app/admin/drafts/components/drafts-filter-bar.tsx",
  "app/admin/drafts/components/drafts-actions-bar.tsx",
  "app/admin/drafts/components/drafts-content-states.tsx",
  "app/admin/drafts/components/draft-card.tsx",
  "app/admin/drafts/components/ui/toast.tsx",
];

const re = /\b((?:hover:|focus:|group-hover:)?)text-(white|foreground|muted-foreground)(?:\/(\d{1,2}))?\b/g;

for (const rel of FILES) {
  const path = require("path").join(__dirname, "..", rel);
  if (!fs.existsSync(path)) { console.log("SKIP (missing):", rel); continue; }
  const src = fs.readFileSync(path, "utf8");
  let counts = { ink2: 0, ink: 0 };
  const out = src.replace(re, (m, prefix, base, num) => {
    const n = num === undefined ? 100 : parseInt(num, 10);
    if (base === "muted-foreground") { counts.ink2++; return `${prefix}text-ink-2`; }
    if (n >= 80) { counts.ink++; return `${prefix}text-ink`; }
    counts.ink2++;
    return `${prefix}text-ink-2`;
  });
  if (out !== src) {
    fs.writeFileSync(path, out, "utf8");
    console.log(`${rel}: ink-2 x${counts.ink2}, ink x${counts.ink}`);
  } else {
    console.log(`${rel}: no change`);
  }
}
