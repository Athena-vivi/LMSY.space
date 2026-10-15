# LMSY.space 第二阶段报告：第一阶段生产收尾与性能优化

**报告日期：** 2026-10-15
**执行范围：** 工作包 A（第一阶段生产收尾）+ 工作包 B（第二阶段性能优化）
**代码基线：** `main @ f9b0627`
**本次提交：** `b2813ee`（详见 E 节）
**涉及仓库：** `Athena-vivi/LMSY.space`（分支 `main`）
**全程遵守的约束：** 未重构架构；未更换技术栈；未重新设计数据模型；未大规模移动或重命名历史图片；未删除任何 R2 对象；未重复执行杂志内页回填；未改变 draft 审核发布流程；未提前构建批量采集工作台；未为性能指标牺牲图片质量或页面正确性；未在报告中输出任何密钥值。

> **执行环境网络限制（影响 A 节判定，务必先读）**
> 本次执行所在主机处于受限网络环境。实测可达性如下（HTTP 状态码）：
>
> | 目标 | 结果 |
> |---|---|
> | `lmsy.space`（生产站点） | `000` 不可达 |
> | `*.vercel.app`（部署详情） | `000` 不可达 |
> | `api.telegram.org` | `000` 不可达 |
> | `google.com` / `fonts.googleapis.com`（经代理） | `000`（绕过代理直连为 `200`） |
> | Supabase REST（生产库） | 可达（service_role 与 anon 均可用） |
> | Cloudflare R2 S3 API | 可达 |
> | `api.github.com` | 可达 |
> | `cdn.lmsy.space` | 可达（`200`） |
>
> 结论：**任何需要访问 `lmsy.space` / Vercel / Telegram API 的验证项都无法在本机完成**，这些项一律标记为「被网络或平台条件阻塞」，绝不把本地结果冒充生产结果。反过来，凡是能通过 Supabase / R2 / GitHub 直连核验的项，以及能在本地用**同一份代码**跑出来的验证，都已经实际执行并记录在下方。
>
> 另有一个与本机相关的构建细节：经代理访问 `fonts.googleapis.com` 被阻断，导致 `next/font` 拉取 Google 字体失败、`next build` 中断。**绕过代理（`env -u http_proxy ...`）直连即可正常构建**。这是本机网络问题，与代码无关，也与 Vercel 无关。

---

## A. 第一阶段生产收尾

逐项状态总览：

| # | 项目 | 状态 |
|---|---|---|
| 1 | 环境变量（`ADMIN_EMAIL` / `TELEGRAM_WEBHOOK_SECRET` / `CRON_SECRET` / `INGEST_API_KEY`） | **被权限或平台条件阻塞**（本机无法读取 Vercel；已在本地用同名变量验证代码路径） |
| 2 | Telegram Webhook 重新注册 | **被网络阻塞**（`api.telegram.org` 不可达） |
| 3 | 三个数据库迁移 | **已完成核验，尚未应用**（等待数据库访问；已用生产只读探测确认四个前提条件全部满足） |
| 4 | 生产安全冒烟测试 | **被网络阻塞**（已用「本地同代码 + 生产数据层直连只读探测」替代，两项均通过） |
| 5 | 管理员登录验证 | **被权限阻塞**（需可达的生产地址 + 凭据） |
| 6 | Supabase 平台备份 / PITR 状态 | **需管理员在 Dashboard 核实**（本机无法查询） |
| 7 | R2 独立异地备份 | **已完成并验证** |

### A.1 环境变量

- **状态：** 被权限或平台条件阻塞。
- **已做的核验：** 本地 `.env.local` 存在且包含全部相关变量（仅确认变量名存在，未读取值、未输出值）：`ADMIN_EMAIL`、`NEXT_PUBLIC_ADMIN_EMAIL`、`CRON_SECRET`、`INGEST_API_KEY`、`TELEGRAM_WEBHOOK_SECRET`、`TELEGRAM_BOT_TOKEN`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`R2_*`、`NEXT_PUBLIC_SITE_URL`。`.env.local` 被 `.gitignore` 覆盖（`.env*`），未入库。
- **代码路径已在本地验证：** 用本地服务器（同一份代码）跑冒烟测试，管理员邮箱读取、会话接口、限流、机器密钥 fail-closed 全部通过（见 C 节）。**代码逻辑正确，但是否在 Vercel Production 生效无法在本机确认。**
- **兼容变量处理：** `NEXT_PUBLIC_ADMIN_EMAIL` **保留未删**。`getAdminEmail` 在 `ADMIN_EMAIL` 缺失时回退到它，因此只要 Vercel 配了后者，后台仍可登录；须在确认 `ADMIN_EMAIL` 已在 Production 就绪后，再评估移除兼容变量。
- **需要管理员操作的：** 在 Vercel → Project → Settings → Environment Variables → **Production** 确认 `ADMIN_EMAIL`、`TELEGRAM_WEBHOOK_SECRET`、`CRON_SECRET`、`INGEST_API_KEY` 均已配置，然后 Redeploy 使其生效。

### A.2 Telegram Webhook

- **状态：** 被网络阻塞（`api.telegram.org` 返回 `000`）。
- **脚本就绪：** `scripts/setup-telegram-webhook.ts`（9.0KB）存在，未改动。
- **本地已验证的鉴权行为**（同一份代码，通过本地服务器）：
  - 无 `X-Telegram-Bot-Api-Secret-Token` → `401`；
  - secret 错误 → `401`；
  - secret 正确 + 无 `message`/`photo` 的空 payload → `200`（无 DB / R2 / AI 副作用）。
- **⚠️ 需要注意的依赖关系：** webhook 校验依赖 `TELEGRAM_WEBHOOK_SECRET`。若 Vercel 已配置该变量但 **未重新注册 webhook**，Telegram 不会携带 secret 头，路由会一律拒绝 → **采集会中断**。因此顺序必须是：先配好环境变量 → 再跑 `setup-telegram-webhook.ts` → 再验证。
- **需要管理员操作的：** 配置好 `TELEGRAM_WEBHOOK_SECRET` / `TELEGRAM_BOT_TOKEN` 后，在能访问 Telegram 的机器上执行 `scripts/setup-telegram-webhook.ts`，确认返回 `ok: true`，再发一条合法消息验证产生草稿、并发一条伪造请求验证被拒。

### A.3 三个数据库迁移

**状态：已完成核验（对生产只读），尚未应用。** 三个迁移文件内容已完整阅读，并已逐条对照生产库实际结构确认「应用前提全部满足」。等待管理员提供数据库访问（直接连接串或 Management API Token）后执行。

生产库实际状态（通过 PostgREST 只读探测，`Accept-Profile: lmsy_archive`）：

| 探测项 | 结果 | 对迁移的含义 |
|---|---|---|
| `gallery_assets` 列数 | **30 列**，含 `catalog_id` / `is_cover` / `sequence` / `rotation` / `display_role` / `integrity_status` / `project_id` 等 | 基线迁移的 `ADD COLUMN IF NOT EXISTS` 已全部满足，**幂等、可安全应用** |
| `gallery_assets.catalog_id` | 312 非空 / **0 重复** | 部分唯一索引**可以**创建 |
| `draft_items.file_hash` | 70 非空 / **0 重复** | 部分唯一索引**可以**创建 |
| `draft_items.source_platform` 取值 | `["telegram","twitter","weibo"]` | 旧 CHECK **缺少 `telegram`**，数据完整性迁移**确有必要** |
| 表清单 | 9 张：`admin_users, chronicle_events, draft_items, gallery, gallery_assets, profiles, projects, publications, site_content_blocks` | 与代码引用一致 |
| 行数 | `gallery_assets` 330 / `draft_items` 71 / `projects` 25 / `gallery` 0 | 与回填后状态一致 |

三个迁移逐项说明：

1. **`20261015_phase1_baseline_gallery_assets.sql`** —— 目标：补齐 `gallery_assets` 基线结构，使其纳入版本控制。生产表**已经是** 30 列目标形态，迁移用 `IF NOT EXISTS` 追加，**不会重建表、不会覆盖或删除数据**。可安全应用。
2. **`20261015_phase1_data_integrity.sql`** —— 目标：修正 `draft_items.source_platform` CHECK 使其覆盖 `telegram`；为 `gallery_assets.catalog_id` 与 `draft_items.file_hash` 各建部分唯一索引。**四个前提条件已全部验证通过**（见上表）。不会为建索引而删除或重排任何编号。
3. **`20261015_phase1_rls_hardening.sql`** —— 目标：撤销不必要的 anon/authenticated 写入权限、启用 RLS、仅对确需公开读的表保留公开读策略。**这是当前唯一确认存在的线上安全缺口**，详见 A.4。

- **需要管理员操作的：** 提供数据库访问（`SUPABASE_DB_URL` 直连串，或 Supabase Management API Token），三份迁移由我按序执行并做应用后核验（列/约束/索引/RLS 策略存在性 + 前后行数对比）。

### A.4 生产安全冒烟测试

**状态：生产 HTTP 层被网络阻塞；已用两种可执行的替代验证，均通过。**

替代验证一：**数据层只读探测**（用 anon key，即浏览器实际使用的身份，直连生产 Supabase）。这是最关键的授权面：

| 探测 | 结果 | 判定 |
|---|---|---|
| anon `SELECT draft_items` | **HTTP 200 且返回真实未发布行**（含 `source_url: https://t.me/...`、`source_platform: telegram`） | **RLS 加固未生效，敏感草稿对外暴露** |
| anon `SELECT admin_users` | HTTP 200 `[]`（可读但为空） | 表可读，权限过宽 |
| anon `SELECT gallery_assets / projects / site_content_blocks` | HTTP 200 返回数据 | 公开读，符合预期 |
| anon `INSERT gallery_assets / gallery / projects / draft_items` | 全部 **HTTP 401 / code 42501** | anon **无任何写入权限**（良好） |

结论：**写权限已被正确撤销，缺的只是 SELECT（读取）加固**，即 `rls_hardening` 迁移中针对 `draft_items` / `admin_users` 的公开读策略与 grant 收口。这正是第一时间要补的应用。

替代验证二：**本地同代码端点冒烟测试**（`scripts/security-smoke-test.mjs --base http://localhost:3000`，服务器由本次构建产物启动）。**51 / 51 全部通过**，覆盖全部受保护管理 API、伪造 Bearer、机器密钥缺失/错误（含历史 `Bearer undefined` 绕过）、Telegram secret 三态、登录限流、公开端点存活。逐条结果见 C 节。

- **未被覆盖（需可达生产地址）：** 生产环境的错误响应实际形态、真实管理员凭证登录、真实 Telegram 消息入库、生产 R2 上传路径。这些必须在 Vercel 可达的环境执行。
- **需要管理员操作的：** 在能访问 `https://lmsy.space` 的环境执行 `node scripts/security-smoke-test.mjs --base https://lmsy.space`（该脚本设计为非破坏性：所有管理端点均以「应被拒绝」为期望）。

### A.5 管理员登录验证

- **状态：** 被权限阻塞（需生产地址 + 真实凭据）。
- **已完成的替代验证：** `/api/auth/login` 在本地服务器上 **11 次失败尝试后返回 429**（限流生效）；`/api/auth/session` 返回 `200`（公开可访问、未泄露身份）；全部 28 个管理端点未认证一律 `401`。
- **未完成：** 用真实管理员凭证在生产登录、会话续期、退出登录的端到端确认。

### A.6 Supabase 平台备份 / PITR 状态

- **状态：需管理员在 Dashboard 核实。** 本机无法查询 Supabase 平台备份设置（需要 Dashboard 或 Management API）。
- **必须记录的一行（请管理员填写）：**
  `PITR: ___ | 每日备份: ___ | 保留期: ___ | 最近一次恢复测试: ___`
- **明确说明：** 仓库内的应用层逻辑导出（`npm run backup:db`）**不能替代**平台原生备份 / PITR。Free 套餐无 PITR 且保留期有限。

### A.7 R2 独立异地备份

- **状态：已完成并验证。**
- **做法：** 新增脚本 `scripts/backup-r2-offsite.mjs`（npm `backup:r2:offsite`），把源桶 `lmsy-archive` 用**服务端 `CopyObject`** 镜像到第二个桶 `lmsy-archive-backup`（零下载、零出口流量），幂等（同 size 已存在则跳过），结束前双桶列表核对，缺失或 size 不一致即非零退出。
- **本次实测：** `lmsy-archive-backup` 桶已创建并验证 —— `sourceObjects: 408`、`targetObjects: 408`、`copied: 31`、`skippedExisting: 377`、`failures: []`、`missing: []`、`sizeMismatch: []`、`ok: true`。
- **明确限制：** 第二个桶与源桶**在同一个 Cloudflare 账号**。它能防误删、防批量操作事故、防应用自身删除逻辑的 bug，但**不能**防账号级灾难（欠费、账号被盗、厂商标故）。跨账号 / 跨厂商的第三份副本仍待管理员决定。
- **R2 对象版本控制现状：** **未启用**（已查 `GetBucketVersioning`）。
- **文档已更新：** `docs/BACKUP_AND_RESTORE.md` 新增「异地 R2 副本」小节、命令、限制说明，并更新了「仍需完成」清单与恢复预案 D。

**其余备份能力（本次复核，均通过）：**

| 命令 | 结果 |
|---|---|
| `npm run backup:db` | 9 张表 / 432 行，行数与 sha256 全部核对通过 |
| `npm run backup:r2` | 408 / 408 对象，159,141,333 B，0 失败 |
| `npm run restore:drill` | **PASSED**：9 表 432 行回读校验；118 条 R2 引用 ok，0 缺失，0 hash 不符；18 个 `draft/` 前缀资产在位 |

> 恢复演练的性质说明：隔离目标是 **SQLite**，不是 PostgreSQL。它证明导出完整、可读、可回装、内部一致，**不**证明 Supabase 原生 Postgres 备份可恢复（那需要 PITR 或第二个 Supabase 项目）。

---

## B. 性能优化明细

### B.0 优化前基线（本地快照 + R2 镜像，可复现）

基线测量脚本 `temp/measure-baseline.mjs`（基于 `backups/db/2026-10-15T09-02-53-321` 与 `backups/r2/2026-10-15T09-03-01-068/objects`，不触碰生产）：

**一、查询载荷（PostgREST 返回的 JSON 字节数）**

| 页面 | 优化前 | 优化后 | 变化 |
|---|---|---|---|
| `/gallery` 第一页（60 行） | 45.2 KB | 21.4 KB | **−53%** |
| `/gallery` 改造前实际一次性读取 | **252.0 KB**（全表 330 行） | 21.4 KB | **−91.5%** |
| `/projects` 列表（全 25 行） | 16.2 KB | 6.4 KB | **−61%** |

**二、图片传输（`/gallery` 一页 60 张）**

| 指标 | 优化前 | 优化后 |
|---|---|---|
| 单页 60 张合计 | **24.29 MB**（原图直出） | **2.29 MB**（1080px WebP q75） |
| 降幅 | —— | **−90.6%** |
| 第一页最大单图 | 0.82 MB | —— |

**三、构建产物路由性质**

| 路由 | 优化前 | 优化后 |
|---|---|---|
| `/gallery` | `ƒ` 动态 | **`○` 静态** |
| `/projects` | `ƒ` 动态 | **`○` 静态** |
| `/profiles` | `ƒ` 动态 | **`○` 静态** |
| `/schedule` | `ƒ` 动态 | **`○` 静态** |
| `/chronicle` | `ƒ` 动态 | **`○` 静态（revalidate 5m）** |
| `/sitemap.xml` | `ƒ` 动态 | **`○` 静态（revalidate 1h）** |

### B.1 P0 全站缓存策略

- **优化前的问题：** `next.config.ts` 用一条 `source: '/:path*'` 规则给**所有**响应（含带内容哈希的 `/_next/static/**`）下发 `no-store, no-cache, must-revalidate, max-age=0`。结果：每次导航都重新下载全部 JS/CSS chunk，CDN 完全失效。
- **修改文件：** `next.config.ts`。
- **修改方案：** 删除全站兜底规则，改为**按资源类型**下发：

  | 资源 | 策略 |
  |---|---|
  | `/_next/static/:path*` | `public, max-age=31536000, immutable`（URL 含内容哈希，安全） |
  | 10 个静态 public 文件（favicon / logo / hero 等） | `public, max-age=604800, stale-while-revalidate=86400` |
  | `/sw.js` | `public, max-age=0, must-revalidate` + `Service-Worker-Allowed: /` |
  | `/manifest.json`、`/site.webmanifest` | `public, max-age=0, must-revalidate` |
  | `/api/:path*` | `no-store, no-cache, must-revalidate, max-age=0` + `Pragma: no-cache` |
  | `/admin/:path*` | `no-store, ...` + `X-Robots-Tag: noindex, nofollow` |
  | HTML 页面 | 不再干预，交给 Next/Vercel 默认（见下） |

  另外：`poweredByHeader: false`；`images.remotePatterns` 由 `hostname: '**'` 收窄为仅 `cdn.lmsy.space`；`images.formats: ['image/avif','image/webp']`；`minimumCacheTTL: 2592000`。

- **修改后的行为（本地同一构建产物实测响应头）：**
  - `/_next/static/**.css` → `Cache-Control: public, max-age=31536000, immutable` ✅
  - `/_next/image?url=…&w=1080&q=75`（`Accept: image/avif`）→ `public, max-age=2592000, must-revalidate` + `Vary: Accept`，`Content-Type: image/avif` ✅
  - `/sw.js` → `public, max-age=0, must-revalidate` + `Service-Worker-Allowed: /` ✅
  - `/api/milestones` → `no-store, no-cache, must-revalidate, max-age=0` + `Pragma: no-cache` ✅
  - `/admin/login` → `no-store, must-revalidate` + `X-Robots-Tag: noindex, nofollow` ✅
  - `/favicon.ico` → `public, max-age=604800, stale-while-revalidate=86400` ✅
  - 无 `X-Powered-By` 响应头 ✅

- **关于 HTML 的诚实说明：** 所有 HTML 页面（含纯静态的 `/copyright`）实测仍返回 `Cache-Control: no-store, must-revalidate`。经确认这是 **Next.js 自身的默认行为**（不是本配置残留的兜底规则——本配置已无 `/:path*`）。这些页面是**客户端组件外壳**、数据由浏览器端另取，且外壳引用了带哈希的资源 URL；若给 HTML 长缓存，部署后旧外壳可能引用已被替换的旧资源哈希，反而制造风险。因此**有意保留框架默认的 no-store**，符合「不要把所有 HTML 设为长期缓存」的要求。P0 的收益集中在 JS/CSS/图片。

- **关于 `/_next/image` 的说明（重要）：** 该优化器是 Next 内部路由，其 `Cache-Control` 由框架管理 —— 实测最终响应为 `public, max-age=2592000, must-revalidate`（即由 `images.minimumCacheTTL = 2592000` = 30 天决定）+ `Vary: Accept`，内容协商后返回 **AVIF**。我曾为其单独加一条 `immutable` 规则，实测**不但无效、反而把该头变成更差的 `max-age=0`**；移除该规则后框架给出正确的 30 天缓存。因此**配置中不再为该路径定义条目**，避免文档与事实不符。

- **性能对比：** 见 B.0 路由表（6 个页面由动态变为静态前置渲染）。静态资源从「每次导航重下」变为「一年内不再请求」。
- **费用变化：** 无新增费用。静态资源命中浏览器缓存后，反而减少 CDN/边缘请求。
- **回归风险：** 已评估并在 C 节验证：公开 API 仍可访问；管理员页不可被公共缓存（`no-store`）且加了 `noindex`；写入类 API 不受影响。

### B.2 P1 图片加载与布局

- **优化前的问题：** 图片组件普遍使用 `unoptimized`（绕过 Next 优化，直出 R2 原图，最大单图约 4.3MB）；部分图片宽高为 0 或缺失，导致布局抖动（CLS）；无自适应 `sizes`。
- **修改文件：**
  - 新增 `lib/image-dimensions.ts`（`toR2Key` / `getImageDimensions` / `getImageAspectRatio` / `FALLBACK_ASPECT_RATIO = 2/3`）与数据文件 `lib/generated/image-dimensions.json`（408 条 `{key: {w,h}}`，26KB，由本地 R2 镜像提取）；
  - 新增 `scripts/extract-image-dimensions.mjs`（npm `images:dims`）用于重新生成该 JSON；
  - `app/gallery/page.tsx`、`app/gallery/lightbox.tsx`、`app/projects/[id]/project-detail-client.tsx`、`app/editorial/[id]/gallery-image.tsx`、`app/exhibitions/category/[type]/exhibition-content.tsx`、`components/chronicle-timeline.tsx`。
- **修改方案：**
  1. 用 `next/image` 的真实 `width`/`height`（从尺寸表读取，`rotation` 为 90/270 时交换宽高）替换 `unoptimized`；缺失时回退 1200×1800；
  2. 网格图改用 `fill` + 明确的 `aspect-ratio` 容器（比例取自真实尺寸，兜底 `2/3`），**保留原始展示比例**，杜绝加载前后抖动；
  3. 为每类用途设定 `sizes`（栅格 `(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw`；详情页/编年史/专题各自定义），使响应式取值正确；
  4. 首屏优先：`loading={index < N ? 'eager' : 'lazy'}`（画廊 3、详情 2），其余懒加载。
- **修改后的行为：** 图片经 Next 优化器按实际渲染宽度输出，支持 AVIF/WebP。**实测**：同一张源 WebP（408 KB）在 `w=1080 q=75` 下，JPEG 回退 41.9 KB、**AVIF 20.8 KB**（AVIF 约为 JPEG 的一半），二次请求命中优化器缓存（`X-Nextjs-Cache: HIT`）。
- **性能对比：** `/gallery` 单页 60 张 **24.29 MB → 2.29 MB（−90.6%）**。
- **费用变化：** 启用 Vercel 图片优化会产生计费，但计费按**被转换的源图变体数**（url × width × quality）而非请求数，且有 30 天优化缓存（`minimumCacheTTL`）。由于 `sizes` 已收敛宽度档位、历史图片总量固定（408 个对象），费用可预期且不大；`remotePatterns` 收窄到仅 `cdn.lmsy.space` 也避免了任意远程 URL 触发转换。**未新增 R2 缩略图处理**（符合「本阶段不做大规模历史图片重加工」）。
- **无回归：** 未移动、未重命名、未删除任何 R2 对象；所有 `image_url` 引用不变；历史杂志内页、封面、详情页内页展示能力保留（详情页与灯箱仍可请求大尺寸）。

### B.3 P1 `/gallery` 查询与分页

- **优化前的问题：** 页面为客户端组件，**一次性读取全表**（330 行、`select('*')`，252 KB），长文本字段（`excerpt`/`title`/`credits`/i18n blob）全部拉取；筛选在内存中对已加载数组做；无分页；每条记录还有一次 `console.log`；动画 stagger 随索引线性增长（`index * 0.05`，330 条时约 16 秒）。
- **修改文件：** `app/gallery/page.tsx`、`app/gallery/lightbox.tsx`、`lib/image-url.ts`。
- **修改方案：**
  1. 列投影：`GALLERY_COLUMNS = id, image_url, caption, caption_i18n, tag, catalog_id, created_at, is_cover, is_editorial, curator_note, rotation, sequence`；
  2. 真分页：`PAGE_SIZE=60`，`range(from, from+PAGE_SIZE-1)`；排序 `order('created_at', desc).order('id', desc)`（加稳定并列键，分页不重不漏）；「加载更多」按需翻页，**绝不再一次请求整表**；
  3. 筛选下推数据库：`eq('tag', tag)` 在 DB 端执行（不是把全量数据取回本地再切）；
  4. 去掉每条记录的 `console.log`；stagger 改为 `Math.min(index, 12) * 0.03`；栅格图 `fill` + `sizes` + `aspectRatio`，首 3 张 `eager`。
- **修改后的行为：** 首次只取 60 行、21.4 KB；筛选切换即从第 1 页重新查询；「加载更多」追加下一页。
- **性能对比：** 首屏查询 252 KB → 21.4 KB（−91.5%）。
- **费用变化：** 无。Supabase 请求**更少**（不再每次全表）。
- **无回归（已对生产只读验证）：** 见 C 节分页验证：3 页共 180 条互不重叠、排序稳定、末页 30 条（330 总数一致）。
- **已发现但未改动的问题（见 F 节）：** `*_i18n` 过滤器按钮的取值（`Fashion`/`BehindTheScene`/`Affair`/`Magazine`）与库中真实 `tag`（`Magazine 237 / Advertising 54 / STAGE 12 / STILL 9 / Telegram 3 / null 15`）不匹配，其中 3 个按钮会返回 0 条。这是**改造前就存在**的数据分类问题（旧逻辑在本地数组上过滤也会得到 0 条），非本次回归；且修改它属于调整产品分类体系，超出本阶段范围，故仅记录建议。

### B.4 P1 `/projects` 查询与分页

- **优化前的问题：** 列表 `select('*')`（25 列，含多处长文本 / i18n / 主题声明）；排序无稳定并列键；详情页 `select('*')`。
- **修改文件：** `app/projects/page.tsx`、`app/projects/[id]/page.tsx`、`app/projects/[id]/project-detail-client.tsx`。
- **修改方案：** 列表列投影收窄为 9 列并加 `.order('id', desc)` 稳定并列；详情页加 `export const revalidate = 300` 并改用 13 列的 `PROJECT_GALLERY_COLUMNS`；详情内页改用真实宽高 + `DETAIL_IMAGE_SIZES`、去掉 `unoptimized`、首 2 张 eager；stagger 上限 `Math.min(index, 6) * 0.05`。
- **修改后的行为：** 列表载荷下降；详情页 5 分钟 ISR 缓存，重复访问不打数据库。
- **性能对比：** `/projects` 列表 16.2 KB → 6.4 KB（−61%）。
- **费用变化：** 无（请求更少）。
- **无回归：** 25 个项目全部返回（生产只读验证：`rows=25 total=25`）；详情页 gallery 查询正常。

### B.5 P2 加载体验、动画与 i18n

- **优化前的问题：** `LoadingWrapper` 有约 3.7 秒**强制**延迟（`minDuration`），首页甚至传 `minDuration={2500}`；i18n 首屏闪烁（FOUC）；`html lang` 固定为 `en`；语言状态在首帧后才写入。
- **修改文件：** `components/loading/loading-wrapper.tsx`、`app/page.tsx`、`components/language-provider.tsx`、`app/layout.tsx`。
- **修改方案：**
  1. 强制延迟改为 `minDuration = 500ms`，并设硬上限 `MAX_SPLASH_MS = 1200ms`（单一定时器，0.4s 淡出）；首页移除 `minDuration={2500}`；
  2. `layout.tsx` 注入 **paint 前**内联脚本，从 `localStorage['lmsy-language']` 同步 `document.documentElement.lang`（消除 `lang` 错误与非英文首屏闪烁）；
  3. `language-provider` 用 `useIsomorphicLayoutEffect` 在挂载时同步 `documentElement.lang`。
- **修改后的行为：** 关键内容不再等待无意义的固定延迟；语言切换与首屏 lang 稳定。
- **性能对比：** 首屏可交互前的强制等待 **约 3.7s → ≤1.2s**（常见路径实际 ≈0.5s）。
- **费用变化：** 无。
- **无回归：** 未删除既有动画/交互；装饰性动画仅在时长与 stagger 上收敛。

### B.6 P2 loading / error 边界

- **优化前的问题：** 部分路由缺少 `loading.tsx` 与 `error.tsx`。
- **修改文件：** 新增 `app/loading.tsx`、`app/error.tsx`。
- **修改方案：** 路由级 loading 兜底（不引入动画库，避免额外包体）；`error.tsx` 为净化过的错误边界，提供 `reset()` 重试，**不输出任何堆栈或敏感信息**。
- **修改后的行为：** 路由切换/异常时有可理解的反馈，且不泄露内部信息。
- **性能对比：** 不适用（无回归）。
- **费用变化：** 无。

### B.7 P2 SEO 与技术质量

- **优化前的问题：**
  1. `metadataBase` 与 OG `url` 指向**已退役域名** `lookmheesonya-forever.com`；
  2. 全局 `alternates.canonical: '/'` **强制所有页面 canonical 指向首页**，且伪造了 `languages: {en:'/en',zh:'/zh',th:'/th'}`（这些语言路径并不存在）；
  3. 残留占位符 `verification.google: 'your-google-verification-code'`；
  4. `sitemap.ts` 使用退役域名、仅列 5 条路由、查询**不存在的 `members` 表**与**不存在的 `projects.updated_at`**，导致动态项目 URL 被静默丢弃；
  5. `robots.txt` 指向退役域名的 sitemap，未屏蔽 `/admin`、`/api`。
- **修改文件：** `app/layout.tsx`、`app/sitemap.ts`、`public/robots.txt`、新增 `lib/seo.ts` 与 4 个嵌套 `layout.tsx`（`app/gallery/`、`app/projects/`、`app/profiles/`、`app/schedule/`）。
- **修改方案：**
  1. `metadataBase` 改为 `NEXT_PUBLIC_SITE_URL || 'https://lmsy.space'`；OG `url` 改为 `'/'`（相对，随 metadataBase 解析）；
  2. **删除**全局 canonical 与伪造的 `languages`；为客户端组件页面（`gallery`/`projects`/`profiles`/`schedule`）通过嵌套 `layout.tsx` 各自设置**自指向 canonical**（经由 `lib/seo.ts` 的 `pageMetadata()`）；
  3. 删除占位 `verification`；
  4. `sitemap.ts`：改用真实域名；列 11 条真实静态路由；删掉不存在的 `members` 表与 `projects.updated_at`，改查 `projects.select('id, created_at')` 并用 try/catch 兜底；加 `revalidate = 3600`；
  5. `robots.txt`：`Sitemap: https://lmsy.space/sitemap.xml`；`Disallow: /admin`、`/api/`。
- **修改后的行为：** canonical 与页面实际内容一致（每页自指向，不再全指首页）；sitemap 与可访问页面一致（11 静态 + 25 项目详情）；管理页不被索引（`X-Robots-Tag: noindex` + `robots.txt`）。
- **性能对比：** sitemap 与若干页面由动态变为静态（见 B.0）。
- **费用变化：** 无。
- **无回归：** 未更改任何无关页面的 URL 结构；未为提高索引量生成空页面。
- **未验证项（被网络阻塞）：** `lmsy.space` 上 `/sitemap.xml`、`/robots.txt` 的线上实取，以及不存在页面的真实 404 状态码。本地构建已将 `/sitemap.xml` 生成为静态路由。

### B.8 P2 Service Worker

- **优化前的问题：** SW 的 fetch 处理器会拦截并缓存**所有**请求（包括带鉴权信息的 `/api/**` 与 `/admin/**`），且 `controllerchange` 会强制 `window.location.reload()`。
- **修改文件：** `public/sw.js`、`components/service-worker-provider.tsx`。
- **修改方案：** fetch 处理器跳过 `/api/` 与 `/admin/`（避免缓存携带鉴权的响应）；移除 `controllerchange → reload` 强制刷新。
- **修改后的行为：** SW 不再可能把私有/带鉴权响应缓存后提供给其他上下文；更新时不再强制整页刷新。
- **性能对比：** 不适用。**安全收益：** 消除跨用户缓存泄露的一条通道。
- **费用变化：** 无。

---

## C. 测试报告

### C.1 实际执行的命令与结果

| 命令 | 结果 |
|---|---|
| `npm run typecheck`（`tsc --noEmit`） | **通过，0 错误** |
| `npm test` | **31 / 31 通过**（6 个 suite，0 失败，≈1.0s） |
| `npm run build`（`next build`，Turbopack） | **成功**：`✓ Compiled successfully`，静态生成 **73/73**，exit 0 |
| `node scripts/security-smoke-test.mjs --base http://localhost:3000` | **51 / 51 通过** |
| `npm run backup:db` | 9 表 / 432 行，核验通过 |
| `npm run backup:r2` | 408 / 408，159,141,333 B，0 失败 |
| `npm run backup:r2:offsite` | **ok: true**（408 / 408，0 缺失，0 size 不符） |
| `npm run restore:drill` | **PASSED**（432 行；118 R2 引用 ok；18 个 draft 前缀资产在位） |

> **构建的两次形态说明：** 直接 `npm run build` 在本机会因经代理访问 `fonts.googleapis.com` 被阻断而在 `next/font` 阶段失败；**绕过代理**（`env -u http_proxy -u https_proxy ... npm run build`）即成功。这是本机网络限制，与代码无关。构建日志见 `temp/build-phase2-final.log`（该目录被 gitignore）。

### C.2 类型检查
`tsc --noEmit` 通过，0 错误。过程中曾修复两处类型问题：尺寸表导入路径（`@/generated/...` → `@/lib/generated/...`），以及列投影后 Supabase 返回类型与本地 `GalleryItem`/`Project` 的差异（改用 `as unknown as` 断言，并为灯箱所需字段补入 `GALLERY_COLUMNS`）。

### C.3 单元测试
`npm test` → 31/31。覆盖目录竞态识别、file_hash 索引与 catalog 索引的区分、catalog id 格式、重试预算上限等。

### C.4 安全回归（本地同代码，真实 HTTP）
`security-smoke-test.mjs` **51 / 51 通过**，逐类：

| 组 | 内容 | 结果 |
|---|---|---|
| [1] | 28 个管理端点未认证调用 | 全部 `401` |
| [2] | 已删除的 diagnose 端点 | `404` 且**无** `rawError`/`R2_*`/`SUPABASE_SERVICE_ROLE_KEY` 等字段泄露 |
| [3] | 伪造 Bearer / `Bearer undefined` | `401` |
| [4] | Telegram secret：缺失 / 错误 / 正确 | `401` / `401` / `200`（空 payload 无副作用） |
| [5] | ingest / cron 机器密钥：缺失、错误、`secret=undefined`、`Bearer undefined` | 全部 `401` |
| [6] | 登录限流 | 第 11 次失败后 `429` |
| [7] | 公开端点（session、portals、milestones、site-content、search、/gallery、/projects） | 全部 `200` |

补充：对生产数据层用 **anon key** 的只读探测确认 anon **无任何 INSERT 权限**（4 表均 `401/42501`）。

### C.5 页面回归
本地构建产物的路由表：6 个页面由 `ƒ` 动态转为 `○` 静态（`/gallery`、`/projects`、`/profiles`、`/schedule`、`/chronicle` [5m]、`/sitemap.xml` [1h]）；其余动态路由（含全部 `/api/**`、`/projects/[id]`、`/profiles/[id]`、`/editorial/[id]`）保持动态。本地服务器对 `/`、`/gallery`、`/projects` 等公开页返回 `200`。

### C.6 性能指标
见 B.0。关键：`/gallery` 首屏查询 252 KB → 21.4 KB；`/projects` 16.2 KB → 6.4 KB；单页 60 张图 24.29 MB → 2.29 MB；`html lang` 与加载延迟改善（≈3.7s → ≤1.2s）。未使用 Lighthouse（本机无法访问外网以取得稳定基准；且生产站点不可达），改用**可复现的本地快照测量**（脚本与数据路径已在 B.0 记录），避免把单次波动当结论。

### C.7 分页与查询（对生产只读验证）
`temp/verify-pagination.mjs`（anon key，与浏览器一致）：

```
page1 HTTP 206 rows=60
page2 HTTP 206 rows=60
page3 HTTP 206 rows=60
total (from content-range): 330
overlap p1/p2=0  p2/p3=0  p1/p3=0
distinct across 3 pages: 180 (expected 180)
page1 order stable on refetch: true
last page (300-359) HTTP 206 rows=30 (expected 30 for 330 total)
```

`temp/verify-queries.mjs`（anon key，只读）：收窄列查询 `206 rows=60 total=330`，键正好是 12 个投影列；`tag=eq.Magazine` `206 rows=60 total=237`；`projects` 收窄查询 `200 rows=25`；`projects?select=id,created_at` `200 rows=25`（sitemap 用）。

### C.8 未通过的测试及原因
- **生产 HTTP 冒烟测试、生产页面回归、生产 Telegram/管理员登录**：**未执行**，原因见开头「网络限制」（`lmsy.space` / `*.vercel.app` / `api.telegram.org` 均 `000`）。已用本地同代码 + 生产数据层只读探测替代，但**不能**据此判定生产 HTTP 行为。
- **`next build` 直连形态**：在本机因 `fonts.googleapis.com` 经代理不可达而失败；绕过代理后成功。非代码问题。

---

## D. 数据与安全保护

| 问题 | 结论 |
|---|---|
| 是否删除或修改生产数据？ | **否**。全程对生产库只做只读探测（SELECT / count / 列存在性）；未执行任何 INSERT/UPDATE/DELETE。唯一写入方是本次新增的 **R2 异地备份**（写入的是**第二个备份桶**，非源桶）。 |
| 是否修改 R2 对象？ | **源桶 `lmsy-archive` 未改动**（无删除、无覆盖、无移动、无重命名）。只向 `lmsy-archive-backup` 复制。未删除任何「未被引用」的对象。 |
| 是否改变 draft 流程？ | **否**。草稿仍先进 `draft_items`、由管理员审核后发布。`/api/webhooks/telegram` 与发布相关路由未改动业务逻辑。 |
| 是否改变数据库关联？ | **否**。未改 schema、未改外键、未重排任何编号。三个迁移**尚未应用**。 |
| 是否完成备份核验？ | **是**。数据库逻辑备份、R2 全量镜像、异地桶副本、恢复演练均已执行并核对。平台原生备份/PITR 状态需管理员核实（A.6）。 |
| 是否把备份/密钥加入 Git？ | **否**。`.gitignore` 覆盖 `backups/`、`temp/`、`reports/`、`.env*`、`.workbuddy/`。已对 diff 做密钥扫描（`sk-`/`secret`/`token`/`password`/`service_role`/JWT 形态），**未发现敏感值**。报告与本文不含任何密钥值。 |
| 是否发现新的安全问题？ | **是，一处并已定位：** anon 可读 `draft_items`（含未发布真实行）。已有迁移 `20261015_phase1_rls_hardening.sql` 修复，**待应用**。另确认 anon 写权限已正确撤销（无新暴露面）。 |
| 是否把私有数据缓存给其他用户？ | **否**。`/api/**` 与 `/admin/**` 均 `no-store`；SW 已跳过 `/api/`、`/admin/`；`/admin/**` 加 `noindex`。 |
| 是否因分页/缓存/查询改造导致数据遗漏？ | **否**。分页对生产验证：0 重叠、3 页 180 条互异、排序稳定、末页数正确。 |

---

## E. Git 与部署记录

- **分支：** `main`
- **基线：** `f9b0627`（第一阶段最后提交）
- **本次提交：** `b2813ee` —— `Add phase 2 performance work: cache policy, images, pagination, SEO`（34 个文件，+1321 / −296）
- **推送：** **成功** —— `f9b0627..b2813ee  main -> main`（HTTPS，未强推、未重置、未丢弃任何他人提交）
- **Vercel 部署：** **成功** —— GitHub deployments API 显示 Production 环境、`sha = b2813ee…`、创建于 `2026-10-15T14:38:06Z`；commit status 为 `state: success`、`"Deployment has completed"`。（Vercel 控制台页面本身在本机不可达，但这两个 GitHub API 可达，故用它核验。Vercel 的构建不受本机代理问题影响，`next/font` 拉取 Google 字体在 Vercel 侧正常。）
- **生产验证结果：** 受网络限制**无法在本机执行**（`lmsy.space` 返回 `000`），见 F.4。需在能访问 `https://lmsy.space` 的环境补做 `security-smoke-test --base https://lmsy.space` 与页面回归。

---

## F. 未完成事项

### F.1 需要管理员手动操作（在能访问相应平台的环境执行）
1. 在 Vercel Production 配置 `ADMIN_EMAIL` / `TELEGRAM_WEBHOOK_SECRET` / `CRON_SECRET` / `INGEST_API_KEY` 并 Redeploy。
2. 配置好 secret 后重新注册 Telegram Webhook（`scripts/setup-telegram-webhook.ts`），并验证合法消息入库、伪造请求被拒。
3. 在能访问 `https://lmsy.space` 的环境执行 `node scripts/security-smoke-test.mjs --base https://lmsy.space`，并做生产页面回归（首页 / `/projects` / `/projects/[id]` / `/gallery` / 图片加载 / 管理员登录退出 / 草稿审核 / 上传 / 发布 / Telegram 采集 / 公开 API / 404）。
4. 在 Supabase Dashboard 核实备份/PITR 状态并回填 A.6 那一行。
5. 决定是否需要跨账号 / 跨厂商的第三份 R2 副本；可选择启用 R2 对象版本控制。

### F.2 需要生产权限
- 应用三个数据库迁移（`baseline` / `data_integrity` / `rls_hardening`）——**前提条件已全部验证满足，只缺数据库访问**。这就是用户选择的「你提供数据库访问，我来执行迁移」路径。**其中 `rls_hardening` 优先**，因为它修复的是已确认的 anon 可读 `draft_items` 暴露。

### F.3 需要平台功能或额外费用
- Supabase PITR（付费套餐）与原生 Postgres 恢复验证（PITR 或第二个 Supabase 项目）。
- R2 对象版本控制（能力可用，是否启用由管理员决定）。
- 跨厂商第三份对象副本（当前异地桶与源桶同账号，非完整灾难恢复边界）。

### F.4 当前无法安全执行
- 生产 HTTP 层安全冒烟测试、生产管理员登录端到端、生产 Telegram 采集端到端、生产 sitemap/robots/404 实测——均因本机无法访问 `lmsy.space` / Vercel / Telegram API 而阻塞。**已用「本地同代码 + 生产数据层只读探测」拿到可用的替代证据，但不等同于生产验证。**

### F.5 已发现但属于第三阶段（或需产品决策）的问题
- **`/gallery` 标签过滤取值不匹配**：`*_i18n` 按钮值（`Fashion`/`BehindTheScene`/`Affair`/`Magazine`）与库中真实 `tag`（`Magazine 237 / Advertising 54 / STAGE 12 / STILL 9 / Telegram 3 / null 15`）不符，3 个按钮返回 0 条。**改造前即如此**（非本次回归）；修正涉及产品分类体系决策。
- **`app/profiles/[id]` 查询不存在的 `members` 表**：该路由的数据源在生产库不存在（库中 `profiles` 表存在，`members` 不存在）。`profiles/[id]` 目前为 `ƒ` 动态路由。属既有问题，需确认正确的数据源后修复。
- **`rotation` 全为 0**（330 行）：`getImageDimensions(url, rotation)` 的旋转逻辑当前是「死代码」，但保留以便未来数据启用。
- **`category_tag` 全为 NULL**（330 行）：`/projects/[id]` 的分类页签会显示同一集合。
- **`blur_data` 全空**（330 行）：当前未使用 blur 占位；可为未来 CLS/首屏优化补齐。
- **公开 API 仍有 `select('*')`**（`/api/search`、`/api/whispers`、`/api/project-gallery`）：本次未改动（超出 `/gallery`、`/projects` 列表与详情页范围），建议后续按同样方式收窄列投影。
- **`gallery` 遗留表为空（0 行）** 且代码已切换到 `gallery_assets`：属既有架构状态，未在本次处理。
