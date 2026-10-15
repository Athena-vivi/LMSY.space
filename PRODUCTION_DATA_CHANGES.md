# Production Data Change Record

Purpose: track manual/one-off changes made to production data (Supabase / R2),
separate from code commits, for audit and rollback.

All credentials are handled via local `.env.local` (never committed).

---

## 2026-10-15: Backfill historical magazine inner pages into gallery_assets

### What and why

Commit `b60e2e2` (2026-03-16) switched `/projects/[id]` from the legacy
`gallery` table to `gallery_assets` without migrating data, so historical
magazine inner pages stopped rendering on project detail pages. This change
restores the missing rows. Full investigation: `MAGAZINE_INVESTIGATION_2026-10-15.md`.

### Change

- Target: `lmsy_archive.gallery_assets`
- Rows inserted: **312** (via `scripts/backfill-magazine-pages.ts --apply`)
- Rows updated/deleted: **0**
- R2 objects touched: **0** (read-only listing only)

Row shape inserted per file `magazines/{year}/LMSY-{TYPE}-{YYYYMMDD}-{NNN}.webp`:

- `image_url`: full CDN URL (`https://cdn.lmsy.space/...`)
- `catalog_id`: filename stem, e.g. `LMSY-MAG-20250117-014`
- `title` / `caption`: `{project title} - Page {NNN}`
- `project_id`: matched 1:1 via `-001` file == project `cover_url`
  (cover_url normalized: stored in two legacy formats, full URL or bare R2 key)
- `is_cover`: true for the `-001` file, false otherwise
- `sequence`: page number as integer
- `event_date`: issue date parsed from filename
- `tag`: MAG=Magazine, AD=Advertising, otherwise the TYPE value
- `integrity_status`: `ok`, `display_role`: `regular`, `is_featured`: false, `rotation`: 0

### Excluded on purpose (no rows created)

- `AD-20251216` (12 files) and `TRV-20251216` (8 files): no matching project,
  left untouched pending owner decision. Files remain in R2.

### Rollback

1. Local backups (gitignored, in `backups/`):
   - `gallery_assets_backup_2026-10-15T15-25-33.json` (18 rows, pre-change)
   - `projects_backup_2026-10-15T15-25-33.json` (25 rows)
2. Precise SQL rollback: delete rows where `catalog_id LIKE 'LMSY-%' AND project_id IN (17 matched projects) AND created_at >= '2026-10-15'`,
   or re-run the script after clearing (script is insert-only and idempotent by `image_url`).

### Verification (all passed)

- Script re-run (dry-run): `to insert: 0` — idempotency confirmed.
- Row counts per project == expected page count for all 17 matched issues.
- Local dev render check (`npm run dev`, all 17 project pages):
  every page shows expected number of magazine images, cover present,
  cover sorted first, sequence order verified end-to-end
  (GAZE: 001 → 037 in exact order).
- CDN spot checks: backfilled page URLs return HTTP 200.

### Side note (data inconsistency, not changed)

`projects.cover_url` is stored in two formats: full CDN URL (12 rows) and
bare R2 key (5 rows, incl. `Affair`, `20241104-Stars Twinking`,
`20241125-UNIQUE`, `20241217`, `20241218`, `Retro Soul`). The detail page
cover-rotation lookup compares `image_url === project.cover_url` and will
miss bare-key covers (falls back to `is_cover`, which is now set). Unifying
this format is a candidate future cleanup — intentionally not done here.
