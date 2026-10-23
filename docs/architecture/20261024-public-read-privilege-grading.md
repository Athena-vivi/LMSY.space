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

**PII 处理（决策点 D1）**：`profiles` 只有展示字段（`name/nickname/slug/avatar_url/role_label`）。若担心存在隐藏列（如 email/内部备注），更安全的做法是建 `public_profiles` 视图只暴露公开列，anon 只读视图。默认建议视图方案，成本略高。

### 4.2 可选：`projects` RLS 收紧到可见性谓词（决策点 D2）

```sql
DROP POLICY IF EXISTS phase1_public_read ON lmsy_archive.projects;
CREATE POLICY phase1_public_read ON lmsy_archive.projects
  FOR SELECT TO anon, authenticated
  USING (portal_visible = true AND curation_status <> 'archived');
```

效果：anon 即使绕过应用层也读不到隐藏/归档事件（第二道防线）。风险：任何**依赖 anon 读隐藏行**的路径会变空；但公开路径本就经 `applyPublicProjectFilter` 过滤，理论上一致，仍需实测。

---

## 5. 代码改动清单（按模块分级）

### 5.1 公开 reader → `getSupabasePublic()`（本设计主目标）

| 文件 | 说明 |
|---|---|
| `lib/door-data.ts` | 门页公开读（projects + gallery_assets），核心目标 |
| `lib/timeline.ts` | 时间线公开读（projects） |
| `lib/series-slugs.ts` | 系列 slug（projects） |
| `lib/homepage-hero.ts` | 首页 hero（site_content_blocks，已在 public_read） |
| `lib/editorial-issues.ts` | 公开 editorial 读；若同时被 admin API 用，改成「由调用方传 client」 |
| `lib/cover-slots.ts` | 封面解析；被 portal(admin) 与公开共用 → 改「由调用方传 client」 |
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
