# Production Configuration Change Record

Companion to `PRODUCTION_DATA_CHANGES.md`. That file tracks changes to
**production data** (rows / objects). This file tracks changes that must be
made to **production configuration** (environment variables, dashboard
settings, database migrations) in order for the phase-1 code to behave
correctly in production.

Code alone does not complete phase 1. The items below are OUTSIDE the git
repository and must be applied by hand in the Vercel / Supabase / Cloudflare
dashboards. Nothing here is applied automatically by a deploy.

No secret values appear in this file. Every entry names the variable or
setting only.

---

## 1. Environment variables (Vercel -> Project Settings -> Environment Variables)

The phase-1 code reads the following. Some already exist; the ones marked
NEW must be added before the deploy is considered functional.

| Variable | Status | Required for | Failure mode if missing |
|---|---|---|---|
| `ADMIN_EMAIL` | NEW | every admin API guard + `/api/auth/session` | admin APIs return 503 (fail closed); site is safe but admin is unusable |
| `TELEGRAM_WEBHOOK_SECRET` | NEW | `/api/webhooks/telegram` source verification | webhook rejects every request with 401/503; no ingestion |
| `CRON_SECRET` | NEW (may exist unset) | `/api/cron/fetch-updates` | cron endpoint rejects the call (previously bypassed via `Bearer undefined`) |
| `INGEST_API_KEY` | CONFIRM | `/api/ingest` | ingest endpoint rejects every request |
| `NEXT_PUBLIC_ADMIN_EMAIL` | LEGACY | fallback for `ADMIN_EMAIL` | remove after `ADMIN_EMAIL` is set in all environments |
| `NEXT_PUBLIC_SUPABASE_URL` | existing | — | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | existing | — | — |
| `SUPABASE_SERVICE_ROLE_KEY` | existing | server-side DB access | — |
| `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` | existing | uploads, backups, reconciliation | — |
| `R2_PUBLIC_URL` / `NEXT_PUBLIC_CDN_URL` | existing | CDN base | defaults to `https://cdn.lmsy.space` |
| `TELEGRAM_BOT_TOKEN` | existing | Telegram bot | — |
| `NEXT_PUBLIC_SITE_URL` | existing | canonical URLs | — |
| `OPENROUTER_API_KEY` | optional | AI translation | drafts stay untranslated |

Notes:

- Generate `TELEGRAM_WEBHOOK_SECRET` and `CRON_SECRET` with:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `ADMIN_EMAIL` is now read server-side only. The browser no longer needs any
  admin email value; `NEXT_PUBLIC_ADMIN_EMAIL` exists only so an existing
  deployment keeps working during the transition.
- Set the same values in every Vercel environment (Production and Preview) so
  preview builds behave identically.

## 2. Telegram webhook re-registration

After setting `TELEGRAM_WEBHOOK_SECRET`, re-register the webhook so Telegram
starts sending the secret header:

```
node scripts/setup-telegram-webhook.ts <public-base-url>
```

Until this is done, the live webhook will fail the new secret check and
Telegram ingestion stops. This is fail-closed by design, not a regression.

## 3. Database migrations (Supabase -> SQL editor)

Three migrations were authored in phase 1 and are **not yet applied** to the
production project. Apply in this order:

1. `supabase/migrations/20261015_phase1_baseline_gallery_assets.sql`
   Creates `gallery_assets` if absent and aligns it to the current 30-column
   shape (baseline for schema drift).
2. `supabase/migrations/20261015_phase1_data_integrity.sql`
   - widens the `source_platform` CHECK constraint to the union of values in
     use (adds `telegram`)
   - adds guarded partial unique indexes on `gallery_assets.catalog_id`
     (312 values checked, 0 duplicates) and `draft_items.file_hash`
     (0 duplicates)
   These back the catalog-id concurrency fix, so the code retry loop is only
   effective once this migration is applied.
3. `supabase/migrations/20261015_phase1_rls_hardening.sql`
   Revokes write privileges from `anon`/`authenticated`, enables RLS, keeps
   anon SELECT only on the public read tables, and denies SELECT on
   `draft_items` / `admin_users`.

Before applying #3, confirm no server code path relies on anon writes (phase-1
code uses the service-role key for all writes).

## 4. Platform backups (Supabase / Cloudflare)

- Confirm the Supabase project's automated backup / PITR setting is ON. Phase 1
  added an application-level logical backup, not a replacement for the
  platform backup.
- The R2 mirror in `backups/` is a single local copy. An off-site / object-lock
  copy is still pending (see report section H).

## 5. Verification still to run in production (after deploy)

- `node scripts/security-smoke-test.mjs --base https://lmsy.space` -> expect all
  checks green.
- Confirm the admin UI can log in and that `/api/auth/session` returns
  `isAdmin: true` for the admin identity.
- Confirm a Telegram message still produces a draft after re-registration.
