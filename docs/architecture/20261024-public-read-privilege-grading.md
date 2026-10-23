# 公开读特权分级（anon + RLS）设计稿

- 日期：2026-10-24
- 状态：**设计稿（待评审，未实施）**
- 关联：架构评审 P1-A；`docs/architecture/20261023-data-access-layer.md`（P2-4 暂缓项）
- 本文只出方案，不改代码、不动数据库。

---

## 0. 一句话

数据访问层已经建好，但**公开读仍全盘用 service-role**，RLS 对读形同虚设。本设计把读分成两级：**公开门页/读者用 anon client（受 RLS 约束）**，**写/管理/入库用 service-role**。目标是让 RLS 真正成为第二道防线，而不是只写在迁移里。

---

## 1. 根因（已核实）

- `lib/data/client.ts` 只导出 `getSupabaseAdmin()`（SERVICE_ROLE_KEY）。全仓 `lib/data` 没有任何 anon 客户端。
- 公开门页（dramas / people / 门页 / sitemap）直接 `getSupabaseAdmin()` 读公开数据。
- service_role **绕过 RLS**，所以 `20261015_phase1_rls_hardening.sql` 里辛苦收紧的读策略，对应用读完全不起作用。RLS 的两道防线只剩一道（应用层 `applyPublicProjectFilter`）。

---

## 2. 数据库现状（2026-10-24，依据 `supabase/migrations/20261015_phase1_rls_hardening.sql`）

| 类别 | 表 | anon/authenticated 能否读 |
|---|---|---|
| RLS 已全表启用 | 全部 `lmsy_archive` 表 | — |
| **public_read**（`phase1_public_read`，`USING (true)`） | `gallery_assets, gallery, projects, schedule, members, chronicle_events, site_content_blocks` | ✅ 全部行可读 |
| **deny_read**（无 anon SELECT） | `draft_items, admin_users` | ❌ |
| 其余表（RLS enabled 但无 policy） | **`profiles`** 等 | ❌ **默认拒绝** |

**两个关键事实：**
1. **`profiles` 不在 `public_read` 里**。所以 people 页若直接切 anon，proflies 查询会返回空 → 必须先给它加 `phase1_public_read` 策略（并评估 PII）。
2. `projects` / `gallery_assets` 虽在 `public_read`，但策略是 `USING (true)` ——**所有行**可读，包括 `portal_visible=false` / `curation_status='archived'` 的行。应用层现在靠 `applyPublicProjectFilter` 在代码里过滤。要让 RLS 真正当第二道防线，应把 `projects` 策略**收紧到可见性谓词**（见决策点 D2）。

`anon key` 已存在（`.env.local` 有 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）。现有 `lib/supabase/client.ts` 是**浏览器** anon client（`persistSession: true` + `window.localStorage`），**不能直接用于服务端 SSR**。

---

## 3. 目标架构

```
                       ┌─────────────────────────────┐
  公开门页 / 公开 reader ─┤ getSupabasePublic()  (anon)  │→ 受 RLS 约束
                       └─────────────────────────────┘
                       ┌─────────────────────────────┐
  写 / admin / 入库/脚本 ─┤ getSupabaseAdmin() (service) │→ 绕过 RLS（不变）
                       └─────────────────────────────┘
```

### 3.1 新增服务端 anon 客户端

在 `lib/data/client.ts` 增加：

```ts
import { createClient } from '@supabase/supabase-js';

/** 服务端公开读客户端（anon key，受 RLS 约束）。仅用于公开读，禁止写。 */
export function getSupabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase public (anon) client not configured');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: 'lmsy_archive' },
    global: { headers: { 'X-Client-Info': 'lmsy-space-public-ssr' } },
  });
}
```

> 不复用 `lib/supabase/client.ts`：那是浏览器版（localStorage / persistSession），SSR 下会出问题。

### 3.2 类型放宽

仓储公开函数目前签名是 `db: AdminClient`。两种做法（择一）：
- **A（推荐，改动小）**：加 `export type PublicClient = ReturnType<typeof getSupabasePublic>`；新增 `export type DbClient = AdminClient | PublicClient`；公开函数签名由 `AdminClient` 改成 `DbClient`。
- B：保持 `AdminClient` 类型名但语义上允许 anon（不改类型，只改调用）——语义混乱，不推荐。

---

## 4. 数据库改动（新迁移，单独一次）

### 4.1 必须：`profiles` 加公开读

`supabase/migrations/20261024_public_read_profiles.sql`：

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='lmsy_archive' AND tablename='profiles') THEN
    ALTER TABLE lmsy_archive.profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS phase1_public_read ON lmsy_archive.profiles;
    CREATE POLICY phase1_public_read ON lmsy_archive.profiles
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
```

**PII 处理（决策点 D1，已实测修正）**：本文最初建议建 `public_profiles` 视图只暴露 6 个展示列。实测推翻：生产 `profiles` **本来就是整行 anon 可读**（`birthday/bio/bio_i18n/ig_handle/x_handle/slug/role_label` 都能读），而人物页确实要读这些列——改成 6 列视图会把人物页读空。所以按生产现状落地：整行公开读，与 `profiles` 现有 `Allow public read`（`TO anon USING (true)`）一致。见 `supabase/migrations/20261024_public_read_profiles.sql`。

### 4.2 `projects` RLS 收紧到可见性谓词（决策点 D2）——迁移稿已写，**未执行**

> 实况审计（2026-10-24 查 `pg_policies` / `pg_class`）改写了这一节的结论，迁移稿见 `supabase/migrations/20261024_public_read_projects_visibility.sql`。

**坑一：`projects` 上有两条 `USING (true)` 的策略。** PostgREST 的 permissive 策略是 OR 关系，只改 `phase1_public_read` 等于没改：

| 策略名 | roles | qual |
|---|---|---|
| `Public read access on projects` | `public` | `true` |
| `phase1_public_read` | `anon, authenticated` | `true` |

所以必须**同一事务里先删掉 `Public read access on projects`**，否则收紧无效。同样的双策略存在于 `gallery_assets`、`gallery`、`chronicle_events`、`profiles`（后者只有 `Allow public read` 一条，`phase1_public_read` 是迁移稿里才加的，执行顺序要注意）。

**坑二：谓词要当下限，不能当等号。** 应用层 `applyPublicProjectFilter()` 是 `portal_visible = true AND is_container = false AND curation_status <> 'archived'`，其中后两个在 SQL 里 `<>` / `=` 都会把 NULL 排除。若 RLS 写成同样形状，将来出现 NULL 行时 **RLS 会比应用层更严**，页面会无故空白。因此策略用 NULL-safe 形式，只保证「不藏掉应用层本来会显示的行」：

```sql
DROP POLICY IF EXISTS "Public read access on projects" ON lmsy_archive.projects;
DROP POLICY IF EXISTS phase1_public_read ON lmsy_archive.projects;
CREATE POLICY phase1_public_read ON lmsy_archive.projects
  FOR SELECT TO anon, authenticated
  USING (
    portal_visible IS TRUE
    AND is_container IS NOT TRUE
    AND curation_status IS DISTINCT FROM 'archived'
  );
```

**影响面实测（182 行）**：`portal_visible=false` 8 行、`is_container=true` 3 行、`curation_status` 无 NULL；应用层过滤后 174 行，新策略同样 174 行 → anon 今天看到什么，收紧后还是什么，只是拿不到那 8 行隐藏行的**直连**。service_role 全程绕过 RLS，admin 路由、`lib/promote.ts`、`app/admin/preview` 不受影响。

### 4.3 顺带发现：57 张内部快照表 anon 可读（独立迁移稿，**未执行**）

`pg_class` + `information_schema.role_table_grants` 审计结果：`lmsy_archive` 下有 **57 张 `*_snap_*` / `snap_*` 备份表 RLS 关闭且对 `anon`、`authenticated` 授予了 SELECT**，实测 anon 直连 `gallery_assets_snap_m1_20261020?select=*` 返回 200 + 真实行。这些是历次改数据前拍的整表快照（`projects` / `gallery_assets` / `profiles`），里面**包含当时未公开的行、后来删掉的行**。

代码里没有任何 `_snap_` / `snap_` 引用（lib、app、components、scripts 全 grep 为空），所以关掉公开读是纯收益。迁移稿 `supabase/migrations/20261024_revoke_anon_snapshot_tables.sql`：显式列出 57 个表名（不用 `like '%snap%'` 通配，避免误伤将来有意暴露的表）→ `REVOKE SELECT` + `ENABLE ROW LEVEL SECURITY` 且不建策略。

同一批里还有两张**真表**是 RLS 关闭的：`works`、`project_people`。`project_people` 正是人物页公开读的对象（这也是切 anon 后人物页没空的原因）。处理方式是 `ENABLE ROW LEVEL SECURITY` + 补一条 `USING (true)` 读策略——对 SELECT 与今天等价，但表不再是「授权即全开」。

**尚未处理、留给你定**：`publications`（RLS 开、anon 可读、代码无引用）、`catalog_registry`（读策略 `TO public`，实际只有 `/api/admin/catalog-registry` 用）。

---

## 5. 代码改动清单（按模块分级）

### 5.1 公开 reader → `getSupabasePublic()`（本设计主目标）

| 文件 | 说明 |
|---|---|
| `lib/door-data.ts` | 门页公开读（projects + gallery_assets），核心目标 |
| `lib/timeline.ts` | 时间线公开读（projects） |
| `lib/series-slugs.ts` | 系列 slug（projects） |
| `lib/homepage-hero.ts` | 首页 hero（site_content_blocks，已在 public_read） |
| `lib/editorial-issues.ts` | 公开 editorial / features 读；四个 loader 全部只被公开页用 → 直接改用 anon |
| `lib/cover-slots.ts` | 槽位封面；与 admin 策展树共用 → 已改成「由调用方传 client」，门页传 anon、`lib/curation.ts` 传 service-role |
| `app/dramas/page.tsx`、`app/dramas/[slug]/page.tsx`、`app/dramas/[slug]/[event]/page.tsx` | 公开门页 |
| `app/people/page.tsx`、`app/people/[slug]/page.tsx` | 公开人物页（依赖 D1 的 profiles policy） |
| `app/sitemap.ts` | 站点地图 |

### 5.2 保持 service-role（不动）

- 所有 `app/api/admin/**`（写/管理）
- `lib/curation.ts`（admin 策展树）、`lib/promote.ts`（入库/提升）
- `app/admin/preview/**`（后台预览，刻意 service-role）
- `app/api/ingest`、`app/api/cron/**`、`app/api/webhooks/**`（服务端任务）

### 5.3 公开 API 路由（第二阶段，可选，决策点 D3）

`app/api/home/portals`、`home/summary`、`editorial`、`milestones`、`project-gallery`、`site-content` —— 都是公开读接口。可一并切 anon，但它们是服务端路由（anon key 不直接暴露），风险低于 SSR 页面，可放第二期。

**已切**：`editorial`（与 `lib/editorial-issues.ts` 同一个仓储函数，页面与接口一起切，避免出现「页面能读、接口不能读」的错位）。
**未切**：其余五个，仍在 service-role；`api/home/*` 与 `api/project-gallery` 是首页卡片和作品详情的数据源，切之前要先确认 anon 读结果与现在逐字段一致。

---

## 6. 上线顺序（每阶段独立 commit、可单独回滚）

1. **阶段 A**：只加 `getSupabasePublic()` + `PublicClient/DbClient` 类型。不改任何调用方。`tsc` 必须 0 错。
2. **阶段 B**：DB 迁移加 `profiles` public_read（+ 可选 projects 收紧）。只动 DB，不动代码；此时公开读仍 service-role，页面不变。
3. **阶段 C**：逐个模块把公开 reader 切 anon（5.1 列表，按门页 → 人物 → sitemap 分批）。每切一个跑 anon 冒烟 + 页面回归。
4. **阶段 D（可选）**：公开 API 路由切 anon。

> 关键：C 阶段必须**先 B 后 C**。若先切 people 页、B 还没加 profiles 策略 → 人物页空白。

---

## 7. 验证清单（每阶段）

- **anon 冒烟**（直连 REST，不走 service-role）：
  - `GET /rest/v1/projects?select=id,title&limit=3`（anon key）→ 返回可见行
  - `GET /rest/v1/profiles?select=id,nickname&limit=3` → 加策略后返回；加之前应为空/403
  - `GET /rest/v1/draft_items?select=id&limit=1` → **必须为空/403**
  - 若做了 D2：anon 应查不到 `portal_visible=false` / `archived` 的 projects
- **页面回归**：dramas 三页、people 两页、sitemap、六门门页仍正常渲染
- **admin 不受影响**：后台可正常读写（service-role）
- `tsc --noEmit` 0 错、`eslint` 不回退、`npm test` 381/381

---

## 8. 风险与回滚

| 风险 | 影响 | 缓解 |
|---|---|---|
| deny-by-default：漏加 public_read 的表 | 页面变空 | 切之前先查该页读哪些表，逐个补策略；分模块上线 |
| `profiles` PII 暴露 | anon 可读全部列 | 用 `public_profiles` 视图 / 列级授权 |
| 收紧 projects RLS（D2） | 隐藏行对 anon 不可见 | 公开路径本就过滤，实测确认；可单独回滚 |
| SSR 下用错客户端 | 运行时报错 | 阶段 A 先落地并 tsc |
| 回滚 | — | 每阶段一个 commit；回滚 C 即恢复 service-role，DB 不动 |

---

## 9. 需要你拍板的决策点

- **D1**：`profiles` 是否对 anon 开放读？整表 policy 还是 `public_profiles` 视图（列级，更安全）？
- **D2**：是否顺带把 `projects` 的 RLS 收紧到「可见性谓词」（真正的第二道防线）？
- **D3**：公开 API 路由（home/editorial/milestones/...）本期一起切，还是先只切 SSR 页面？
- **D4**：是否保留应用层 `applyPublicProjectFilter` 作为双保险（推荐保留），还是完全依赖 RLS？

---

## 10. 建议的最小落地（风险最低、收益最大）

先做 **D1（profiles 视图）+ D3 推迟（只切 SSR 页面）**：即阶段 A → B（只加 profiles 视图/policy）→ C（dramas/people/sitemap/门页）。D2 的 projects RLS 收紧单独排一次，作为加固。D4 保留双保险。

这样能在不改写 API、不动 service-role 写路径的前提下，让公开门页真正受 RLS 约束。
