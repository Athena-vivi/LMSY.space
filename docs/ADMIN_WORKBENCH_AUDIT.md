# Admin Workbench Audit (2026-10-16)

Scope: phase-1 audit for the project-centric admin refactor. Verified against real code, not memory.

## 1. Schema facts (probed live, lmsy_archive)

| Table | Rows | Relevant columns | Verdict |
|---|---|---|---|
| `gallery` | 0 | legacy (no sequence) | Dead table. **No new code may write here.** |
| `gallery_assets` | 330 | `project_id, sequence, is_cover, source_url/platform/account, rotation, display_role` | Canonical published-image store. All fields needed already exist. |
| `draft_items` | 83 | `project_id, batch_id, sequence_order, status, file_hash, source_*` | Draft store. All fields needed already exist. |
| `projects` | 26 | `curation_status, cover_url, category, release_date, portal_visible, start/end_date` | Complete. |

**No migration required.** Every feature in the plan maps onto existing columns.

## 2. What already exists (reuse, do not rewrite)

### Project list — `/admin/projects`
- Search, category filter, status filter (published/draft/archived/available).
- Cover thumbnail, edit modal (`EditProjectModal`: title i18n, category, date, description i18n, tags, portal_visible/priority, curation_status), delete, merge, split, per-asset rotate.
- Entry to per-project curate page.

### Project curate workspace — `/admin/projects/[id]/curate`
- dnd-kit drag reorder, persisted to `gallery_assets.sequence` via `POST /api/admin/gallery/batch-update` (survives refresh).
- Set cover via `PATCH /api/admin/projects/[id]/cover` (clears other covers in project, sets `is_cover`, updates `projects.cover_url`) — rules already correct.
- Rotate, delete, VIEW_LIVE link.
- Missing: drafts section, multi-select, batch actions, source display, project-info editing.

### Draft inbox — `/admin/drafts`
- Search + status/media-type filters, `batch_id` + `project_id` filters (added in batch 2).
- Multi-select, `TO_GALLERY_ALL` batch promote (loops per-item to-gallery, skips no-project drafts), batch publish, batch-edit modal, single link-project, create-project, milestone link, delete.

### Upload — `/admin/upload`
- Multi-file drag-drop, event date, project picker, member, tags, batch catalog id, magazine issue, project creation during upload, ingestion monitor with per-file progress + retry. Dedup lives in the ingest pipeline (file_hash).

### Asset Vault — `/admin/gallery`
- Tabs (all/chronicle/editorial/milestones), search + tag filters, `projectId` deep link.
- All-assets view: **multi-select, batch delete, batch transfer-to-project modal**.

### APIs
`/api/admin/gallery` (GET/POST/PATCH/DELETE), `gallery/batch-update` (sequence), `gallery/transfer` (batch project assign), `gallery/milestone`, `projects` CRUD + `[id]` GET/PATCH/DELETE, `projects/[id]/cover|merge|split`, `drafts` GET/POST + `[id]/*` (publish, to-gallery, link-project, create-project, milestone), `drafts/batch-publish`, `drafts/stats`, `vault`, `stats`, `upload`, `r2/sign`.

## 3. Bugs found during audit

1. **`POST /api/admin/gallery/transfer` writes to `gallery` (0 rows), not `gallery_assets`.** Batch transfer from the vault silently does nothing. Fix: point at `gallery_assets` (keep -000 cover logic, add `is_cover` check).

## 4. Gaps vs. the directive (batch 1 scope)

| Directive item | Status | Action |
|---|---|---|
| Admin home shows project-first list | Missing (stats + quick links) | Rework `/admin` into Project Workbench: cards with cover/name/category/date/total/pending/published/status + entry button; search + status filter |
| Pending-images entry | Exists (Draft Inbox nav) | Link it from workbench with count |
| Batch records entry | Missing | New `/admin/batches` (aggregate draft_items by batch_id: ok/dup/failed + statuses) + nav item |
| Project list counts (total/pending/published) | Missing | Add counts to workbench cards |
| Curate shows drafts + published with status distinction | Missing | Add "Pending drafts" section to curate page |
| Multi-select in project workspace | Missing (exists in vault only) | Add select + batch bar |
| Batch assign drafts -> current project | Single-item only | New `POST /api/admin/drafts/batch-link` |
| Batch promote within project | Exists in drafts (TO_GALLERY_ALL) | Reuse per-item endpoint from curate page |
| Source link/platform/account display | Lightbox only | Show on curate draft cards |
| Project info edit in workspace | Modal exists on list page | Reuse `EditProjectModal` in curate page |
| Drag order persistence | Exists | None (verify only) |
| Cover rules | Exist + correct | None |

## 5. Rejected ideas (to avoid duplication)

- No new project/gallery/batch tables, no new state fields.
- No second upload pipeline: new-project-with-drop composes the existing upload page pieces (phase 2 batches, not batch 1).
- Magazine special handling stays inside vault editorial tab; generic curation covers all categories through the same projects table.
