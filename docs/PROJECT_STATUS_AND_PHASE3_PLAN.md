# LMSY.space 项目状态盘点与第三阶段方案（图片数据批量更新）

- **日期：** 2026-10-16
- **性质：** 盘点 + 方案文档。本轮**未**启动图片采集、未批量上传、未发布草稿、未修改任何生产数据；全部生产侧检查为只读（PostgREST SELECT、R2 列表、Telegram getWebhookInfo 尝试、生产 HTTP GET/非法请求探测）。
- **证据约定：** 每个结论标注证据来源。本机网络**无法到达** `lmsy.space` 与 `api.telegram.org`（实测 fetch failed，见 §1.4），所有「线上 HTTP」类验收只能列待办，不冒充完成。

---

## 1. 项目当前版本、分支、提交与部署状态

| 项 | 状态 | 证据 |
|---|---|---|
| 分支 / 工作区 | `main`，工作区干净（无未提交修改） | `git status --short --branch` → `## main...origin/main [ahead 1]`，无文件行 |
| 最新提交 | `8a47a85`（仅文档：扩展弃用裁定 + U3 改为先验证） | `git log --oneline -1`、`git show 8a47a85 --stat`（2 个 docs 文件） |
| 未推送 | **1 个提交未推送**（`8a47a85`，纯文档）。此前 GitHub 443 间歇不可达导致推送失败；本轮未再尝试推送（避免与盘点无关动作），待网络窗口补推 | `git rev-list origin/main..main --count` → 1 |
| 生产部署对应关系 | `origin/main` HEAD = `8857e7d`（第二批代码，含去重前移 + SSRF 黑名单）。`84c820e`、`b2813ee`、`8857e7d` 均已验证为 `origin/main` 祖先 | `git merge-base --is-ancestor` 三项均通过 |
| Vercel 部署 | **无法从本机直接核验**（lmsy.space 不可达、无 Vercel API 凭据）。按 Vercel-GitHub 自动部署流程，origin/main 更新即部署；此前批次验收记录（docs/FULL_AUDIT_REPORT_2026-10-16.md）记载 `c797ff6`、`8857e7d` 部署已验证。**状态：代码已推送（已验证），线上版本 = 8857e7d（依据部署记录，非本轮直接核验）** | git 祖先验证 + 审计报告记录 |

## 2. 维护与安全收尾状态表

状态定义：✅ 已实现且已验证｜🔶 代码完成、生产验证不完整｜⚪ 未实现｜🔒 本机权限/网络无法验证。

| 项 | 状态 | 证据与说明 |
|---|---|---|
| `84c820e` 安全整改（admin 鉴权、上传收紧、备份脚本、数据完整性） | ✅ 已合入并推送 | `git show 84c820e --stat`（40+ 文件：admin 路由 requireAdmin、删除 diagnose 页等）；祖先验证通过 |
| 迁移 `20261015_phase1_baseline_gallery_assets.sql` | ✅ 生产已应用（间接功能证据） | 基线建表脚本（75 行，全部 IF NOT EXISTS）；生产 `gallery_assets` 可经 anon key 正常读取、列集合与基线定义一致（OpenAPI 探针，见 §4.1）。直接 SQL 查询 pg_class 无权限，标间接证据 |
| 迁移 `20261015_phase1_data_integrity.sql` | ✅ 生产已应用（间接功能证据） | ① `draft_items.source_platform` 含 `telegram` 的 CHECK：生产 30 条 telegram 草稿正常入库（探针实测），旧约束（无 telegram）下不可能；② 唯一索引：实测 0 重复 `image_url`（gallery_assets）、0 重复 `r2_media_url` 与 0 重复 `file_hash` 依赖约束（探针）；③ 提交 `40c14be` 记录迁移应用 |
| 迁移 `20261015_phase1_rls_hardening.sql` | ✅ 生产已应用（**功能性实测**） | anon key 读 `draft_items` → **HTTP 401**；读 `admin_users` → **HTTP 401**；读 `gallery_assets`/`projects`/`chronicle_events`/`site_content_blocks` → **HTTP 200**（本轮探针实测，即「匿名/普通用户读不到草稿与管理员表、公开表正常」的直接证据） |
| 匿名/authenticated 写入面 | ✅ 收紧 | 迁移 REVOKE 全部写权限 + 丢弃 permissive 写策略（迁移文件 §1/§2）；应用层所有写走 service_role（`lib/supabase/admin.ts`） |
| 管理员认证/会话/登出/权限 | 🔶 代码完成；线上端到端未复测 | `requireAdmin` 语义 401/403/503 有单测与冒烟（`scripts/security-smoke-test.mjs` 51/51，本地）；本机不可达 lmsy.space，线上登录端到端属 X2 待办 |
| 生产环境变量 `ADMIN_EMAIL`/`TELEGRAM_WEBHOOK_SECRET`/`CRON_SECRET`/`INGEST_API_KEY` 等 | 🔒 无法核验（需 Vercel Dashboard，用户侧 U2） | 本机 `.env.local` 14 个变量齐全（键名核对），但 Vercel Production 值本机不可读。替代方案：生产 API 无凭据探测（期望 503=未配置/401=不匹配）因网络不可达未执行，列入 X2 |
| Telegram Webhook 注册 | 🔶 **功能性在活**（间接证据强）；注册参数直接核验被网络挡住 | ① 数据库实测：最新 15 条草稿全部 `source_platform=telegram` 且均带 R2 对象；10-15 05:57:08–05:57:27 UTC（北京 13:57）20 秒连续入库 10 条 = 批量发送场景实测通过；10 月累计 12 条（探针 `temp/webhook-verify.mjs`）。② secret 不匹配时 Telegram 投递会被 401 全拒——有新草稿即证明 secret/URL 链路正确。③ `api.telegram.org` getWebhookInfo 本机 fetch failed（2 次重试），注册参数（URL/secret 指纹）待可换网络跑 `npx tsx scripts/setup-telegram-webhook.ts status`（只读） |
| 合法 vs 非法 webhook 请求处理 | 🔶 单测+冒烟已覆盖（本地）；线上探测列入 X2 | 单测覆盖 secret 未配置 503/不匹配 401（lib/webhook-auth 测试）；本机不可达生产 |
| 数据库备份 | ✅ 已执行（本地产物在库） | `backups/db/` 4 次运行（10-15 两次、10-16 两次，含 gallery_assets/projects JSON 全量）；`backups/db-offsite/offsite-report.json`（10-16 06:45） |
| R2 备份 | ✅ 已执行 | `backups/r2/` 4 次 + `backups/r2-offsite/offsite-report.json`（10-16 06:51） |
| 恢复演练 | ✅ 已执行 | `backups/restore-drill/` 4 次运行记录（最近 10-16 06:51） |
| 平台侧备份/PITR（Supabase Dashboard） | 🔒 用户侧待核验（U4） | 免费档是否含 PITR 未知，本机无 Dashboard 权限 |
| U1（撤销 sbp_ 令牌） | 🔒 用户侧，无法代验 | 需 Dashboard 操作确认 |

## 3. 性能优化状态表（`b2813ee`）

| 项 | 状态 | 证据 |
|---|---|---|
| 代码推送 | ✅ | `b2813ee` 为 `origin/main` 祖先（merge-base 验证） |
| 缓存策略（静态资源/公开页/API/后台边界） | 🔶 代码完成，线上 Header 未复测 | `next.config.ts`（该提交 106 行改动）定义 headers；本机不可达生产，无法抓线上 `cache-control`（X2 待办） |
| 图片优化（next/image 管线、尺寸预生成） | 🔶 代码完成 + 本地构建通过；线上传输体积未复测 | `lib/image-dimensions.ts` + `lib/generated/image-dimensions.json` 入库；本地 `next build` exit 0（历史批次记录）。线上 LCP/体积属 X2 |
| `/gallery`、`/projects` 分页筛选排序 | 🔶 代码完成；本地冒烟 51/51；线上未复测 | 同上 + `app/gallery/page.tsx` 252 行改动记录 |
| 首页/人物/日程/编年史回归 | 🔶 本地冒烟通过；线上未复测 | 冒烟清单覆盖首页/图库/作品/档案/日程/编年史（X2 清单） |
| SEO：sitemap/robots/canonical/404 | 🔶 代码完成；线上文件未抓取 | `app/sitemap.ts`（97 行重写）、`lib/seo.ts`；既有已知问题：**动态详情页对不存在 id 渲染 not-found UI 但返回 HTTP 200**（profiles/editorial/projects 同行为，审计已登记，未修） |
| 性能数字基线 | 📄 历史记录可用，非线上实测 | `docs/PHASE2_PERFORMANCE_REPORT.md`（424 行，含测试环境与方法说明） |

**收尾结论：** 性能批次的**代码与本地验证已完成**；缺口集中在「线上复测」一类，全部归入 X2（依赖可访问 lmsy.space 的网络环境），不存在需要新写代码的缺口。

## 4. 图片数据系统现状（只读盘点）

### 4.1 数据库结构（OpenAPI 实测，非文档转抄）

- **`gallery_assets`**（发布图库，330 行）：30 列。关联/背景字段：`project_id`（→projects）、`event_date`、`tag`、`catalog_id`、`magazine_issue`、`credits`、`curator_note`、`title/caption/excerpt` 三语 i18n。**没有 `source_url`/`source_platform`/`source_account` 列** —— 发布后的图无法保留原始出处链接（§4.4 详述）。
- **`draft_items`**（采集草稿，71 行：65 draft / 6 published）：32 列。溯源字段完整：`source_url`、`source_platform`、`source_post_id`、`raw_event_date`、`event_date`、`file_hash`（去重键，唯一索引）、`tags`、`project_id`、编年史字段。
- **`projects`**（25 行）：作品/项目/图集实体，含 `category`、`release_date`、`start_date/end_date`、封面、三语 i18n、portal 字段。
- **`profiles`**（2 行）：人物档案（`ig_handle`、`x_handle`）。
- **`chronicle_events`**（**0 行**）：编年史事件实体（`event_date`、`event_type`、`image_ids`）——结构已建好但从未使用。
- **`site_content_blocks`**（4 行）：站点文案块。
- **`admin_users`**：管理员表（anon 401，已验证）。

### 4.2 R2 存储与 CDN

- `npm run audit:r2` 实测（本轮）：**408 个对象，383 个被引用，25 个孤儿，0 个悬空引用**（数据库指向的每个对象都存在，无坏图）。孤儿数与第二批验收时一致（25→25），说明去重前移后没有新增垃圾。
- 命名规则：`draft/<uuid>.<ext>` 暂存，发布资产走正式前缀；访问经 `https://cdn.lmsy.space` 自定义域（代码 `lib/r2-client.ts`、探针引用）。
- 18 个已发布资产在 `draft/` 前缀（audit 输出），历史路径不规范但可用。

### 4.3 数据质量实测（全表扫描）

| 指标 | 结果 |
|---|---|
| `gallery_assets` tag 分布 | Magazine 237 / Advertising 54 / STAGE 12 / STILL 9 / Telegram 3 / 空 15 |
| `gallery_assets` 缺 `event_date` | **0**（100% 有日期） |
| `gallery_assets` 缺 `caption_i18n` | **318/330**（96% 无多语说明） |
| `gallery_assets` 缺 `catalog_id` / `title` | 18 / 15 |
| `gallery_assets` 重复 `image_url` | **0** |
| `draft_items` 缺 `source_url` / `event_date` / `title` | 0 / 0 / 0 |
| `draft_items` 重复 `r2_media_url` | **0** |
| `draft_items` 来源分布 | weibo 35 / telegram 30 / twitter 6 |
| 编年史 | 0 行（结构闲置） |

**结论：** 数据卫生现状**好于审计预期**（日期全覆盖、零重复、零悬空引用）。真实缺口是**语义富集**（caption/事件背景）与**发布后溯源**（见 4.4），不是脏数据清理。

### 4.4 采集→审核→发布链路的关键断点（本轮核实的新发现）

链路：Telegram Bot → `/api/webhooks/telegram`（或任意调用方 → `/api/ingest`）→ 下载→hash 去重→R2→`draft_items`（draft）→ 后台审核 → `to-gallery`/`publish` 转正。

**断点：`to-gallery` 转正时 `source_url`/`source_platform` 不带走。** 证据：`app/api/admin/drafts/[id]/to-gallery/route.ts` 第 33 行 select 列表为 `id,r2_media_url,media_type,title,description,event_date,tags,is_featured,project_id,chronicle_*`，且 `gallery_assets` 表根本没有这两列。也就是说：草稿阶段溯源信息完整，**一旦发布，用户在前台看不到任何原始出处，管理员也无法回查这张图从哪来**。这是第三阶段「来源可追溯」验收要求下的第一优先缺口。

次要缺口：① 无独立「事件」实体在用（chronicle_events 0 行），事件背景目前靠 `project_id` + `tags` + `curator_note` 承载；② `draft_items.tags` 是自由数组（含来源账号名），gallery_assets.tag 是单一分类字符串，两者语义不同（来源 vs 内容分类），转正时 info 有损；③ 无批次（batch）概念，无法回答「这 50 张是哪次采的、成功率多少」。

### 4.5 现有检索能力

- 前台：`/api/search` 已改查 `gallery_assets.caption_i18n/tag` + `projects`（第二批上线，实测命中）；`/gallery` 标签筛选四个真实 tag 均非空。
- 数据层：`gallery_assets` 有 `event_date`、`project_id`、`tag`、`catalog_id` 索引（迁移实测创建）；**按人物检索不支持**（无 person 关联列，profiles 与 gallery_assets 无外键）——当前「人物」维度靠项目归属与 tag 间接表达。

## 5. 已发现问题与证据汇总（本轮新增/确认）

1. **发布后溯源丢失**（新发现，P0 级 for Phase 3 目标）：`to-gallery` 不带 `source_url`，`gallery_assets` 无该列。证据：§4.4 代码行号。
2. **动态页 404 语义错误**（已知未修）：不存在 id 返回 HTTP 200。证据：审计报告登记 + 本地冒烟观察。
3. **caption_i18n 96% 为空**：多语内容工程未做。证据：§4.3 探针。
4. **25 个 R2 孤儿**：稳定未增长，处置待决策（保留或清理）。
5. **线上验收（X2）积压**：本机网络不可达 lmsy.space/api.telegram.org，线上复测全部排队。证据：本轮 fetch failed 实测。
6. **8a47a85 未推送**：纯文档，网络窗口补推。
7. **webhook 注册参数未直接核验**：功能在活（强间接证据），`status` 直查被网络挡住。

## 6. 尚未完成 / 无法验证事项清单（前两阶段收尾）

| 项 | 类型 | 阻塞点 |
|---|---|---|
| U1 撤销 sbp_ 令牌 | 用户操作 | Dashboard |
| U2 Vercel Production 变量核验 | 用户操作 | Dashboard |
| U3 webhook `status` 只读核验 | 网络可达后一条命令 | api.telegram.org 不可达 |
| U4 PITR/平台备份核验 | 用户操作 | Dashboard |
| X2 线上验收套件（性能/SEO/端到端/非法请求探测） | 网络可达后执行 | lmsy.space 不可达 |
| X1 杂志孤儿回填（283 张，脚本就绪） | 待站长决策 D3 | 决策本身；**建议并入第三阶段作为首批演练**（见 §9） |
| B3-T1 webhook 持久错误记录 + chat 白名单 | 代码待做 | 排期（建议随 Phase 3 管道一起做） |
| B3-T3 RSS 死通道注释 | 一处注释待写 | 排期（5 分钟） |
| B4-T1/T2 批量 API 与共享管道抽取 | 代码待做 | **即第三阶段技术方案主体**（§8） |
| B5-T1..T9 清理项 | 低优先级 | 可裁剪，不阻塞 Phase 3 |
| 动态页 200/404 语义 | 代码待做 | 排期 |

## 7. 第三阶段目标与数据模型建议

**目标（验收口径）：** 网站能持续增加图片，且每张新图尽可能具备：明确事件背景、事件日期（含精度）、可点击回查的原始出处。**不以图片数量为成功标准，以「可追溯率 + 元数据完整度 + 零错误关联」为标准。**

**数据模型结论：现有结构基本够用，只差三处增量**（均为小迁移，需你批准后才动）：

1. `gallery_assets` 加 `source_url text`、`source_platform text`（可空）→ 修复 §4.4 断点，发布后可回查原始内容；前台详情/灯箱可展示「来源」。
2. `draft_items` 加 `batch_id text`（可空，应用生成如 `b20261017-01`）→ 批次追踪：每批采集的条数/成功/重复/失败可统计，幂等重跑可对账。**不建新表**（符合护栏「不为采集另起架构」）。
3. 人物关联：**本期不建 person 关联表**。理由：人物只有 2 位（Lookmhee/Sonya），几乎全部内容天然是两人共同内容，独立实体收益为零；用 `draft_items.tags`/`gallery_assets.tag` + `project_id` 表达足够。若未来出现单人特写归档需求再升级。

事件背景承载：继续用 `projects`（杂志期/活动/写真集各为一项目）+ `event_date` + `curator_note`；`chronicle_events` 保持闲置，不强行启用。

## 8. 采集、元数据、审核流程与技术方案

### 8.1 来源盘点（A）

| 来源类型 | 可得信息 | 访问方式 | 稳定性 | 限制/合规 |
|---|---|---|---|---|
| Telegram Bot（你或协作粉推送） | 图 + 文案 + 来源链接（转发自带） | 已有 webhook，零开发 | 高（已实测批量 10 张/20 秒） | 人工动作；适合「看到就推」 |
| `/api/ingest`（脚本直调） | 传入 media_url + source_url + 日期等 | 已有 API + INGEST_API_KEY，已 e2e 验证 | 高 | 调用方需自备页面解析；**Phase 3 主通道** |
| 杂志/主办方/媒体官网（泰国 VOUGE、GQ 等） | 高清图 + 明确的拍摄主题与日期 | **按源写适配器脚本**（每个源一次解析逻辑，产 ingest 调用） | 中（站点改版会坏） | 公开页面；遵守 robots，限速，不带登录绕付费墙 |
| 官方 IG / X | 官方图文 | **当前无授权 API，不做自动抓取** | — | 登录墙/ToS 限制，标为「人工经 Telegram 推送」合规通道 |
| 微博 m.weibo.cn | 粉丝向搬运 | 公共 container API 本轮实测 **HTTP 432 拒绝**（需 cookie，不稳定） | 低 | 不作为 Phase 3 依赖 |
| RSSHub 公共实例 | 社交源聚合 | `rsshub.app` 被 Cloudflare 拦（代码注释 + 历史实测） | 不可用 | 自建实例可解但运维成本高；**本期不建** |
| 浏览器扩展 | 任意页面右键采集 | 已弃用（源码丢失，站长裁定暂不重写） | — | 人工 Telegram 通道替代 |

**明确不做：** 不「遍历网站抓所有图」；不抓取登录墙/付费内容；不启用 RSS 死通道。

### 8.2 每张图保留的信息（C）

| 字段 | 来源 | 必填？ | 人工？ |
|---|---|---|---|
| `r2_media_url`/`file_hash` | 管道自动 | 必填（自动） | 否 |
| `source_url` | 采集时传入 | **必填**（无来源的图不进库；Telegram 转发天然自带） | 人工可补 |
| `source_platform` | 管道 | 必填 | 否 |
| `source_account`/标题/说明 | 采集页解析 | 尽量 | 审核时校对 |
| `event_date`（事件日期）+ `raw_event_date`（原文日期串） | 采集页解析 | event_date 可空；**宁空勿猜**（未知日期标 null + `curator_note` 记「日期待核实」） | 是 |
| `project_id`（事件/项目归组） | 审核时人工选择 | 发布前必填（可先草稿态挂空） | **是** |
| `tags` | 来源账号/人工 | 可空 | 部分 |
| `curator_note` | 审核人 | 推测性信息一律写这里，与来源证据分离 | 是 |
| `batch_id` | 管道 | 必填（自动） | 否 |
| `created_at`（采集时间） | 管道 | 自动 | 否 |

原则：**文件名、采集时间、网页发布日期都不充当事件日期**；三者分开存（event_date / created_at / raw_event_date 已分离）。

### 8.3 流程（D）

```
发现来源 → 源适配器提取(图URL+标题+原文日期+原文链接)
  → /api/ingest 逐张: 下载 → file_hash 去重(唯一索引兜底) → R2 → draft_items(带 batch_id)
  → 审核台按 batch_id 拉列表: 补 project_id/event_date → 核对来源链接可达 → publish(转正带 source_url)
```

- 抓取成功 ≠ 合格：缺 `source_url` 或事件背景完全空白的记录**停在草稿态**并标注，不发布。
- 重复：hash 命中 → 返回 duplicate，不入库（已实测）；同事件多图 → 审核时人工归入同一 `project_id`，项目详情页按 `sequence` 排序（索引已建）。
- 幂等恢复：批次脚本重跑 = 逐张过 ingest，已入库的命中去重自动跳过，天然可恢复；失败清单按 batch_id 从 draft/ingest 响应汇总。
- 批次报告：每次跑完输出 `reports/batch-<id>.json`（总数/新增/重复/失败及原因）。
- 小批量验证：每批 ≤20 张，先草稿态全量人工过目再发。

### 8.4 来源追溯实现（E，核心验收）

- 原始出处：`source_url` 全程保留（需先做 §7 增量 1 的迁移）；前台图集详情/灯箱展示「来源」链接。
- 来源可达性检查：审核台人工点开核对（本期不做自动死链巡检；登记为后续观察项）。
- 证据与推测分离：来源链接/原文标题=证据字段；事件描述/人物关联的推测写 `curator_note` 并带「推测」标记。
- 交叉核实：同一事件多来源时，多张草稿归同一 project，note 中互链；不自动合并。
- 缺信息标记：`event_date` 为空 + note 标「待核实」，前台显示时不编造日期（当前模板对空日期已渲染为不显示）。

### 8.5 技术方案比较（F）

| 方案 | 兼容性 | 开发量 | 维护 | 恢复能力 | 风险 |
|---|---|---|---|---|---|
| ① 复用 `/api/ingest` + 每源适配器脚本（推荐主体） | 完全复用现有管道/去重/R2 | 每源 1 个脚本 + §7 两个小迁移 + to-gallery 保留 source_url | 低（脚本独立可坏可修） | hash 去重天然幂等 | 低 |
| ② 新增 `/api/ingest/batch`（= 原计划 B4-T2） | 复用管道，20 条/批上限 + 机器密钥鉴权（验收标准已定） | 1 路由 + 单测 | 低 | 同① | 中（改 API 面，需门禁） |
| ③ 共享 pipeline 模块抽取（= B4-T1） | 三入口复用 | 重构 + 全量单测 | 中 | 依赖测试兜底 | 中（重构主路径） |
| ④ 后台批次管理 UI | 新 UI | 大 | 高 | — | 违反「不建工作台」护栏，**不做** |

**推荐：** ① 先行（立即可跑），② 作为①稳定后的便捷封装，③ 推迟到重复代码真正造成维护痛时再抽。④ 不做。

### 8.6 小批量试运行设计（G，本轮不执行）

- **首批来源**：1 个杂志官网专题页（具体源待你确认，见 §10 决策 3）；备选：你手动 Telegram 推 10 张转发图（零开发，当天可跑）。
- **样本量**：≤20 张。
- **每条样本必须包含**：图文件 + `source_url` + 来源名 + 原文日期（或明确「未知」）+ batch_id。
- **追溯成功判定**：发布后在前台能从图跳到原文链接；管理员能从图反查草稿批次。
- **准确性衡量**：事件日期错误数 = 0（空可，错不可）；人物/项目归组错误数 = 0（人工审核保证）。
- **统计口径**：新增 / 重复 / 失败 / 缺字段四项计数进批次报告；`audit:r2` 孤儿数不得增加。
- **审核流程有效性**：≥1 张走完草稿→审核→发布→前台可见全链路。
- **扩批标准**：追溯率 100%、日期错误 0、失败率 <10%、审核单张耗时可接受 → 允许 50 张/批并加第二来源。

## 9. 推荐实施顺序（等你确认后执行）

1. **收尾包**（半天）：推 `8a47a85`；B3-T3 RSS 注释；to-gallery 保留 `source_url`（依赖 §7 增量 1 迁移，需你批准）。
2. **演练批**（可选但强烈建议）：X1 杂志回填 283 张走 dry-run→你审查→apply——它本身就是一次带映射的批量入库演练，且脚本已就绪。
3. **管道批**：`/api/ingest/batch`（方案②）+ B3-T1 webhook 持久错误记录；单测+冒烟+真实小图本地验证。
4. **首采批**：按 §8.6 跑 20 张试运行，出批次报告，你审核后发布。
5. **线上验收**：网络可达时一次性销项 X2（性能/SEO/端到端/webhook status）。

## 10. 需要你确认的关键决策

| # | 决策 | 建议 |
|---|---|---|
| 1 | 是否批准两个小迁移：`gallery_assets` 加 `source_url/source_platform`、`draft_items` 加 `batch_id` | **建议批准**（可空列、纯增量、幂等脚本，是「来源可追溯」的硬前提） |
| 2 | to-gallery 转正保留 source_url 的行为变更 | **建议批准** |
| 3 | 首批试运行来源选哪个（具体杂志/专题页 URL） | 待你指定；或先用 Telegram 人工推 10 张零开发跑通 |
| 4 | X1 杂志回填（283 张）是否作为演练批先做 | **建议做**（D3 此前悬而未决，正好并入本阶段） |
| 5 | caption_i18n 96% 为空是否需要翻译补全（依赖 OPENROUTER_API_KEY） | 建议后置，不阻塞采集 |
| 6 | 25 个 R2 孤儿：保留观察 or 生成清单人工确认后清理 | 建议先保留，出清单再定 |

---

**本轮结束状态自查：** 未启动采集 ✅｜未批量上传 ✅｜未发布草稿 ✅｜未修改生产数据/未执行迁移 ✅｜未重构 ✅｜本轮仅新增本文件（Git diff 见提交）✅。
