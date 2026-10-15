# LMSY.space 全量技术审计报告

**审计日期：** 2026-10-15
**审计范围：** 本地仓库 C:/Users/15755/WorkBuddy/lmsy.space（main @ a130ea2）+ 生产 Supabase / R2 只读核验
**审计方式：** 代码逐文件审查 + 生产数据库/存储只读对账 + 本地构建验证。未修改任何生产数据、R2 对象、管理员账号或环境配置。

---

## 一、项目现状报告（实际架构）

### 1.1 系统组成（以实际代码为准）

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | Next.js 16.1.1 (App Router) + React 19 + Tailwind v4 + Framer Motion | 混合渲染：首页/gallery/projects 为客户端组件，profiles/[id]、projects/[id]、editorial/[id]、chronicle 为服务端组件 |
| 数据库 | Supabase (PostgreSQL)，schema `lmsy_archive` | 全部业务表在该自定义 schema（不在 public） |
| 对象存储 | Cloudflare R2（bucket `lmsy-archive`），CDN `cdn.lmsy.space` | 408 个对象 / 151.8 MB |
| 部署 | Vercel（vercel.json 含每日 cron） | |
| 采集入口 | ① Telegram Bot webhook ② `/api/ingest` API ③ RSS cron（已停用）④ 管理后台上传 | **浏览器扩展源码不在本仓库（已确认缺失）** |
| 审核发布 | /admin 后台：drafts（草稿）→ publish / to-gallery → gallery_assets | |

### 1.2 数据流

```
采集层                     处理层                        存储层              展示层
─────────                 ─────────                    ─────────          ─────────
Telegram webhook ──┐
/api/ingest ───────┼─→ 下载(SHA256) → 传 R2 draft/ → 写 draft_items → AI翻译 → /admin/drafts 人工审核
RSS cron(停用) ────┘                                        │
                                                            ├─ publish（仅改状态）
                                                            └─ to-gallery（复制到 gallery_assets）→ 前台 /gallery
后台上传通道：/api/admin/r2/sign(预签名直传) 或 /api/admin/upload(服务端转WebP)
             → magazines/{year}/LMSY-{CAT}-{YYYYMMDD}-{NNN}.webp → gallery 表（遗留，已空）
```

### 1.3 生产数据现状（只读核验，2026-10-15）

| 表（lmsy_archive） | 行数 | 状态 |
|---|---|---|
| draft_items | 71 | 65 条 draft/ready + 6 条 published/ready；无重复 file_hash；全部有 R2 链接 |
| gallery_assets | 18 | **全部指向 `draft/` 前缀的 R2 路径；catalog_id 0/18 有值** |
| projects | 25 | 24 个有封面 |
| site_content_blocks | 4 | 正常 |
| chronicle_events | 0 | 空 |
| admin_users | **0** | 空——依赖 admin_users 的路由实际全靠邮箱兜底 |
| gallery（遗留表） | 0 | 空表 |
| members / schedule / messages / music | **不存在** | schema.sql 里的表未建或已删，相关功能实际失效（见 P1-9） |

R2：408 对象 = magazines/ 332 个（145.3MB）+ draft/ 76 个（6.5MB）。
**DB↔R2 对账：断链 0（所有记录都有对应文件）；孤儿对象 320 个 = magazines/ 315 个（139.3MB，不被任何记录引用）+ draft/ 5 个。**

---

## 二、全量功能审计表

| 功能 | 状态 | 说明 |
|---|---|---|
| 前台首页 | ✅ 已实现，有缺陷 | 全客户端渲染，强制 2.5s 开场动画（page.tsx LoadingWrapper minDuration=2500） |
| /gallery 图库 | ✅ 已实现，设计需优化 | 客户端全表拉取无分页；图片 unoptimized 原图直出 |
| /projects 作品 | ✅ 已实现，设计需优化 | 同上，客户端全表拉取 |
| /profiles | ⚠️ 部分实现 | [id] 动态页依赖的 **members 表在数据库中不存在**；/profiles/lookmhee、/sonya 为硬编码假数据页（含 PORTRAIT_PLACEHOLDER 占位符、假 Spotify 链接） |
| /chronicle 编年史 | ⚠️ 部分实现 | 服务端查 draft_items（把草稿表当时间线数据源，职责混淆）；chronicle_events 表存在但为空 |
| /editorial 专栏 | ✅ 已实现 | MDX + DB 双轨 |
| /exhibitions /whispers /resonance | ✅ 已实现 | 静态/轻数据，无大问题 |
| /schedule 日程 | ⚠️ 疑似废弃 | 纯静态，schedule 表不存在 |
| 全局搜索 | ⚠️ 失效风险 | /api/search 查 members/schedule 等不存在的表 |
| 管理后台登录 | ✅ 已实现（密码已重置恢复） | 无速率限制、无失败锁定 |
| 管理后台各功能页 | ✅ 已实现 | UI 完整（drafts/gallery/projects/settings/upload/messages/chronicle/editorial/diagnose） |
| 图片上传（后台） | ✅ 已实现，有缺陷 | 双通道（预签名直传 + 服务端转码）；失败回滚仅 register 路径有 |
| 草稿→发布流 | ⚠️ 已实现，缺陷严重 | 功能可用但 **API 全部无鉴权**；publish 无前置校验 |
| Telegram 采集 | ⚠️ 已实现，缺陷严重 | 管道可用但 webhook 无来源校验 |
| /api/ingest 采集 | ✅ 已实现，有缺陷 | 有 file_hash 去重和 50MB 限制；失败处理粗糙 |
| RSS cron 采集 | ❌ 实际停用 | 所有源 enabled:false，每日空转 |
| 去重 | ⚠️ 部分实现 | 仅覆盖 draft_items（file_hash 唯一索引）；gallery_assets 无 hash 列 |
| 孤儿清理/对账 | ⚠️ 部分实现 | integrity/reconcile 只覆盖 magazines/ 命名文件，draft/ 完全没对账 |
| AI 翻译 | ✅ 已实现，有缺陷 | 同步阻塞、失败无重试、接口无鉴权（可被刷账单） |
| SEO 基础 | ⚠️ 有明显问题 | sitemap 与路由不匹配、canonical 全指向首页、hreflang 指向不存在的路由 |
| PWA | ✅ 已实现 | SW 强刷会打断浏览；manifest 背景色与主题不符 |
| i18n (EN/ZH/TH) | ✅ 已实现，有缺陷 | 纯客户端切换有闪变；URL 无语言维度 |

---

## 三、问题与风险清单

> 严重度定义：P0=必须立即处理；P1=明显影响使用/数据/维护；P2=有实际收益的优化；P3=可延后。
> 标注：**[A]**=已确认；**[D]**=需进一步验证。

### P0（安全漏洞 + 核心体验失效）

| # | 模块 | 问题 | 证据 | 影响 |
|---|---|---|---|---|
| P0-1 | Admin API | **41 个 admin 路由中 17 个完全无鉴权**，且全部使用 service_role（绕过 RLS）。包括：drafts 全部 11 个端点（列表/改/删/发布/批量发布/seed）、reprocess、translate（付费 AI 可被刷）、stats、diagnose/db（泄露错误堆栈）、diagnose/r2（代码注释自认"认证临时禁用"）、gallery/milestone | `app/api/admin/drafts/route.ts:13,71`；`drafts/[id]/publish/route.ts:12-38`；`drafts/seed/route.ts:11-41`；`reprocess/route.ts:23`；`translate/route.ts:17`；`diagnose/r2/route.ts:6` | **[A]** 任何匿名用户可读/改/删全部草稿、发布内容、删除 R2 文件、消耗 AI 翻译费用。线上验证：`GET /api/admin/drafts/stats` 无凭据可访问（本机网络无法复测线上，代码证据确凿） |
| P0-2 | Telegram 采集 | webhook 无任何来源校验：不检查 `X-Telegram-Bot-Api-Secret-Token` 头，setWebhook 也未设置 secret_token | `app/api/webhooks/telegram/route.ts:183-196`；`scripts/setup-telegram-webhook.ts:60-65` | **[A]** 任何人可伪造 update 注入垃圾草稿、刷 AI 翻译费用、滥用 R2 存储 |
| P0-3 | 性能 | next.config.ts 对**全站所有路径**（含 `_next/static` 静态资源）设置 `no-store, no-cache`——浏览器和 CDN 完全不缓存，每次访问全量重新下载 JS/CSS | `next.config.ts:24-34` | **[A]** 全站加载速度的最大单点问题，与"图片加载慢"感受直接相关 |
| P0-4 | 性能 | 全站内容图片 `unoptimized` + `width={0} height={0}`：绕过 Next 图片优化（无缩略图/无 srcset/WebP 转码），手机也直出 R2 原图（实测最大 4.3MB/张），且无宽高比声明导致布局抖动 | `app/gallery/page.tsx:181-187`、`app/editorial/[id]/gallery-image.tsx:55-61`、`project-detail-client.tsx:410-415`、`gallery-canvas.tsx:178-180` 等；R2 实测 magazines/2024 多个文件 2-4.3MB | **[A]** 图片加载慢的直接原因 |

### P1（数据正确性 / 明显缺陷）

| # | 模块 | 问题 | 证据 |
|---|---|---|---|
| P1-1 | 数据库 | **迁移与线上 schema 漂移**：`source_platform='telegram'` 不在迁移文件的 CHECK 约束里，但线上已有 30 条 telegram 记录——约束曾被库外手工修改 | 迁移 `20250223_create_draft_items.sql:14` vs 线上数据实测 |
| P1-2 | 数据一致性 | **已发布的 18 条 gallery_assets 全部指向 `draft/` 前缀路径**、catalog_id 全空；发布流程不迁移 R2 key。若将来清理 draft/ 前缀（认为是临时文件），**全部已发布图片会断链** | 线上数据实测 + `drafts/[id]/publish/route.ts:22-38` |
| P1-3 | 采集管道 | R2 上传与 DB 写入无原子性：先上传 R2 再查重，命中重复/写库失败不清理 → 线上已积累 **320 个孤儿对象（139.3MB）**；仅 upload/register 一条路径有回滚 | `app/api/ingest/route.ts:165-244`、`telegram/route.ts:266-339`；线上对账实测 |
| P1-4 | 数据库 | **members/schedule/messages/music 四表在数据库中不存在**（schema.sql 未完整应用），依赖它们的 profiles 动态页、全局搜索、留言板、音乐功能实际失效或空转 | 线上 404 实测（两个 schema 均查） |
| P1-5 | 安全 | RLS 过松：多数表 authenticated 写策略为 `USING(true)`；`GRANT ALL ON ALL TABLES TO authenticated`（20250110 迁移）；默认特权对未来新表对 anon 开放 SELECT。若 Supabase 开放自助注册，任意注册用户可写业务表 | `supabase/schema.sql:105-143`、`20250110_fix_permissions_patch.sql:13,23`、`scripts/fix-rls-permissions.sql:13-20` |
| P1-6 | 认证 | 登录无应用层速率限制/失败锁定；管理员邮箱经 `NEXT_PUBLIC_ADMIN_EMAIL` 打包进浏览器 JS 公开；JWT 同时存 localStorage（扩大 XSS 面）；无 middleware.ts（/admin 页面保护纯客户端） | `app/api/auth/login/route.ts:98-103`、`lib/admin.ts:13`、`app/admin/layout.tsx:26-30` |
| P1-7 | 数据一致性 | 315 个 magazines/ 历史图片（139.3MB，含 2024-2025 全部杂志扫描件）**不被任何数据库记录引用**——历史内容未迁移到现行 gallery_assets 体系，站点实际展示内容远少于存储内容 | 线上对账实测 |
| P1-8 | 采集管道 | catalog_id 生成是"先查 max 再 +1"，无锁：并发上传会同号互踩，R2 同路径静默覆盖后 insert 失败 | `lib/catalog-id.ts:121-151`、`upload/route.ts:115-177` |
| P1-9 | 采集管道 | 下载失败静默创建无媒体空草稿（无 file_hash 不去重）；同一失败 URL 反复提交会堆积空草稿 | `app/api/ingest/route.ts:209-244` |
| P1-10 | 采集管道 | cron 鉴权在 CRON_SECRET 未设置时可被字面量 `Bearer undefined` 绕过 | `cron/fetch-updates/route.ts:352,503` |
| P1-11 | 备份 | **无任何备份机制**：Supabase 无导出/PITR 证据；R2 无版本化/异地备份；315 个未引用文件是其历史内容的唯一副本。代码(GitHub)、数据库、图片三者备份状况必须分开评估——目前只有代码有备份 | 无备份相关配置/脚本（全仓检索） |

### P2（值得优化的缺陷）

| # | 问题 | 证据 |
|---|---|---|
| P2-1 | /gallery、/projects 客户端全表拉取无分页（含 curator_note 等长文本全列），数据量增长后必劣化，且首屏依赖 JS | `app/gallery/page.tsx:37-41`、`app/projects/page.tsx:56-59` |
| P2-2 | SEO：所有页面 canonical 继承根 layout 指向 `/`；hreflang 指向不存在的 /en /zh /th；sitemap 缺 editorial/chronicle/exhibitions 等核心路由、lastModified 恒为当前时间；robots.txt 未屏蔽 /api /admin /test-supabase | `app/layout.tsx:42-49`、`app/sitemap.ts:5-61`、`public/robots.txt` |
| P2-3 | 生产暴露调试页面：/test-supabase（输出连接信息、会被搜索引擎收录）；/not-found 路由返回 HTTP 200 的假 404 页 | `app/test-supabase/page.tsx`、`app/not-found/page.tsx` |
| P2-4 | Telegram bot token 进服务器日志（262 行打印含 token 的文件 URL）；ingest/cron 的 token 比较非常量时间；cron 接受 URL 查询参数传密（进访问日志） | `telegram/route.ts:262,125`、`ingest/route.ts:42-47`、`cron/fetch-updates/route.ts:350` |
| P2-5 | 上传无服务端大小上限（仅前端校验）；file-validator 白名单含 SVG（XSS 载体，靠服务端转 WebP 间接缓解） | `app/api/admin/upload/route.ts:43`、`lib/security/file-validator.ts:9,17` |
| P2-6 | 弱密钥：CRON_SECRET/INGEST_API_KEY 为可猜测试值；密码重置脚本用 Math.random 且明文打印密码 | `.env.local`、`scripts/reset-admin-password.ts:96,143` |
| P2-7 | check-duplicate 去重接口全桶列举 R2 且仅按文件大小粗判，批量场景不可用 | `app/api/admin/check-duplicate/route.ts:44-87` |
| P2-8 | 发布无前置校验（不查 ingestion_stage/媒体是否存在）；翻译同步阻塞、失败无重试可永久卡住 | `drafts/[id]/publish/route.ts:22-30`、`ingest/route.ts:292-334` |
| P2-9 | i18n 闪变（FOUC）；`<html lang>` 固定 en；SW 部署后强制 reload 打断浏览；manifest 背景色与暗色主题不符 | `language-provider.tsx:27-39`、`service-worker-provider.tsx:59-64`、`public/manifest.json:8` |
| P2-10 | 大量生产 console.log（每次图片 URL 构造、每个 gallery item 渲染都打日志）；blur_data 存了但从未用作 blur placeholder | `lib/image-url.ts:47-54`、`app/gallery/page.tsx:172-176,185` |
| P2-11 | /profiles/lookmhee、/sonya 硬编码假数据页与动态路由重叠（占位符 PORTRAIT_PLACEHOLDER、假音乐链接直接暴露给访客） | `app/profiles/lookmhee/page.tsx:127,420-424` |
| P2-12 | 无任何 error.tsx / loading.tsx：运行时错误直接撞 Next 默认错误页 | 全仓 glob 0 结果 |

### P3（可延后）

- 三套图片编号标准文档互相矛盾（`lib/archive-number.ts` 死代码 vs `lib/catalog-id.ts` vs `docs/BATCH_UPLOAD_GUIDE.md`）
- `temp/` 目录 9 个调试脚本、`app/admin/drafts/page-old.tsx`、`app/not-found/page.tsx` 等垃圾文件已提交进仓库
- `PROJECT_SNAPSHOT.md`、`README.md` 与实际严重脱节（还写着 Next 14、members 表等）
- checksum.calculateMD5 是假实现（32 位哈希凑数），generateFingerprint 只采样前后 100 字节
- `app/admin/drafts/constants.ts` 的 'ready' 状态与 DB CHECK 枚举语义漂移
- framer-motion 约 96 文件导入 + 首页无限循环动画，低端设备 CPU 负担大
- 依赖 deprecation 警告若干（workbox、@supabase/auth-helpers-nextjs 已停止维护）

---

## 四、架构评估报告

**应保持不变：**
1. Next.js 16 + Vercel + Supabase + R2 整体栈——规模匹配，无需更换
2. `lmsy_archive` 自定义 schema + SSR cookie 会话 + admin_users 表模式（messages/magazine 路由的三重校验是全项目正确范本）
3. file_hash 唯一索引去重思路（方向正确，需补齐覆盖面）
4. i18n 客户端方案（对这种规模的内容站够用，不必上路由级 i18n）
5. MDX 专栏体系

**值得局部优化：**
1. 统一认证门禁（抽 `requireAdmin()` helper）+ 增加 middleware.ts
2. 图片管线：启用 next/image 优化 + 生成缩略图变体 + 缓存头策略
3. 前台数据获取：gallery/projects 改服务端渲染 + 分页
4. 采集管道的失败处理与孤儿对账（扩展现有 integrity/reconcile 而非重写）
5. 数据模型微调：给 gallery_assets 加 file_hash 列；统一"发布"语义（迁移 R2 key）

**暂不需要动：**
- 数据模型整体（加音乐/视频索引时按现有 projects.music 先例扩展即可）
- 不需要引入队列服务（Redis 等）——当前量级用 Vercel Cron + 状态字段重试即可
- 不需要重构 i18n 或替换 UI 组件体系

**技术债务 Top3：** 未鉴权 API 群（P0-1）、迁移与库结构漂移（P1-1/P1-4）、双轨存储模型（draft_items vs gallery，发布不迁移文件）

---

## 五、分批整改计划

### 第一批：P0 安全修复（最优先，改动小、收益大）
- **任务：** ① 新建 `lib/require-admin.ts`（复用 getAuthenticatedUser + 邮箱 + admin_users 三重校验），给 17 个未保护路由加门禁 ② 删除 drafts/seed、diagnose/db、diagnose/r2 调试端点 ③ Telegram webhook 加 secret_token 校验（setup 脚本 + webhook 各一行）④ 新建 middleware.ts 保护 /admin 与 /api/admin
- **验收：** 未登录 curl 全部 41 个 admin 路由返回 401；webhook 无 secret 头返回 401；构建通过
- **回归风险：** 低——后台登录后功能应不受影响；需回归测试后台各页面
- **依赖：** 无

### 第二批：数据完整性与备份
- **任务：** ① 补迁移：把线上手工改动固化进迁移文件（telegram 枚举等） ② 建立 Supabase 备份（Dashboard 开 PITR 或定期 pg_dump）+ R2 生命周期/版本化评估 ③ 决策 315 个孤儿杂志图：写迁移脚本入库 or 归档标记 ④ 发布流程迁移 R2 key（draft/ → 正式路径）或最低限度保证引用不断链 ⑤ 上传失败回滚推广到全部路径
- **验收：** 备份可恢复演练一次；对账脚本显示 0 孤儿或孤儿均有标记
- **回归风险：** 中——迁移 R2 key 需同步改 DB 引用，必须先备份再动
- **依赖：** 第一批（避免带洞操作生产）

### 第三批：图片加载性能（用户最直接的感受）
- **任务：** ① 移除 next.config.ts 全局 no-store，改为：`/_next/static` immutable 一年、HTML 短缓存、API no-store ② 去掉 unoptimized，走 next/image 优化（cdn.lmsy.space 已在 remotePatterns）或建 R2 缩略图变体 ③ 所有 width/height=0 换真实尺寸/aspect-ratio ④ 启用 blur_data 占位 ⑤ gallery/projects 改服务端渲染 + 分页 ⑥ 删强制 2.5s 开场动画
- **验收：** Lighthouse 图片项显著改善；首屏请求数/传输量对比报告；无布局抖动
- **回归风险：** 中——缓存策略变化需观察线上；图片优化会增加 Vercel 图片优化用量（费用影响需确认）
- **依赖：** 无（可与第二批并行）

### 第四批：批量采集准备
- **任务：** ① 去重改造为"哈希先行"（先算 hash 查重再上传）② gallery_assets 加 file_hash ③ 失败重试机制（扫描 failed/卡住记录的 cron）④ 孤儿对账脚本覆盖全部前缀 ⑤ /api/ingest 批量接口（类型已定义未实现）⑥ catalog_id 改用 DB 序列原子发号
- **验收：** 模拟批量提交 100 张（含重复）零孤儿、零重复入库
- **依赖：** 第一、二批

### 第五批：体验与代码卫生
- 补 error.tsx/loading.tsx；i18n 闪变修复；清理 temp/、page-old.tsx、假数据 profiles 页决策；更新 README/PROJECT_SNAPSHOT；SEO 修正（canonical/sitemap/robots/hreflang）；移除调试页面；日志清理

---

## 六、批量图片采集准备度评估

目标流程：**采集 → 下载 → 去重 → 上传 → 元数据入库 → 待审核 → 人工确认 → 发布**

| 环节 | 现状 | 缺口 |
|---|---|---|
| 采集 | Telegram ✅ / ingest API ✅ / 扩展 ❌不在仓库 / RSS 已停用 | 扩展源码缺失（无法维护）；webhook 无鉴权（P0-2） |
| 下载 | ✅ 50MB 上限、60s 超时 | 无重试；失败静默产空草稿（P1-9） |
| 去重 | ⚠️ 仅 draft_items 有 file_hash 唯一索引 | 顺序错误（先传 R2 再查重→孤儿）；gallery 无 hash 列；source_url 无唯一约束；check-duplicate 接口不可用 |
| 上传 | ✅ 直传+中转双通道 | 无原子性；catalog_id 并发竞态（P1-8） |
| 元数据入库 | ✅ 基本可用 | 非原子；schema 漂移 |
| 待审核队列 | ✅ draft_items + /admin/drafts 完整 | API 无鉴权（P0-1）；无批量去重前置 |
| 人工确认 | ✅ 批量编辑/发布 UI 已有 | publish 无前置校验（P2-8） |
| 发布 | ⚠️ 可用 | 不迁移 R2 文件、双轨模型割裂（P1-2） |

**结论：** 架构可以支撑批量采集，不需要推翻。最少需要补齐：① 全部 P0 鉴权修复（否则批量入口=批量攻击面）② 哈希先行去重 ③ 失败重试与孤儿对账 ④ 批量接口。预计在第一、二批完成后即可开工。

---

## 七、验证结果

| 检查项 | 结果 |
|---|---|
| `npm run build` 生产构建 | ✅ 通过（3m38s，全部 57 路由编译成功） |
| 生产 DB 只读核验（表/行数/字段/去重状态） | ✅ 完成（详见 1.3） |
| R2 只读对账（408 对象 vs 88 引用） | ✅ 完成：断链 0、孤儿 320 |
| 线上站点连通性 | ⚠️ **无法验证**——lmsy.space DNS 正常解析到 Vercel（216.198.79.1）但本机连接超时，vercel.app 同样超时而 GitHub 正常，符合国内网络访问 Vercel 被阻断的特征。**站点是否存活需通过代理/海外网络确认** |
| 未授权 API 线上复测 | ⚠️ 同上受阻，P0-1 结论基于代码证据（确凿），未做线上利用测试 |
| 代码审计覆盖 | 41 个 admin 路由全部逐一核查；采集/认证/前台三线并行深审 |
| 浏览器扩展源码 | ❌ 确认不在本仓库（无 manifest_version/chrome.* 痕迹，docs/BATCH_UPLOAD_GUIDE.md 讲的是后台批量编辑器） |

---

## 八、最终结论

**1. 网站是否具备继续维护的基础？**
**具备。** 构建通过、核心功能链路完整、数据无断链、去重设计方向正确、密钥未泄漏到 git。7 个月未维护没有造成结构性腐化。

**2. 是否存在必须立即处理的问题？**
**有，且严重：17 个管理 API 完全无鉴权 + Telegram webhook 无来源校验（P0-1/P0-2）。** 当前任何互联网用户都可以读写你的草稿箱、发布/删除内容、刷你的 AI 翻译费用。这是上线以来一直存在的洞，建议本周内完成第一批修复。另：315 张历史杂志图片（139MB）是唯一副本且无备份，有丢失风险。

**3. 最值得优先实施的 3-5 项优化：**
① P0 鉴权修复（第一批） ② 备份体系建立（代码外的数据库+图片备份，第二批） ③ 移除全局 no-store + 图片优化管线（第三批，直接解决"图片加载慢"） ④ schema 漂移固化 + 孤儿图片归档决策（第二批） ⑤ 发布流程 R2 key 迁移（第四批前置）

**4. 哪些模块应保持现状？**
技术栈选型、lmsy_archive schema、admin_users 认证模式、file_hash 去重索引、MDX 专栏、i18n 方案、draft→publish 工作流骨架。

**5. 哪些优化可以延后？**
音乐/视频索引扩展、i18n 路由化、队列服务引入、framer-motion 瘦身、文档重写（第五批及以后）。

**6. 开始批量采集前必须先解决：**
第一批全部（鉴权）+ 哈希先行去重 + 失败重试 + 孤儿对账。安全债不还清，批量入口就是批量攻击面。

---

*本报告仅包含经代码与只读核验证实的问题；无法从本机验证的事项（线上连通性、Supabase 备份配置）已明确标注。所有 P0/P1 修复均未实施，等待审阅授权。*
