# Backup and Restore

Phase 1 established the first working backup capability for this project, plus a
restore drill that actually re-loads the data. This document states what is
covered, what is not, and how to recover from the realistic failure modes.

## The three separate problems

| Asset | Where it lives | Covered by | NOT covered by |
|---|---|---|---|
| Code | GitHub (`Athena-vivi/LMSY.space`) | git history | — |
| Database rows | Supabase Postgres, schema `lmsy_archive` | `npm run backup:db` (logical export) + Supabase platform backups | GitHub |
| Image/video objects | Cloudflare R2 bucket `lmsy-archive` | `npm run backup:r2` (full local mirror) + `npm run backup:r2:offsite` (second R2 bucket) | GitHub, `backup:db` |

A code backup is not a data backup, and a database backup is not an image
backup. 300+ historical magazine images still exist only in R2, so a
database-only backup would not preserve them.

As of phase 2 the objects also live in a **second R2 bucket**,
`lmsy-archive-backup`, kept in sync server-side. That is a genuine second
copy, but see the limitation note under "Off-site copy" — it is still inside
the same Cloudflare account.

## Commands

```bash
npm run backup:db            # logical export of every table in lmsy_archive
npm run backup:r2            # mirror every R2 object to local disk
npm run backup:r2:offsite    # copy every object to the second R2 bucket (server-side)
npm run restore:drill        # re-load the newest snapshots into an isolated DB + verify
node scripts/audit-r2-references.mjs   # read-only R2 <-> database reconciliation
```

Snapshots are written under `backups/` which is **gitignored** (data must never
be committed). Each snapshot directory contains a `manifest.json` with per-file
row counts, byte sizes and sha256 hashes.

- Database: `backups/db/<timestamp>/` — `manifest.json`, `schema.json` (live
  column types), `<table>.json` per table.
- R2: `backups/r2/<timestamp>/` — `manifest.json`, `objects/<key>`.
- R2 offsite: `backups/r2-offsite/offsite-report.json` — a single rolling report
  (source/target object counts, copied/skipped, failures, missing, size
  mismatches). The objects themselves live in the second bucket, not on disk.
- Drill: `backups/restore-drill/<timestamp>/` — `restore.db`,
  `restore-report.json`.

Every script exits non-zero and prints the failing items when something goes
wrong. A backup that fails part-way is reported as failed, never as successful.

## What the restore drill actually proves

`npm run restore:drill` re-loads the newest database snapshot into a throwaway
**SQLite** file and then verifies:

1. every table re-loads with the same row count as its manifest;
2. `gallery_assets.project_id` values all resolve to a project;
3. no duplicate `catalog_id` / `file_hash` (the values the new unique indexes rely on);
4. the published assets stored under the `draft/` prefix are still present;
5. images referenced by the database exist in the R2 mirror with a matching sha256.

**Limitation, stated plainly:** the isolated target is SQLite, not Postgres. The
drill proves the export is complete, readable, re-loadable and internally
consistent — it does not prove that Supabase's own Postgres backup can be
restored. That requires either a paid-plan PITR restore or a second Supabase
project. See "Still required" below.

## The off-site R2 copy

`npm run backup:r2:offsite` reconciles the live bucket `lmsy-archive` into a
second bucket `lmsy-archive-backup` using server-side `CopyObject` (no download,
no egress cost). It is idempotent: objects already present with the same size
are skipped. It lists both buckets and fails non-zero if any object is missing
from the target or has a mismatched size.

Verified run (2026-10-15): `sourceObjects: 408`, `targetObjects: 408`,
`copied: 31`, `skippedExisting: 377`, `failures: []`, `missing: []`,
`sizeMismatch: []`, `ok: true`.

**Limitation, stated plainly:** the second bucket is in the **same Cloudflare
account** as the source. It protects against an accidental object delete, a
botched bulk operation, or a bug in the app's own delete path — but it does
**not** protect against losing the whole account (billing lapse, account
compromise, provider incident). A true third copy on a different provider (or
on storage outside Cloudflare) is still the owner's call. The local mirror
(`npm run backup:r2`) on a separate machine remains a useful complement.

## Recovery playbooks

### A. A row (or a table) was deleted in production

1. Find the newest snapshot that still contains it:
   `backups/db/<timestamp>/<table>.json`.
2. Locate the rows by id and reconstruct the INSERT statements.
3. Apply them with the SQL editor (or a script using the service-role key).
4. Re-run `node scripts/audit-r2-references.mjs` to confirm the image references
   are intact again.

Typical recovery time: minutes for a few rows.

### B. An image object was deleted from R2

1. Find the object in the newest mirror: `backups/r2/<timestamp>/objects/<key>`
   (verify against the sha256 in that snapshot's `manifest.json`).
2. Re-upload it to the same key.
3. Run `node scripts/audit-r2-references.mjs`; the object should move from
   "missing" (if it was referenced) back to "referenced".

### C. The whole database is lost

1. Restore the Supabase platform backup / PITR if it is enabled (Dashboard →
   Database → Backups). Nothing in this repository can do that step.
2. If no platform backup exists, rebuild from `backups/db/<timestamp>/`:
   `schema.json` gives the column types, each `<table>.json` gives the rows.
   Re-apply `supabase/migrations/*.sql` first so constraints and indexes exist,
   then load the rows, then re-run `node scripts/audit-r2-references.mjs`.
3. Expect this path to be slow and to need manual review of foreign keys.

### D. The whole bucket is lost

1. Restore from the newest full mirror: `backups/r2/<timestamp>/objects/`
   (re-upload with the same keys). This restores exactly the objects that
   existed when that snapshot was taken.
2. If the objects still exist in the second bucket, prefer a server-side copy
   from `lmsy-archive-backup` back into `lmsy-archive` (re-run
   `npm run backup:r2:offsite` with the source/target reversed).
3. Any object created after the most recent snapshot / offsite run is gone.
   Enable R2 object versioning to shorten that window — see below.

## Still required (needs dashboard access — owner's action)

These cannot be done from the repository and must be completed by the owner:

1. **Supabase plan / backup check.** Dashboard → Project Settings → Database →
   Backups. Free plans get no point-in-time recovery and limited retention.
   Record on this line what is enabled:
   `PITR: ___ | daily backups: ___ | retention: ___ | last restore test: ___`
2. **Enable R2 object versioning** (Cloudflare dashboard → R2 → bucket →
   Settings). **Status: NOT enabled** on `lmsy-archive` (checked 2026-10-15).
   The second bucket `lmsy-archive-backup` now covers most of the risk of a
   mistaken delete, but versioning would still add point-in-time recovery of
   overwritten objects. Note the second bucket is in the same Cloudflare
   account, so it is not a full disaster-recovery boundary.
3. **Schedule the backups.** Run them from a machine that stays on (or a CI
   job), and keep at least one copy off this laptop. Suggested cadence:
   database daily, R2 weekly (or after any bulk import), offsite R2 copy after
   any bulk import.
4. **Off-site copy.** Done in phase 2 for R2 (second bucket
   `lmsy-archive-backup`, see above) — but it shares the Cloudflare account with
   the source. Getting the *database* snapshot off this laptop, and ideally a
   third R2 copy on a different provider, is still the owner's work.

## Notes for future cleanup work

- `unreferenced` in `reports/r2-reference-audit.json` means "no database field
  points at this object". It is **not** a delete list. Historical magazine
  images have been in that category before and turned out to be indispensable.
- Published assets currently live under the `draft/` prefix. Any future draft
  cleanup must consult the audit report first: it lists exactly which objects
  are referenced by published records.
- No tooling in this repository deletes R2 objects automatically. The only
  delete path is `lib/r2-client.deleteFromR2`, called explicitly by upload
  compensation and the rename script.
