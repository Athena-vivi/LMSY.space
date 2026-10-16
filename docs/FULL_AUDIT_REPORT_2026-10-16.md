# LMSY.space 全量技术审计与优化评估报告

- **日期：** 2026-10-16（本报告所有「本次实测」均指 2026-10-16 当天执行）
- **仓库：** `Athena-vivi/LMSY.space`（公开）　**分支：** `main`　**HEAD：** `038cd27`（工作区干净）
- **审计性质：** 只读审计 + 本地验证。**未修改任何生产数据、未删除任何 R2 对象或数据库记录、未改动管理员账号与认证配置、未修改生产环境变量。** 唯一新增文件是只读探测脚本 `temp/audit-rls-reprobe.mjs`（`temp/` 已在 `.gitignore` 中）。
- **文档整合说明（2026-10-16 当晚）：** 本报告是仓库中**唯一保留的全量审计文档**，也是了解网站现状的唯一入口。此前的初版审计、第一/二阶段整改报告、生产收尾报告、项目快照等过程文档已按「只保留现状与参考、删除实施过程」的原则清理（过程细节仍可在 Git 历史中按需查阅）。两份被删文档中的**遗留待办**已合并进本报告「九、遗留事项与待决策」一节；其中「杂志孤儿图片映射表」（315 个 R2 对象 → 项目的对应关系）已从临时目录转存至 `backups/magazine-orphan-mapping-2026-10-15.json`（本地，未入库），回填决策的数据依据没有丢。
- **基线说明：** 本审计基于 `038cd27`。当晚的文档整理提交 `3b51cc0` 重写了 README（P3-1「README 严重过期」随之关闭）并新增 `docs/REMEDIATION_PLAN.md`（下一步整改方案，v1.1 已经独立评审修订）。

---

## 一、项目现状报告

### 1.1 实际架构（与背景描述逐项核对）

| 背景描述 | 实际情况（本次核对） | 结论 |
|---|---|---|
| 前端及部署：Vercel | Next.js 16.1.1（App Router）+ React 19 + Tailwind v4，Vercel 生产部署，最近一次经 GitHub API 核验 `sha=40c14be`、`state=success`（2026-10-15，见生产收尾报告 G 节） | 一致 |
| 代码版本管理：GitHub | 公开仓库 `Athena-vivi/LMSY.space`，`main` 分支，本地与 `origin/main` 一致 | 一致 |
| 图片存储：Cloudflare R2 | 桶 `lmsy-archive`（408 个对象 / 151.8MB，2026-10-15 审计值）+ 第二桶 `lmsy-archive-backup`（同账号异地副本）；公网走 `cdn.lmsy.space` | 一致 |
| 元数据与业务数据：Supabase | PostgreSQL，**非 public schema**，全部业务表在 `lmsy_archive` schema 下（PostgREST 需 `Accept-Profile: lmsy_archive` 头） | 一致（细节需注意） |
| 采集入口：浏览器扩展 | **扩展源码不在本仓库**（无 manifest/chrome.* 痕迹；初版审计已确认缺失，本次复核仍缺失） | **缺失模块** |
| 采集入口：Telegram 机器人 | `app/api/webhooks/telegram/route.ts`，secret 头校验（`X-Telegram-Bot-Api-Secret-Token`），图片入 `draft_items` | 一致 |
| 管理后台 | `app/admin/**`（登录、图库 vault、草稿 drafts、上传 upload、项目、编辑、留言、日程、设置） | 一致 |

### 1.2 模块关系与数据流

```
[浏览器扩展] ✗ 源码缺失          [Telegram Bot]                [管理后台上传]
      |                                |                              |
      | (曾调用 /api/ingest)            | webhook(secret 校验)          | presigned URL 直传 R2
      v                                v                              v
                    +―――― /api/ingest（机器密钥）――――+
                    |  下载媒体(media-downloader)        |
                    |  → 计算 SHA256 → 查重 file_hash   |
                    |  → 上传 R2(draft/<platform>/…)     |
                    |  → 写 draft_items(status=draft)    |
                    |  → AI 翻译(OpenRouter, 可选)       |
                    +――――――――――――――――――――――――――――――+
                                   |
                        管理员审核(app/admin/drafts)
                                   |
              +--------------------+---------------------+
              v                                          v
     publish: draft_items.status=published      to-gallery: 复制 image_url
     （编年史 /chronicle 直接读 draft_items）      → gallery_assets（330 行主库）
              |                                          |
              v                                          v
     /chronicle (SSR, revalidate 300)           /gallery, /projects/[id]（客户端分页读 anon）
```

**关键结构事实（本次实测）：**

- 生产库表现状：`gallery_assets` **330** 行、`projects` **25** 行、`draft_items` 71 行（历史值，anon 已不可读）、`profiles` 2 行、`site_content_blocks` 4 行、`publications`/`chronicle_events`/`gallery` 均 **0 行**；`schedule`、`members` 两张表**不存在**（PGRST205）。
- 已发布内容有**两个栖息地**：`draft_items`（publish 只改状态，编年史读它）和 `gallery_assets`（to-gallery 复制，图库读它）。二者通过 `image_url` 指向**同一个 R2 对象**——这是后面多个风险的根源。
- 后台「管理员」不是 `admin_users` 表（0 行）里的记录，而是 **Supabase Auth 用户 + 邮箱匹配 `ADMIN_EMAIL` 环境变量**。所有 admin API 用 `requireAdmin` 服务端校验（cookie 或 Bearer），fail-closed。
- **没有 `middleware.ts`**（全仓确认）。`/admin` 页面本身是客户端重定向把关，真正的防护在 API 层；后台 HTML/JS 外壳可被匿名下载，但其中**不含**管理员邮箱（已改为服务端 `/api/auth/session` 判定），且有 `X-Robots-Tag: noindex` + `no-store`。
- R2 对象键空间：`magazines/<年>/LMSY-MAG-*.webp`（杂志，catalog_id 命名）、`draft/<platform>/<日期>/<时间戳>-<随机>.jpg`（采集）、`gallery/…`。**已发布资产有 18 个仍住在 `draft/` 前缀下**（对账报告明确警示：清理草稿前必读）。

### 1.3 构建/测试/部署流程

`npm run typecheck`（tsc）→ `npm test`（node:test，48 项）→ `npm run build`（Next 16 + Turbopack）→ push `main` → Vercel 自动部署。备份/迁移/演练均有 npm script（见 5.2）。**本机构建注意：** 经代理访问 `fonts.googleapis.com` 会被阻断，需 `env -u http_proxy …` 绕过代理（本机网络问题，与代码无关，Vercel 侧不受影响）。

---

## 二、全量功能审计表

状态图例：✅ 已实现且基本正常｜⚠️ 已实现但有缺陷｜🔧 已实现但值得优化｜◐ 部分实现｜❌ 未实现/不可用｜❓ 需进一步验证

### 2.1 前台

| 功能 | 状态 | 本次核验结果 |
|---|---|---|
| 首页（Hero/Portals/Longform/Chronicle 摘要） | 🔧 | 客户端组件外壳 + 客户端取数；强制等待已从 ~3.7s 降到 ≤1.2s（第二阶段成果）。内容对爬虫可见性依赖 JS 执行 |
| `/gallery` 图库 | ⚠️ | 分页/列投影/稳定排序/尺寸表/懒加载均已就位（✅），**但标签按钮取值与库中真实 tag 不匹配**：按钮为 Fashion/BehindTheScene/Affair/Magazine，真实 tag 为 Magazine 237 / Advertising 54 / STAGE 12 / STILL 9 / Telegram 3 / null 15 → 4 个按钮中 3 个点选后 0 结果 |
| 图片灯箱/详情 | ✅ | 与分页数据联动，alt 取 caption_i18n→caption→tag 降级，空图有渐变占位 |
| `/projects` 列表 | ✅ | 客户端分页不存在（25 行全量但列已收窄），排序有稳定并列键；列表不展示封面图（设计选择） |
| `/projects/[id]` 详情 | ✅ | SSR + `revalidate=300`，列投影 13 列，封面置顶排序，分类页签依赖 `category_tag`（全为 NULL → 页签目前等价于 all，🔧） |
| `/profiles` 列表 | 🔧 | 纯静态营销页（渐变占位），不读 `profiles` 表（2 行数据未利用）；链接到两个静态人物页 |
| `/profiles/lookmhee`、`/profiles/sonya` | ✅ | 静态页，正常 |
| `/profiles/[id]` 动态页 | ❌ | **查询不存在的 `members` 表** → `generateMetadata` 与页面体都走 `notFound()`，所有人物详情 URL 均为 404。库里有数据的 `profiles` 表反而没人读 |
| `/schedule` 日程 | ❌ | **前端写死 2025 年示例数据**（"Sample schedule data - will be replaced with Supabase data"），全部事件已过期；后台日程页查不存在的 `schedule` 表（anon 客户端），「Add Event」按钮**没有绑定任何处理函数**。整个日程模块死链 |
| `/chronicle` 编年史 | ✅ | SSR + service_role 读 published draft_items，`revalidate=300`，历史 6 条记录 |
| `/editorial` 杂志库 | ⚠️ | 功能正常（读 projects 的 magazine 类），但页面内嵌**红色调试横幅**（DATABASE_MISMATCH）和逐卡 `console.log`（PATH_SYNC）属生产代码残留 🔧；封面图 `unoptimized` 直出 🔧 |
| `/exhibitions`、`/resonance`、`/whispers`、`/copyright` | ✅ | 冒烟测试 200；whispers 走公开 API + 管理员审核 |
| 404/错误/空状态 | ✅ | `not-found.tsx` + `app/error.tsx`（净化，不泄露堆栈）+ 各页空状态；线上真实状态码未测（网络阻塞） |
| 移动端/暗色 | ✅ | 响应式栅格 + Sheet 导航 + 暗色默认；未做真机测试（❓ 待人工） |
| 搜索（顶部命令面板） | ⚠️ | `/api/search` 查的是**遗留空表 `gallery`（0 行）和不存在的 `schedule`** → 330 张真实图片不可搜索，只有 projects 可搜；且搜索词直接插入 `.or()` 过滤器（健壮性问题） |

### 2.2 管理后台

| 功能 | 状态 | 本次核验结果 |
|---|---|---|
| 登录/登出/会话 | ✅ | `/api/auth/login`：IP+邮箱双维限流（10 次/10 分钟 → 锁 15 分钟）、通用错误文案、HttpOnly+Secure+SameSite=Lax cookie；登出先清服务端 cookie 再 signOut |
| 管理员鉴权 | ✅ | 全部 admin API `requireAdmin`（session cookie 或 Bearer + 邮箱匹配 ADMIN_EMAIL，fail-closed）；`/api/auth/session` 服务端判定 isAdmin，**浏览器包内无管理员邮箱** |
| 密码重置/账号恢复 | ✅（机制在，未演练） | `scripts/reset-admin-password.ts`：CSPRNG 20 位密码、明文只写 0600 文件、禁止打印、要求带外交付后删除。**本次未执行**（指令要求不擅改认证配置）。见 §8 恢复方案 |
| 图片列表/元数据编辑 | ✅ | vault 多视图（all/chronicle/editorial/milestones），drafts 过滤器 + 批量编辑模态 |
| 上传（直传） | ✅ | 服务端权威校验（大小/MIME 白名单/魔数嗅探/SVG 排除）、WebP q95 转档、blur 生成、catalog_id 冲突自动重试 + 补偿删除 |
| 上传（presigned） | ✅ | `/api/admin/r2/sign` 限定 `magazines/` 前缀、5 分钟有效期、ContentLength 封顶；`/api/admin/upload/register` 校验对象键前缀 + HEAD 验存 + 失败回滚 |
| 草稿→审核→发布 | ✅ | publish 改状态；to-gallery 复制到 gallery_assets（按 image_url 去重，要求 project_id）；批量发布在 |
| 批量操作 | ◐ | 批量发布/批量编辑/批量删除有；`batch-update`（改 sequence）**只校验登录、不校验 admin**（越权，见问题清单 P2-1） |
| 误操作防护 | 🔧 | 删除有 confirm；但草稿批量删除会**连带删 R2 对象**，未检查该对象是否仍被 gallery_assets 引用（P1-4） |
| 后台性能 | 🔧 | 多数 admin API `select('*')`、无分页（drafts 有 limit/offset）；数据量小（百级）当前无感，千级后需治理 |
| 后台/前台一致性 | ⚠️ | 后台日程页 ↔ 前台日程双双失效（P1-2）；后台读得到的数据（profiles 2 行）前台动态页不用（P1-1） |
| 日程管理 | ❌ | 见上，表不存在 + 前端写死 |

### 2.3 采集与入库

| 功能 | 状态 | 本次核验结果 |
|---|---|---|
| Telegram 机器人收图 | ✅ | secret 校验 → getFile → 下载 → R2 → file_hash 查重 → draft_items → AI 翻译 → ready；日志脱敏（token URL 不落盘）做得规范 |
| `/api/ingest` API | ✅ | 机器密钥（INGEST_API_KEY 或 service_role）前置、常量时间比较、fail-closed；下载失败不建草稿（可重试 502）；DB 写失败补偿删 R2；唯一约束冲突按 duplicate 优雅返回 |
| 去重 | ✅（有漏洞） | file_hash SHA256 查重 + 部分唯一索引双保险；**但顺序是「先传 R2 再查重」**，重复图会在 R2 留孤儿对象（P2-2） |
| 上传成功/元数据失败的对偶 | ✅ | 补偿删除已实现（ingest、upload、register 三处） |
| 重试/重复提交/异常恢复 | ⚠️ | ingest 无重试（靠调用方）；**webhook 永远返回 200** → Telegram 不重投，失败的 update 只进日志，无死信队列（P1-7） |
| 一致性 | ⚠️ | 见 P1-4（草稿删对象 vs 图库引用）与 P2-2（孤儿对象）；对账脚本 `audit-r2-references.mjs` 存在且只读，上次结果 0 missing |
| 采集日志 | ✅ | 全链路 console 日志，URL 脱敏（maskUrlForLog），hash 只打前 16 位 |
| 来源信息保留 | ✅ | source_url/platform/post_id/raw_event_date/media_metadata 均落库（source_url 为私密 t.me 链接，即当初泄露的字段） |
| 浏览器扩展 | ❌ | 源码缺失，无法审计、无法维护；若线上仍有旧版在用，等于一个**不可审查的采集入口** |
| RSS 自动采集 cron | ◐（停用） | 代码在、鉴权在，但**所有源 `enabled: false`**、每源上限 2 条「STRICT LIMIT FOR TESTING」、时间窗被改成 30 天「for testing」。等于未启用 |

---

## 三、问题与风险清单（按优先级）

> 分类：A=已确认存在的问题；B=已确认但当前影响较小的设计缺陷；C=有证据支持的优化机会；D=需进一步测试才能确定。
> **当前没有未修复的 P0。** 上一轮唯一的 P0（anon 可读未发布草稿）已修复并于**今天重新实测确认**（见第七节）。

### 整改进度（随批次更新）

**第一批已关闭（2026-10-16 晚，提交 `426ca69`/`53757fe`/`c797ff6`，已推送部署）：**

- **P1-1 已修复** —— 数据源改查 `profiles`，并修复第二个根因：该页未按 Next 15+ 惯例 `await params`（这才是「全 404」的另一半原因）。本地已验证：真实 UUID 渲染出资料；未知 id 渲染 not-found 界面（HTTP 行为与全站动态页一致：editorial/projects 同样渲染 not-found UI 但状态码为 200——此为全站既有行为，记为观察项）。
- **P1-2 已最小化（选 D2 方案 B）** —— 前台不再展示写死的 2025 假数据（渲染既有空状态）；后台不再查询不存在的表、Add Event 禁用并标注模块未启用。建表启用留待后续决策。
- **P1-3 已修复（选 D1 方案 A）** —— 按钮改为真实 tag（Magazine/Advertising/STAGE/STILL/未分类，null 用 `.is('tag', null)` 查询；Telegram 3 条为采集来源元数据，不作为筛选按钮，归入 All）。生产实测每个按钮均有非空结果。
- **P1-4 已修复** —— 新增 `lib/draft-delete-guard.ts`：删除前检查全部引用来源（gallery_assets.image_url、projects.cover_url/homepage_cover_url、site_content_blocks、删除集之外的 draft_items），裸键/URL 两种历史格式归一化比对；被引用对象保留（行仍删，响应显式标注 kept_objects）；R2 删除失败不再被 `allSettled` 吞掉（响应含 r2_delete_failures）；引用加载失败一律 fail-closed 拒绝删除。**生产实测风险敞口：24 条草稿的对象仍被发布内容引用——修复前一次批量删除即可弄坏这 24 处线上图，现已受保护。** 17 个新单测覆盖。

第一批本地门禁：typecheck 0 错、单测 65/65、生产构建 exit 0、安全冒烟 51/51。剩余批次见 `docs/REMEDIATION_PLAN.md`。

**第二批已关闭（2026-10-16 深夜，提交 `c06d009`/`8857e7d`，已推送部署）：**

- **P2-1 已修复** —— `/api/admin/gallery/batch-update` 改用 `requireAdmin`（未登录 401 / 已登录非管理员 403 / 未配置 503），payload 校验 1-200 条 `{id, sequence 整数 0-999999}`。
- **P1-5 已修复** —— `/api/search` 改查 `gallery_assets` + `projects`（330 张图可搜了）；搜索词经 `lib/search-term.ts` 白名单净化（`.or()` 语法字符与通配符全部剥离、长度截断）后才进过滤器；schedule 死分支删除。真实词（如 caption 里的 "Radar"）可搜到图。
- **P2-2 已修复** —— ingest 与 Telegram webhook 均改为「下载 → 算 hash 查重 → 命中即返回（**不上传**）→ 通过才上传」；webhook 插入失败补上此前缺失的补偿删除。**端到端实测：重灌既有对象 URL 返回 duplicate，`audit:r2` 未引用数 25 → 25（零新增孤儿）**。
- **P2-3 已修复（本期收窄范围）** —— 新增 `lib/security/url-guard.ts`：阻断环回/RFC1918/链路本地（含云元数据 169.254.169.254）/CGNAT/保留/组播段、IPv6 环回/ULA/链路本地、IPv4-mapped IPv6、整数与十六进制 IPv4 变体；下载改为手动跟随重定向并**逐跳复检**（关闭 302 跳内网绕过）。实测元数据与环回目标均被 502 拒绝。**已知残留（记录在模块头部）：DNS rebinding 与域名白名单，按方案挂起至 B3-T2（扩展源码）落定。** 12 个新单测。

第二批本地门禁：typecheck 0 错、单测 **83/83**、生产构建 exit 0、安全冒烟 51/51、`audit:r2` 前后一致。

### P0

| # | 问题 | 证据 | 状态 |
|---|---|---|---|
| — | ~~anon 可读 `draft_items`/`admin_users`（未发布草稿 + 私有 Telegram 链接外泄）~~ | 2026-10-16 复测：两表 anon **HTTP 401 / 42501**；7 张公开表仍 200；行数零漂移 | **已修复并复验**（迁移 2026-10-15T23:45Z 应用，修复报告见 PRODUCTION_CLOSURE_REPORT A 节） |

### P1（明显影响使用/数据正确性/长期维护）

| # | 模块 | 问题 | 证据 | 影响 | 方案 | 范围 | 需迁移/配置 | 回归风险 |
|---|---|---|---|---|---|---|---|---|
| P1-1 | 前台 `/profiles/[id]` | 查询不存在的 `members` 表，动态人物页全 404；真实数据在 `profiles`（2 行）无人读 | `app/profiles/[id]/page.tsx` 两处 `from('members')`；生产 PGRST205 | 人物详情路由死链；sitemap 若收录即死链 | 数据源改 `profiles`（或明确废弃该路由并加重定向） | 1 文件 | 否 | 低 |
| P1-2 | 日程模块 | 前台写死 2025 示例数据；后台查不存在的 `schedule` 表；「Add Event」无处理函数 | 代码注释自述 "Sample schedule data"；`app/admin/schedule/page.tsx` | 整个日程功能不可用，后台入口误导 | 产品决策：建 `schedule` 表+迁移，或下线该模块（前台改静态文案、后台隐藏入口） | 2-4 文件 + 可能 1 迁移 | 视决策 | 中（若建表） |
| P1-3 | 前台 `/gallery` | 标签按钮与实际 tag 不匹配，3/4 按钮返回 0 条 | 按钮值 vs 库内 tag 分布（237/54/12/9/3/15） | 筛选功能实际残废，用户感知为「没内容」 | 产品决策后统一分类体系（改按钮取值，或回填规范 tag） | 1-2 文件 + 可能数据回填 | 可能数据 | 中 |
| P1-4 | 数据完整性 | 草稿批量删除会删 R2 对象，但发布过的图（to-gallery 后）其对象仍被 `gallery_assets` 引用 → **可能删坏线上图** | `to-gallery` 复制 `image_url`（同一 R2 对象）+ draft 保留；`drafts DELETE` 先 `deleteFromR2` 后删行，且删除失败被 `allSettled` 吞掉 | 误操作即可造成公开页面破图，且静默 | 删除前检查 `gallery_assets.image_url` 引用（或 R2 对象被任一行引用即跳过删除）；失败要显式上报 | 1 文件 | 否 | 低 |
| P1-5 | 搜索 | `/api/search` 查空表 `gallery` + 不存在表 `schedule`；330 张真实图不可搜；搜索词直插 `.or()` 过滤器 | 代码 + 行数实测 | 搜索功能名存实亡；过滤器注入可致 500（RLS 仍保护数据） | 改查 `gallery_assets`（caption_i18n/tag）；对搜索词转义或改用 `.ilike` 参数化写法 | 1 文件 | 否 | 低 |
| P1-6 | 采集入口 | 浏览器扩展源码缺失 | 全仓无 manifest/chrome 痕迹；初版审计同样结论 | 一个线上可能在用的采集入口无法审计/维护/修复 | 找回源码入库（或确认已弃用并下线对应 ingest 调用方） | 0（仓库外） | 否 | — |
| P1-7 | Telegram webhook | 永远返回 200 → 失败 update 不重投、无死信；不校验 chat 白名单（任何人给 bot 发图都成草稿） | 路由代码 | 采集丢件无感知；垃圾内容直通草稿箱 | 失败 update 返回非 200 让 Telegram 重投（或自建重试表）；加 chat_id 白名单 | 1 文件 | 新增 env（白名单） | 中 |
| P1-8 | RSS cron | 源全禁用、每源 2 条测试上限、30 天测试窗口 | `RSS_SOURCES` 全 `enabled:false` | 自动采集实际未运行；若贸然开启会按测试参数行为 | 明确启用策略（换可达源或自建 RSSHub），参数产品化 | 1 文件 | 否 | 中 |

### P2（有实际收益的优化/正确性）

| # | 模块 | 问题 | 证据 | 影响 | 方案 |
|---|---|---|---|---|---|
| P2-1 | API 鉴权 | `/api/admin/gallery/batch-update` 只验登录不验 admin；sequence 值无校验 | 路由代码 | 任一登录用户可改写图库排序 | 换 `requireAdmin`；校验 sequence 为整数 |
| P2-2 | 采集一致性 | ingest 先传 R2 后查重 → 重复图留孤儿对象（现网已有 25 个 unreferenced，其中 draft/ 5 个） | 代码顺序 + 对账报告 | 存储缓慢膨胀、对账噪音 | 查重前移（先算 hash 再决定是否上传）；或 duplicate 分支补偿删对象 |
| P2-3 | 安全面 | `/api/ingest` 服务端任意 URL 下载（SSRF 面），50MB 全量进内存 | `downloadMedia` | 密钥持有者可探测内网/元数据服务 | 加 host 白名单或至少禁私网 IP 段；流式大小上限 |
| P2-4 | 性能/SEO | 首页/图库/项目/档案均客户端渲染，核心内容依赖 JS | 路由表 `ƒ`/`○` + 页面代码 | 首屏与爬虫可见性折损（GL 粉丝站可接受，但应有意识） | 保持现状（设计选择），仅确保 metadata/canonical 正确；或对编年史式内容逐步 SSR 化 |
| P2-5 | 查询效率 | 公开 API `select('*')`：search（3 处）、whispers、project-gallery | grep 实测 | 载荷偏大（当前数据量下影响小） | 按第二阶段同法收窄列投影 |
| P2-6 | 配置 | `NEXT_PUBLIC_ADMIN_EMAIL` 兼容层仍在线；`ADMIN_EMAIL` 是否已在 Vercel Production 生效**未核验** | 收尾报告 C 节；本机无 Vercel 凭据 | 若只配了兼容变量，管理员邮箱仍随客户端包分发 | 核验 Vercel 后移除兼容变量 |
| P2-7 | 配置 | `OPENROUTER_API_KEY` 不在本地 env（14 个变量名中无它）→ 翻译是否在生产生效未知 | `.env.local` 变量名清单 | 若未配，草稿 zh/th 恒空，多语言能力空转 | 核验 Vercel；未用则下线相关 UI 状态 |
| P2-8 | 代码卫生 | editorial 页生产代码内含红色调试横幅 + 逐卡 console.log | 页面代码 | 用户可见的「DATABASE_MISMATCH」吓人横幅；日志噪音 | 删除 debug UI，日志收敛 |
| P2-9 | 代码卫生 | `checksum.ts` 的 `calculateMD5` 不是真 MD5（自述 "simple implementation"） | 代码 | 误导后续维护者 | 删除或改名/标注 |
| P2-10 | 代码卫生 | `register` 路由硬编码 R2 account-id endpoint 兜底 + 桶名 | 代码 | 配置分散 | 统一走 env |

### P3（可延后）

| # | 问题 | 说明 |
|---|---|---|
| P3-1 | README 严重过期 | 仍写 Next 14、Supabase Storage 桶、`members` 表结构；与现状（R2、lmsy_archive schema、gallery_assets）脱节 |
| P3-2 | sitemap 缺路由 | 缺 `/profiles/lookmhee`、`/profiles/sonya`、`/editorial/[id]`、`/exhibitions/[slug]` 详情页 |
| P3-3 | 死代码/死数据 | `app/admin/drafts/page-old.tsx`；`rotation` 全 0、`category_tag` 全 NULL、`blur_data` 全空（相关代码路径空转）；`ai-translator` 的 `FALLBACK_MODELS` 未使用 |
| P3-4 | 备份边界 | R2 版本控制未启用；第二桶与源桶同 Cloudflare 账号（非完整容灾）；跨账号第三副本待决策（BACKUP_AND_RESTORE.md 已如实记录） |
| P3-5 | 后台大数据量表现 | admin API 无分页 + `select('*')`，当前百级数据无感 |

---

## 四、架构评估报告

### 4.1 应保持现状（不要动）

1. **技术栈**：Next.js App Router + Supabase + R2 + Vercel 完全匹配站点规模（330 图/25 项目/2 人），没有重构理由。
2. **`lmsy_archive` 独立 schema**：与 public 隔离，PostgREST 默认 Schema 下连表都看不到（本次探测 public 下全部 PGRST205），是正确的收缩面。
3. **catalog_id 档案编号体系**（LMSY-类别-日期-序号）：与 R2 键、后台、详情页排序全链路打通，是项目的核心资产，继续沿用。
4. **服务端-only 的 service_role 用法**：`getSupabaseAdmin()` 带浏览器环境熔断；draft_items 全链路（后台/ingest/webhook/cron/编年史）都用 service_role——这是 P0 修复不影响任何页面的原因，也是必须守住的纪律。
5. **第一阶段安全层**：机器密钥常量时间比较、fail-closed、登录限流、上传魔数校验、补偿删除——质量高于同类项目平均水平，保留。
6. **草稿→人工审核→发布流程**：符合粉丝站内容风险控制，批量采集也应挂在这条流程上，不要绕开。
7. **备份体系三件套（db 逻辑导出 / R2 全量镜像 / 同账号第二桶 + 恢复演练）**：对免费栈站点已超出平均线，保留并按文档定期跑。
8. **第二阶段性能优化成果（已上线）**：全站缓存策略、图片加载与布局（尺寸/比例/懒加载）、`/gallery` 与 `/projects` 查询分页改造、loading/error 边界、SEO 技术项、Service Worker——这批改动已随部署上线，属于当前站点的既有优点，后续改动不要回退。

### 4.2 值得优化（局部调整，不重构）

1. **统一上传/入库/错误处理**：`/api/ingest`、`/api/admin/upload`、`/api/admin/upload/register` 三条路径各自实现了「下载→hash→传 R2→写库→补偿」，逻辑重复且去重时机不一致。应抽一个共享 pipeline 模块（下载、hash 查重、上传、写库、补偿各一步），批量采集直接复用它。
2. **发布数据模型二合一**：draft_items 与 gallery_assets 双栖息是历史成因；短期不必合并，但**删除保护**（P1-4）和**孤儿对账**要成为常规操作，不是一次性脚本。
3. **搜索与标签体系**：等产品分类决策（P1-3）落定后，搜索改查 gallery_assets，按钮与 tag 同源。
4. **前台渲染策略**：维持客户端外壳（设计使然），但把「内容型页面」（编年史已是范例）逐步 SSR 化，收益是首屏与 SEO。

### 4.3 暂时不需要动

- 数据模型为音乐/视频/活动留扩展空间：`projects` 已有 `music`/`journal` 等 category 先例，`gallery_assets.media_type` 已区分 image/video，`publications`/`chronicle_events` 空表待用——**加索引时按现有先例加表/加 category 即可，不要提前重构**。
- i18n 路由化（当前是 localStorage + 三语包内切换）：粉丝站场景够用。
- 引入队列服务（Bull/Redis 等）：日增量个位数草稿，serverless + 数据库状态机足够；等批量采集真的跑起来再评估。

---

## 五、分批整改计划

### 第一批：恢复管理后台访问 + 排除「看起来坏了」的功能（对应你遇到的密码问题）

- **目标**：管理员能可靠地重新进入后台；用户可见的「死功能」不再死。
- **任务**：
  1. 管理员密码恢复（**只做验证不做变更**：确认 `scripts/reset-admin-password.ts` 可用路径；或走 Supabase Dashboard → Authentication → 用户 → 发送重置邮件）。若忘记管理员邮箱，用 service_role 本地跑 `auth.admin.listUsers()` 列出（只打印邮箱，不打印任何密钥）。
  2. P1-1：`/profiles/[id]` 数据源改 `profiles`（或 301 到静态人物页）。
  3. P1-2：日程模块决策（建表 or 下线），先让后台不再报错。
  4. P1-3：标签按钮与真实 tag 对齐（产品决策）。
- **依赖**：无（均可独立）。
- **验收**：`/profiles/lookmhee` 等详情 200；`/schedule` 不再展示过期假数据；4 个标签按钮各有非空结果（或按钮数量与真实分类一致）；管理员可登录可登出。
- **回归风险**：低（前台展示层改动，不碰数据）。

### 第二批：数据完整性、安全与备份高优先级

- **目标**：消除「一次误操作毁数据」的路径；补齐线上验收。
- **任务**：P1-4（草稿删 R2 引用保护）、P1-5（搜索改源+参数化）、P2-1（batch-update 鉴权）、P2-2（去重前移或补偿）、P1-7（webhook 重投/白名单）、Vercel 环境变量核验（`ADMIN_EMAIL`/`TELEGRAM_WEBHOOK_SECRET`/`CRON_SECRET`/`INGEST_API_KEY`/`TELEGRAM_BOT_TOKEN`/`OPENROUTER_API_KEY`）→ 然后重注册 Telegram webhook → 然后跑线上冒烟测试 + 真实管理员端到端 + Supabase PITR 状态回填。
- **依赖**：webhook 重注册必须在环境变量核验之后（顺序不可颠倒，否则采集中断）。
- **验收**：删除一个「已发布到 gallery_assets」的草稿，线上图不破；搜索能搜到杂志图；未认证调用 batch-update 401；`security-smoke-test --base https://lmsy.space` 通过；文档 PITR 行填上实测值。
- **回归风险**：中（涉及删除路径与采集链路，改动需小步 + 备份先行）。

### 第三批：图片加载与日常管理体验

- **目标**：把第二阶段没做完的性能收尾，降低日常管理成本。
- **任务**：P2-5（公开 API 列投影）、P2-8（editorial 调试残留清理）、blur_data 补全或下线占位、category_tag/rotation 死数据决策、线上性能复测（缓存头/AVIF/分页）。
- **依赖**：第二批的环境核验（线上复测需要站点可达）。
- **验收**：公开 API 载荷下降；线上 `/_next/static` immutable、`/_next/image` 30 天缓存实测通过。
- **回归风险**：低。

### 第四批：批量采集准备度（为未来功能铺路，不实现功能本身）

- **目标**：让「采集→下载→去重→上传→入库→待审→人工→发布」可批量、可观测、可恢复。
- **任务**：找回/替换浏览器扩展（P1-6）；共享 pipeline 抽取（§4.2-1）；ingest 支持批量 URL；失败重试与死信记录（DB 表或 ingestion_stage 状态机扩展）；采集监控面板补全（ingestion-monitor 已有雏形）；RSS cron 参数产品化（P1-8）。
- **依赖**：第二批的 webhook/密钥稳定；pipeline 抽取是核心前置。
- **验收**：一次提交 N 个候选 URL，全部有明确终态（duplicate/ready/failed+原因）；失败可重放；无孤儿 R2 对象增量。
- **回归风险**：中（新入口必须走同一套密钥与审核流程，不得旁路）。

### 第五批：低优先级清理

- **任务**：P3 全部（README 重写、sitemap 补全、死代码/死数据清理、第三副本决策）。
- **依赖**：无。
- **验收**：新克隆仓库按 README 可跑通；sitemap 覆盖全部可访问路由。
- **回归风险**：低。

---

## 六、批量图片采集准备度评估

目标流程：**采集候选 → 下载 → 去重 → 上传 R2 → 写 Supabase → 待审核 → 人工确认 → 发布**

| 环节 | 现状 | 差距 |
|---|---|---|
| 采集候选 | `/api/ingest` 单 URL + Telegram webhook 单条；扩展缺失；cron 停用 | **无批量入口**；无候选队列/暂存区 |
| 下载 | `media-downloader`：UA 池、防盗链 Referer、超时、50MB 上限、sharp 取尺寸 | 基本够用；SSRF 面需收窄（P2-3） |
| 去重 | SHA256 file_hash + 部分唯一索引（库级权威） | **时机太晚**（先传后查，P2-2）；批量下浪费带宽与存储 |
| 上传 R2 | `uploadToR2` + presigned 双路 | 无批量并发控制/断点 |
| 写 Supabase | draft_items insert + 翻译 + ready 状态机 | 单条同步流程，无批量事务/部分失败语义 |
| 待审核 | admin/drafts（过滤/统计/批量编辑） | 已有雏形，缺「批次」维度（同一批导入的可追溯性） |
| 人工确认 | publish / to-gallery / batch-publish | 可用；删除保护需先修（P1-4） |
| 发布 | draft_items.status=published 或复制到 gallery_assets | 双栖息语义需在文档/UI 上讲清（现在靠口口相传） |

**结论：现有架构支持该流程，不需要推倒重来。** 最少需补：①共享 pipeline（下载/去重/上传/写库/补偿各一步，批量入口复用）；②去重前移；③失败重试与死信；④批次标识（batch_id）贯通草稿箱；⑤扩展源码找回或替代入口。工作量集中在 ①②③，均为模块级改动。

---

## 七、验证结果（本次实际执行）

### 7.1 已执行并通过

| 验证 | 结果 | 说明 |
|---|---|---|
| `npm run typecheck` | ✅ 0 错误 | 全量 tsc |
| `npm test` | ✅ **48/48** | security 31 + migrations 17 |
| `npm run build` | ✅ exit 0（3m21s） | 路由表：静态 18 / 动态若干，`/chronicle` 5m、`/sitemap.xml` 1h，符合预期 |
| 本地生产服务器 + `security-smoke-test.mjs` | ✅ **51/51** | 构建产物 `next start` 实跑：28 管理端点未认证 401、伪造 Bearer 拒、机器密钥四态拒、Telegram secret 三态、登录第 11 次 429、公开端点 200 |
| **生产 RLS 复测（anon key 只读）** | ✅ **P0 修复仍在位** | `draft_items`/`admin_users` **401/42501**；`gallery_assets`/`projects`/`profiles`/`site_content_blocks`/`publications`/`chronicle_events`/`gallery` **200**；`schedule`/`members` 404（不存在） |
| 生产行数统计（anon 只读） | ✅ | 330 / 25 / 2 / 4 / 0 / 0 / 0（见 1.2） |
| 代码通读 | ✅ | 认证、ingest、webhook、cron、上传×3、发布、图库、档案、日程、编年史、编辑、搜索、备份脚本、迁移测试 |
| 备份/恢复既有证据复核 | ✅ | `docs/BACKUP_AND_RESTORE.md` 记录完备：db 432 行 / R2 408 对象 / offsite 0 缺失 / restore-drill PASSED / db-offsite 11 文件 SHA-256 回读通过（均为 2026-10-15~16 执行） |

### 7.2 未通过/未执行（及原因）

| 项 | 状态 | 原因 |
|---|---|---|
| `lmsy.space` 线上 HTTP 冒烟/页面回归 | ❌ 未执行 | 本机 TCP 443 超时（DNS 正常）；代理同样超时 |
| Telegram webhook 重注册 | ❌ 未执行 | `api.telegram.org` 不可达；且须先核验 Vercel 变量 |
| 真实管理员登录端到端 | ❌ 未执行 | 需可达生产地址 + 真实凭据（且本次指令不允擅改认证配置） |
| Vercel 环境变量核验 | ❌ 未执行 | 本机无 Vercel 凭据 |
| Supabase PITR/保留期核验 | ❌ 未执行 | 需 Dashboard/Management token |
| R2 版本控制状态复测 | ❌ 未执行 | Cloudflare token 权限不足（仅能自校验） |
| 真机移动端/暗色走查 | ❓ 待人工 | 无设备 |
| 线上图片加载耗时/Lighthouse | ❓ 待人工 | 站点不可达，拒绝用本地数冒充 |

### 7.3 边界遵守声明

未修改生产数据库、未删除任何 R2 对象或行、未改管理员账号/权限/认证配置、未改生产环境变量、未将任何凭证写入报告或提交（本次新增文件仅 `temp/audit-rls-reprobe.mjs`，位于 gitignore 目录）。所有探测均为 GET、limit=1、只读。

---

## 八、最终结论

**1. 网站目前是否具备继续维护的基础？**
具备，而且好于预期。代码在 GitHub 完整（工作区干净、HEAD 与线上一致），三份备份（代码/数据库/图片）都有可执行脚本和演练记录，安全层在第一/二阶段已实质加固，上一轮唯一的 P0（草稿外泄）已修复并于今天复验。真正缺的是**收尾类人工操作**（Vercel 变量核验、webhook 重注册、线上回归）和**一批既存功能缺陷**（人物详情 404、日程死链、标签不匹配），都不伤筋骨。

**2. 是否存在必须立即处理的问题？**
没有未修复的 P0。但如果把「管理员现在进不去后台」当作最高优先级，那第一件事是密码恢复（机制已备好，见下）。其后按 P1 顺序处理即可。**唯一具有数据毁灭性的是 P1-4**（删草稿可能删坏线上图）——在任何人再做批量删除之前应该先修。

**3. 最值得优先实施的三至五项优化：**
① 管理员密码恢复并核实后台可用（第一批）；② P1-4 删除保护（防止误操作毁图）；③ P1-1/P1-2/P1-3 三个「死功能」修复（人物页/日程/标签，都是小改动大感知）；④ Vercel 变量核验 → webhook 重注册 → 线上冒烟（把「部署成功」变成「生产验证通过」）；⑤ P1-5 搜索改源（让 330 张图可被找到）。

**4. 哪些模块应保持现状？**
技术栈与部署形态、`lmsy_archive` schema 隔离、catalog_id 体系、service_role 纪律、第一阶段安全层、草稿审核发布流、备份三件套、客户端外壳式前台（设计选择，非缺陷）。

**5. 哪些优化可以延后？**
README/sitemap/死代码清理（P3）、跨账号第三副本与 R2 版本控制（成本决策）、SSR 化改造、音乐/视频/活动索引的模型预重构（用现有先例即可，不提前动）。

**6. 开始批量采集之前必须先解决什么？**
P1-4（删除保护，否则批量删除误伤线上图）→ P2-2（去重前移，否则批量必然产孤儿对象）→ P1-6（扩展找回或替代，否则采集入口不可维护）→ 共享 pipeline 抽取（否则批量逻辑第三次重复造轮子）→ P1-7（失败重投/死信，否则批量失败无声流失）。这五项就是第四批的核心，也是本报告建议的下一阶段主线。

---

## 九、遗留事项与待决策（合并自已归档的过程文档）

以下事项在过往整改过程中形成，尚未关闭，按责任方分三类：

### 9.1 需要你（站点所有者）操作的

1. **撤销两个 Supabase 个人访问令牌（安全事项，建议最优先）**：此前为应用数据库迁移，你在对话中提供过两个 `sbp_…` 开头的 Management API 令牌。它们具备 SQL 执行权限，虽未写入任何文件或提交，但已在聊天记录明文出现。请到 Supabase Dashboard → Account → Access Tokens 将这两个令牌 **Revoke**，今后如需再用，临时生成、用完即撤。
2. **Vercel Production 环境变量核验**：确认 `ADMIN_EMAIL`、`TELEGRAM_WEBHOOK_SECRET`、`CRON_SECRET`、`INGEST_API_KEY`、`TELEGRAM_BOT_TOKEN`、`OPENROUTER_API_KEY` 已配置（注意顺序：**先核验变量，再重注册 webhook**，顺序颠倒会导致 Telegram 采集中断）。
3. **重注册 Telegram Webhook**：变量核验通过后，在可达网络执行 `npx tsx scripts/setup-telegram-webhook.ts register https://lmsy.space`，再用 `status` 子命令核对注册结果。注意两个前置：① Vercel Production 已配 `TELEGRAM_WEBHOOK_SECRET`/`TELEGRAM_BOT_TOKEN`；② 本地 `.env.local` 的 `TELEGRAM_WEBHOOK_SECRET` 与 Vercel Production 同值（注册脚本读本地值）。脚本是子命令式，直接传 URL 不会执行注册。
4. **线上验收**：本机网络无法到达 `lmsy.space` / `api.telegram.org`，以下项目前只能做「本地同代码」替代验证：线上冒烟测试、真实管理员登录端到端、关键业务回归（首页/图库/作品/档案/日程/编年史/灯箱/审核发布/上传）、第二阶段性能与 SEO 的线上复测。
5. **Supabase PITR / 每日备份 / 保留期核验**：需在 Dashboard 确认并回填状态（免费版可能不包含 PITR，需确认实际保护水平）。

### 9.2 待产品决策（不决策就保持现状，不会继续恶化）

1. **315 个杂志孤儿图片是否回填**：R2 `magazines/` 下有 315 个未被数据库引用的历史内页（2026-03 表切换时关联丢失）。其中 283 个可自动匹配到 17 个项目，20 个（AD-20251216 12 张、TRV-20251216 8 张）没有可挂靠的项目。文件→项目映射已存至 `backups/magazine-orphan-mapping-2026-10-15.json`；回填方案（一次性脚本、幂等、dry-run 先行）在已归档的调查文档中，需要时可按 Git 历史取回或重写。**不影响站点运行，属「可恢复的内容资产闲置」**。
2. **`/gallery` 标签体系**：按钮值（Fashion/BehindTheScene/Affair/Magazine）与真实 tag（Magazine 237/Advertising 54/STAGE 12/STILL 9/Telegram 3/null 15）不匹配，二选一：改按钮取值，或回填规范 tag。
3. **死数据字段**：`rotation` 全为 0、`category_tag` 全为 NULL、`blur_data` 全为空——相关代码路径实际不生效，清理或补全需决策。
4. **跨账号第三副本 / R2 版本控制**：成本收益问题，建议先确认 Supabase 平台备份能力后再定。
5. **日程模块**：建表启用或前台下线（当前前台展示的是写死的 2025 示例数据，属「假装有功能」）。

### 9.3 已归档过程文档中的其他结论

均已在上述章节中以本次实测覆盖，无需回查：迁移执行与零漂移证据、备份/恢复演练结果、Git 与部署记录（`9e75a21`…`038cd27` 五个提交）、性能优化明细。

---

## 附：管理员密码恢复方案（回应「密码遗忘」问题，本次未执行任何变更）

1. **首选（不动代码）**：Supabase Dashboard → Authentication → Users → 找到管理员邮箱 → Send password recovery / 直接重设密码。
2. **本地脚本路径**（`.env.local` 已含所需变量名：`SUPABASE_SERVICE_ROLE_KEY` + 管理员邮箱）：
   `npx tsx scripts/reset-admin-password.ts <admin-email>` → 明文写入 `backups/admin-password-<时间戳>.txt`（0600）→ 移入密码管理器 → **删除该文件**。脚本不打印明文、不提交 Git。
3. **忘记管理员邮箱**：用 service_role 本地执行 `auth.admin.listUsers()` 打印邮箱列表（仅邮箱，无密钥），与 `.env.local` 中 `ADMIN_EMAIL`/`NEXT_PUBLIC_ADMIN_EMAIL` 的值比对。
4. 注意：`admin_users` 表是空的，「管理员」= 邮箱匹配环境变量的 Supabase Auth 用户；重置密码不会动这个表。
5. 小瑕疵（P3）：脚本默认邮箱读的是 `NEXT_PUBLIC_ADMIN_EMAIL` 而非 `ADMIN_EMAIL`，显式传参可避开，建议顺手统一。
