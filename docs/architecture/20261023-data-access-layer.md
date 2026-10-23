# 数据访问层（lib/data/）设计稿

- **项目**：LMSY.space（`C:/Users/15755/WorkBuddy/lmsy.space`）
- **来源**：架构评审 P1-3（`reports/ARCHITECTURE_REVIEW_2026-10-23.md`）——"无数据访问层"是多处问题的总根因。
- **日期**：2026-10-23
- **状态**：**v2（2026-10-23 修订）**——§5 gallery 契约按真实调用方重新裁定；原「方案 A/B」建立在错误前提上（误判 gallery GET 调用方），已作废。按 Phase 增量实施，**每个 Phase 一个 commit**。
- **进度（2026-10-23 深夜）**：Phase 0 ✅（`5c1c0ae`，client.ts + keyset.ts）；Phase 1 ✅（`7b574d7`，gallery-assets.ts 仓储 + vault/assets 迁入，实时等价 17/17）。Phase 2 进行中：2/1 ✅（projects.ts 全量契约 + gallery-assets 追加 vault 负载/封面/door 助手 + vault 路由迁入，实时等价 1/1 整包 JSON 逐字节一致）；admin projects CRUD（projects/、projects/[id]、cover/merge/split）与 door-data 公开读迁入随后。RLS 部分仍暂缓。
- **性质**：纯读/写路径重构，**不改数据库 schema、不改展示层结构**。所有 Phase 可单独 `git revert` 回滚。

---

## 1. 目标与非目标

**目标**
- 把散落在 ~50 个文件里的 `.schema('lmsy_archive').from(...)` 查询，收敛到 `lib/data/` 仓储层。
- 抽取**共享 keyset 分页**helper，消除"每处各写各的分页/游标"。
- 顺带消除 P1-4（`/api/admin/gallery` 1000 行静默截断）与手写 `.or()` 拼接的脆弱模式。
- 为后续类型化（P2-1，`supabase gen types`）和公开读走 anon+RLS（P2-4）铺路。

**非目标（本设计不碰）**
- 不改任何展示层结构/入口/空态/过滤规则（遵守协作铁律；涉及前端的仅限"消费新接口契约"的最小适配，且单独征求确认，见 §5）。
- 不改数据库 schema、不写迁移。
- 不动 Cloudflare/CDN 缓存失效（那是 P1-5，需用户提供 Token，独立推进）。
- 不引入全新依赖（复用 `@supabase/supabase-js`）。

---

## 2. 现状量化（设计依据）

| 表 | `.from(...)` 命中文件数 | 说明 |
|---|---|---|
| `gallery_assets` | ~34 | 最热表，含 vault/assets、gallery、portal、milestone、reconcile、promote、多个 lib |
| `projects` | ~56 | 面最广，含公开页(dramas/people/gallery)、admin、多个 lib、scripts |

参考实现已就绪：`app/api/admin/vault/assets/route.ts` 的 keyset 分页（游标 `(created_at, id)`、双 `or` 语义、cursor-free count）是本设计要抽取的样板。admin client 见 `lib/supabase/admin.ts`（当前为全 `any`）。

---

## 3. 模块结构

```
lib/data/
  client.ts           # 重新导出服务端 admin client（后续换成 Database 泛型），并集中 typeof window 守卫
  keyset.ts           # 共享 keyset 分页：Cursor / parseCursor / encodeCursor / keysetOr() / KeysetPage<T>
  gallery-assets.ts   # 仓储：listGalleryAssets / getAssetById / updateAsset / deleteAssets / insertAssets
  projects.ts         # 仓储：listProjects / getProjectByKey / updateProject / setCover / merge / split
  (后续按需) editorial.ts / drafts.ts / site-content.ts / people.ts ...
```

**约束**
- `lib/data/*` 只允许在服务端被 import（API route、Server Component、Server Action、lib）。复用 `getSupabaseAdmin()` 的浏览器守卫，杜绝 service-role 外泄。
- 仓储函数**只做数据拼装与查询**，不返回 HTTP 响应、不碰 `NextResponse`；鉴权留在 route 层（`requireAdmin`），业务规则（如可见性 `project-visibility.ts`）仍由调用方或仓储显式传入。

---

## 4. 核心签名（草案）

### 4.1 `lib/data/keyset.ts`（从 vault/assets 原样抽出，行为不变）

```ts
export interface Cursor { createdAt: string; id: string }
export function parseCursor(raw: string | null): Cursor | null
export function encodeCursor(row: { created_at: string; id: string }): string

// 生成 keyset 的 or(...) 片段：created_at < c OR (created_at = c AND id < id)
export function keysetOr(cursor: Cursor): string

// 通用一页：调用方传 buildFilters()（不含游标、含 count:'exact'），这里负责翻页+计数
export interface KeysetPage<T> { rows: T[]; total: number; nextCursor: string | null }
export async function keysetPage<T extends { created_at: string; id: string }>(
  buildBase: () => PostgrestFilterBuilder<...>,  // 已带筛选 + select('*',{count:'exact'})
  opts: { cursor: Cursor | null; limit: number; order?: [string, boolean][] }
): Promise<KeysetPage<T>>
```

> 说明：`PostgrestFilterBuilder` 的具体泛型在 Phase 4 类型化时收敛；Phase 0-3 先用与现 `vault/assets` 等价的宽松类型，避免一次性类型爆炸。count 仍走"cursor-free 的第二个 builder"这条已验证正确的路。

### 4.2 `lib/data/gallery-assets.ts`

```ts
export interface ListAssetsFilter {
  q?: string; tag?: string; projectId?: string; projectIds?: string[];
  cursor?: Cursor | null; limit?: number;   // limit 默认 60，上限 200（同 vault/assets）
}
export async function listGalleryAssets(
  db: SupabaseClient, f: ListAssetsFilter
): Promise<KeysetPage<GalleryAssetRow>>

export async function getAssetById(db, id): Promise<GalleryAssetRow | null>
export async function updateAsset(db, id, patch): Promise<GalleryAssetRow>
export async function deleteAssets(db, ids: string[]): Promise<number>
export async function insertAssets(db, items: NewAsset[]): Promise<{ rows; createdFlags }>
```

> `insertAssets` 需保留现 gallery POST 的**幂等去重**（按 `image_url` 预查、已存在记 `created:false`）与**项目存在性预检**逻辑——这是被评审肯定的 ingestion contract，不能丢。

### 4.3 `lib/data/projects.ts`

```ts
export async function listProjects(db, { cursor, limit, visibility }): Promise<KeysetPage<ProjectRow>>
export async function getProjectByKey(db, key /* slug 或 uuid */): Promise<ProjectRow | null>  // 收编 preview 页 resolveProject
export async function updateProject(db, id, patch): Promise<ProjectRow>
export async function setProjectCover(db, projectId, assetId): Promise<void>
// merge / split 保留各自事务语义，迁移时逐一核对
```

---

## 5. `/api/admin/gallery` GET 修订（P1-4）—— v2 按真实调用方重新裁定

> **修订原因（重要，原方案 A/B 作废）**：v1 误以为"全部资产网格 `all-assets-view.tsx`"是 gallery GET 的调用方，据此要把返回契改为 `{rows,total,nextCursor}`。**走查发现该前提是错的**：
> - `all-assets-view` 的网格走 `/api/admin/vault/assets`（早已 keyset 分页），它对 gallery 路由只有 PATCH/DELETE，没有 GET。
> - gallery GET 的真实调用方只有 3 个，且全部带 `?project_id=<单个项目>`、读平铺 `data` 数组：
>   - `app/admin/curation/page.tsx:229`（`gal?.data ?? []`）
>   - `app/admin/editorial/[id]/curate/page.tsx:133`（`data.sort(...)`）
>   - `app/admin/projects/[id]/curate/page.tsx:373`（`galleryJson.data`）
> - `project_ids`（多个）分支：`grep admin/gallery?project_ids` 零命中 → **死代码**。
> - 全量（不带 project 过滤）分支：零前端调用 → **死代码**（1000 行静默截断只可能发生在这个没人调的分支上）。
> - 无任何测试依赖 gallery GET 的返回结构。

**v2 裁定（不改返回契约、不动任何调用方）**：
- **删除** gallery GET 的「全量」分支与 `project_ids` 分支——既是死代码，全量分支又是 1000 行截断隐患的来源。
- **保留** `project_id` 分支，仍返回平铺 `data` 数组，3 个调用方**零改动**；单个项目的图有界（远小于 1000），无截断风险。
- `project_id` 设为**必填**：缺失即返回 400，从入口上杜绝全表扫描/意外全量返回。
- 结论：**不需要方案 A 的契约改造**，P1-4 通过"删死代码 + 收窄入口"即可消除。

---

## 6. 增量实施顺序（每步一个 commit，可独立回滚）

| Phase | 内容 | 修复项 | 风险 | 触及前端 |
|---|---|---|---|---|
| 0 | 建 `client.ts` + `keyset.ts`，从 vault/assets 原样抽取，**零行为变化** | P1-3 地基 | 极低 | 否 |
| 1 | gallery GET 删除死分支（全量 + `project_ids`）、`project_id` 必填；建 `keyset.ts` + `gallery-assets.ts` 仓储并把 `vault/assets` 迁入（验证抽取） | P1-4（删死代码即除患）+ P1-3 热门表 | 低 | 否（3 调用方零改动） |
| 2 | `projects.ts` 仓储；vault、projects/*、dramas/people 公开读迁入；公开读切 anon+RLS client | P1-3 + P2-4 | 中 | 否（服务端读） |
| 3 | 其余表（editorial/drafts/site-content/people/milestones/tags）按需迁入 | P1-3 收尾 | 低 | 否 |
| 4 | `supabase gen types` 生成 Database 类型，admin client 去掉 `any` | P2-1 | 中 | 否 |

**每个 Phase 的验收**：`tsc --noEmit` 0 错误、改动文件 `eslint` 干净、`npm test` 无新增失败（基线：377 过 / 3 预存失败）、线上冒烟（vault 翻页 / gallery 视图 / preview 鉴权仍正常）。

---

## 7. 回滚

每 Phase 独立 commit、独立可 revert；无 schema 变更、无数据迁移。revert 对应 commit 即回到改造前查询路径。

---

## 8. 确认结论（2026-10-23）

1. ~~§5 gallery 契约选 A/B~~ → **已按 v2 重新裁定**：删死分支（全量 + `project_ids`）、保留 `project_id` 平铺契约、3 调用方零改动（见 §5 修订记录）。
2. Phase 顺序：按 0→4 推进，每 Phase 汇报 + 提交后再进下一个。
3. Phase 2 的"公开读切 anon+RLS"：**暂缓**（用户决定先停）；Phase 2 只做 projects 仓储迁移，RLS 部分单独排期。
