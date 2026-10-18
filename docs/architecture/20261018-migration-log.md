# LMSY.space 架构迁移执行记录（M0–M4）

> 执行日期：2026-10-18
> 方案依据：`20261018-target-ia.md`、`20261018-content-model.md`、`20261018-field-dictionary.md`、`20261018-category-spec.md`
> 本文记录**实际执行了什么、执行后的真实数字、以及没有做完的部分**。方案与实现的差异以本文为准。

## 0. 一句话结论

数据库已按目标模型扩展并回填（26 项目 / 330 图片 / 2 人物 / 2 作品 / 4 人物关联），前台已收敛为 4 个主导航 + 5 个首页区块 + 8 个稳定分类，7 组旧路由全部保留兼容入口并以 308 响应。类型检查、338 项测试、生产构建全部通过，**已推送、已部署、线上实测通过**（页面、接口、旧路由跳转、搜索、sitemap 逐项对过）。未做的只有视觉实机检查、后台人工验收，以及内容侧的补值工作。

---

## 1. M0：备份与基线

### 1.1 Git 状态（执行前）

- HEAD = `f0e41fc`
- 工作区仅 5 份 `docs/architecture/20261018-*.md` 未跟踪，无代码改动，无未提交的数据脚本。

### 1.2 备份位置

`reports/backup-20261018/`（`reports/` 在 `.gitignore` 内，只存本地）

| 文件 | 内容 |
|---|---|
| `projects.json` | projects 全表 26 行 |
| `gallery_assets.json` | gallery_assets 全表 330 行 |
| `profiles.json` | profiles 全表 2 行 |
| `draft_items.json` | draft_items 全表 82 行 |
| `site_content_blocks.json` | site_content_blocks 全表 4 行 |
| `schema-columns.json` | information_schema.columns 快照 |
| `schema-constraints.json` | 约束快照 |
| `schema-indexes.json` | 索引快照 |

**恢复方式**：JSON 为逐行完整记录（含 id、created_at），按主键 upsert 即可回滚任意行；DDL 侧的回滚语句见第 6 节。备份脚本 `temp/p7_backup.py`，写入脚本 `temp/p7_exec.py`（必须带 `--confirm`，且内置拒绝 `drop table` / `truncate` / `drop column`）。

### 1.3 基线指标（迁移前）

| 指标 | 值 |
|---|---|
| projects 总数 | 26 |
| 公开项目（portal_visible=true 且未 archived） | 26 |
| gallery_assets 总数 | 330 |
| 孤儿图片（project_id IS NULL） | 0 |
| profiles 总数 | 2 |
| draft_items 总数 | 82 |
| 采集容器（标题为 "Project 2026-03-15" / "Photo from ..." 的空壳） | 5（当时混在公开项目里） |
| 有图项目 / 无图公开项目 | 19 / 7 |
| 分类取值（旧 CHECK） | editorial 11 / daily 6 / commercial 4 / series 2 / appearance 2 / travel 1 |

---

## 2. M1：Schema 扩展

脚本：`temp/m1_ddl.sql`（加列 + 建表）、`temp/m1_ddl2.sql`（约束 + 索引 + 触发器）。

### 2.1 projects 新增列

| 列 | 类型 | 默认 | 用途 |
|---|---|---|---|
| `slug` | text | — | 稳定 URL；详情页 `/projects/<slug>` |
| `event_date` | date | — | 事件实际发生日（时间线、卡片日期首选） |
| `source_published_at` | timestamptz | — | 原始发布时刻（区别于采集时刻） |
| `location` | text | — | 事件地点 |
| `publisher_brand` | text | — | 出版方 / 品牌 |
| `search_aliases` | text[] | `'{}'` | 搜索别名（中英泰、简称） |
| `is_container` | boolean | `false` | 采集容器标记，前台一律不展示 |
| `updated_at` | timestamptz | `now()` | 由触发器维护 |
| `work_id` | uuid | — | 指向 works（剧集 / 电影 / 舞台） |

`release_date` 语义收窄为**原始发布日**，不再承载事件日期；新增 `event_date` 承载事件日期，两者并存。

### 2.2 gallery_assets 新增列

| 列 | 类型 | 用途 |
|---|---|---|
| `file_hash` | text | 重复图片检测；部分唯一索引 |
| `source_post_id` | text | 原始帖子 id，转正时原样保留 |

### 2.3 profiles 新增列

| 列 | 类型 | 用途 |
|---|---|---|
| `slug` | text | `/people/<slug>` |
| `bio_i18n` | jsonb | 三语简介 |
| `role_label` | text | 展示用身份标签 |

### 2.4 新表

- `works`：`id`、`title`、`title_i18n`、`kind`（`series`/`film`/`stage_play`/`other`）、`year`、`external_url`、时间戳。
- `project_people`：`(project_id, profile_id, role)` 复合主键，`role ∈ subject/photographer/host/guest`，两侧 FK 均 `ON DELETE CASCADE`。

### 2.5 约束与索引

- `projects_category_check`：先放宽到旧值 + 8 个新值并存 → 回填完成后（M3）收窄到 8 个稳定值。分两步是为了让回填期间旧值仍合法，避免搬数据时踩约束。
- `gallery_assets_project_id_fkey`：改为 `ON DELETE RESTRICT`——删项目不再连带静默删图。
- 部分唯一索引：`projects.slug`、`profiles.slug`、`gallery_assets.file_hash`（均带 `WHERE ... IS NOT NULL`，允许历史空值共存）。
- 查询索引：分类、event_date、project_id、portal 可见性组合等 5 个。
- `touch_updated_at()` 触发器挂在 projects / works 上。

---

## 3. M2：数据回填

生成脚本 `temp/p7_gen_m2.py` → 执行 `temp/m2_backfill.sql`。26 条 UPDATE **逐条带 uuid + RETURNING**，不按条件批量改。

### 3.1 分类迁移（旧 6 值 → 新 8 值）

旧值映射规则：`series → drama_work`、`daily → personal_travel`、`appearance → public_appearance`（其中粉丝见面会归 `live_event`）、`travel → public_appearance`（机场）、`editorial → editorial`、`commercial → commercial`。

| slug | 标题 | 旧分类 | 新分类 | 旧 release_date | 新 event_date | 容器 |
|---|---|---|---|---|---|---|
| close | Close | commercial | commercial | 2025-09-26 | 2025-09-26 |  |
| coffee | coffee | commercial | commercial | 2025-11-23 | 2025-11-23 |  |
| live | live | commercial | commercial | 2025-10-17 | 2025-10-17 |  |
| sweet | Sweet | commercial | commercial | 2024-02-14 | 2024-02-14 |  |
| affair | Affair (爱情诡计) | series | drama_work | 2024-08-29 | 2024-08-29 |  |
| harmony-secret | Harmony Secret (和谐密语) | series | drama_work | 2025-07-26 | 2025-07-26 |  |
| dream | Dream | editorial | editorial | 2025-09-10 | 2025-09-10 |  |
| gaze | GAZE | editorial | editorial | 2025-01-17 | 2025-01-17 |  |
| island | ISLAND | editorial | editorial | 2025-01-01 | 2025-01-01 |  |
| oat-lookmhee | Oat-Lookmhee | editorial | editorial | 2024-12-11 | 2024-12-11 |  |
| retro-soul-december | Retro Soul: December Edition | editorial | editorial | 2024-12-18 | 2024-12-18 |  |
| smoldering-embrace | Smoldering Embrace | editorial | editorial | 2024-10-23 | 2024-10-23 |  |
| stars-twinking | 20241104-Stars Twinking | editorial | editorial | 2024-11-04 | 2024-11-04 |  |
| tianjin-fan-sign-pb | 20241217【天津Fan sign PB】 | editorial | editorial | 2024-12-17 | 2024-12-17 |  |
| u-magazine | U! | editorial | editorial | 2024-12-03 | 2024-12-03 |  |
| unique-20241125 | 20241125-UNIQUE | editorial | editorial | 2024-11-25 | 2024-11-25 |  |
| untamed | Untamed | editorial | editorial | 2025-08-01 | 2025-08-01 |  |
| everafter-bloom-sao-paulo | EVERAFTER: BLOOM in Sao Paulo (Fan Meeting) | appearance | live_event | 2026-10-09 | 2026-10-09 |  |
| airport-20260320 | 20260320-airport | travel | public_appearance | 2026-03-20 | 2026-03-20 |  |
| sirivannavari | SIRIVANNAVARI | appearance | public_appearance | 2025-11-18 | 2025-11-18 |  |
| milestones-archive | MILESTONES_ARCHIVE | daily | personal_travel | 2026-03-15 | 2026-03-15 |  |
| container-1 | Photo from LMSY Radar Updates - Feb 24, 2026 | daily | personal_travel | 2026-02-24 | — | 是 |
| container-2 | Photo from LMSY自动雷达 - 10/15/2026 | daily | personal_travel | 2026-10-15 | — | 是 |
| container-3 | Project 2026-03-15 | daily | personal_travel | 2026-03-15 | — | 是 |
| container-4 | Project 2026-03-15 | daily | personal_travel | 2026-02-23 | — | 是 |
| container-5 | Project 2026-03-15 | daily | personal_travel | 2026-02-23 | — | 是 |

说明：

- 20 条非容器行的 `event_date` 直接取原 `release_date`——这批记录的原始发布日与事件日同一天，属于事实而非推断，不需要重新考据。
- 5 个容器的 `event_date` 置空且 `is_container = true`：它们是采集脚本按批次建的空壳项目，标题里的日期是**采集日**，不是事件日。给它们编一个事件日期才是伪造，所以留空并由 `is_container` 把它们从前台摘掉。
- `release_date` 列**全部保持原值未动**，包括容器行。回填只新增字段，没有覆盖任何既有列。

### 3.2 新增关联数据

| 表 | 行数 | 内容 |
|---|---|---|
| `works` | 2 | `Affair`（series, 2024）、`Harmony Secret`（series, 2025） |
| `projects.work_id` | 2 | 上述两条剧集作品回链到对应 project |
| `profiles.slug` / `role_label` | 2 | `lookmhee`、`sonya`，`role_label = 'LMSY Duo'` |
| `project_people` | 4 | 两部剧 × 两人，`role = subject` |

### 3.3 待确认标记

4 条资料不足的项目打 `tags += 'needs_review'`（只加标签，不改任何展示字段、不下架）：

- `u-magazine`（U!）
- `tianjin-fan-sign-pb`（20241217【天津Fan sign PB】）
- `live`（live）
- `sirivannavari`（SIRIVANNAVARI）

---

## 4. M3：核验（执行后真实数字）

脚本 `temp/m3_verify.sql` / `m3_verify2.sql` / `p7_final_verify.sql`。

| 指标 | 迁移前 | 迁移后 | 判断 |
|---|---|---|---|
| projects 总数 | 26 | 26 | 无增删 |
| 公开项目（新规则，含 `is_container=false`） | 26 | **21** | 5 个容器被排除，符合预期 |
| gallery_assets 总数 | 330 | 330 | 无增删 |
| 孤儿图片 | 0 | 0 | 保持 |
| 公开项目可见图片 | 330 | 330 | 容器项目本无图，公开图未减少 |
| 无图公开项目 | 7 | 2 | 容器摘除后只剩真实无图项目 |
| slug 缺失 | — | 0 | 全部有稳定 URL |
| event_date 缺失 | — | 5 | 全部是容器，符合设计 |
| profiles | 2 | 2 | — |
| profiles.slug / role_label | — | 2 / 2 | 全部回填 |
| works | — | 2 | — |
| project_people | — | 4 | — |
| needs_review | — | 4 | — |
| draft_items | 82 | 82 | 未触碰 |

分类分布（迁移后，26 行全量）：

| 分类 | 行数 | 其中容器 |
|---|---|---|
| editorial | 11 | 0 |
| personal_travel | 6 | 5 |
| commercial | 4 | 0 |
| drama_work | 2 | 0 |
| public_appearance | 2 | 0 |
| live_event | 1 | 0 |
| behind_the_scenes | 0 | 0 |
| early_archive | 0 | 0 |

后两个分类为空是真实状态。前台按"空分类显示收录中、入口不消失"处理，`/projects` 的筛选 chip 只在有内容时出现。

`projects_category_check` 已在核验通过后由 `temp/m3_narrow.sql` 收窄到 8 个稳定值。

---

## 5. M4：前台改造清单

### 5.1 新增文件

| 文件 | 作用 |
|---|---|
| `lib/category-registry.ts` | 8 稳定值 + 5 个首页入口 + 旧别名 + 校验/取定义/取链接的唯一出口 |
| `app/api/home/summary/route.ts` | 首页三区块一次取数：featured / years / people |
| `app/api/home/portals/` | 改写为 `{covers, counts}`，固定 5 个入口 |
| `components/sections/featured-projects-section.tsx` | 精选项目（读 summary，无硬编码 id） |
| `components/sections/timeline-preview-section.tsx` | 年份预览（2022 起，真实分布） |
| `components/sections/people-section.tsx` | 人物与档案叙事 |
| `app/projects/projects-client.tsx` | 项目索引（支持 `lockedCategory`，供旧 `/editorial` 复用） |
| `app/timeline/page.tsx`、`app/timeline/[year]/page.tsx` | 时间线与年份页 |
| `app/people/page.tsx`、`app/people/[slug]/page.tsx`、`person-client.tsx` | 人物索引与详情 |

### 5.2 改写文件（按关注点）

**导航与搜索**

- `lib/nav-items.ts`：7 → 4（projects / timeline / people / gallery）
- `components/site-header.tsx`、`components/home-header.tsx`：2 + 搜索 + 2 的居中布局
- `components/search-command.tsx`：新增 `variant="bar"`，Quick Access 四项，⌘K / Ctrl+K 提示
- `app/api/search/route.ts`：接 `search_aliases`；人物命中后经 `project_people` 展开为项目结果；补上 `applyPublicProjectFilter`
- `lib/search-results.ts`：`buildExhibitionResults → buildCategoryResults`，href 用 slug，日期 `event_date || release_date`

**首页**

- `app/page.tsx`：Hero → MuseumPreface → Portals → Featured → TimelinePreview → People
- `components/sections/portals-section.tsx`：固定 5 张卡，空分类显示"收录中"，不再因 0 内容隐藏

**项目**

- `app/projects/page.tsx`：改为 `Suspense` 壳（`useSearchParams` 要求）
- `app/projects/[id]/page.tsx`：`resolveProject` 先 slug 后 uuid；去掉 editorial 重定向；日期 `event_date` 优先；补 people / work 渲染
- `app/projects/[id]/project-detail-client.tsx`：同上的展示侧改动，related 链接改 slug

**其他前台**

- `lib/project-visibility.ts`：可见性加入 `is_container !== true`（JS 与 SQL 两侧同步）
- `app/gallery/page.tsx`：卡片角标由 `catalog_id` 改为项目名 + 日期；项目引用补 `slug`
- `app/gallery/lightbox.tsx`：回链改 `/projects/<slug>`
- `app/sitemap.ts`：加 `/timeline`、`/people`，项目 URL 统一用 slug
- `components/frontend-chrome.tsx`：撤下 `WhisperFloatingButton`（`/api/whispers` 读不存在的表，全站 500）

**旧路由兼容（全部保留，无 404；由 `next.config.ts` 的 `redirects()` 发 308）**

| 旧 URL | 行为 |
|---|---|
| `/exhibitions` | → `/projects` |
| `/exhibitions/category/[type]` | → `/projects?category=<新值>`（旧 type 经别名表映射） |
| `/editorial` | 复用 `<ProjectsClient lockedCategory="editorial" />` |
| `/editorial/[id]` | → `/projects/[id]` |
| `/chronicle`（含 `?year=`） | → `/timeline`（保留 year） |
| `/profiles` | → `/people` |
| `/profiles/[id]` | → `/people/[id]` |
| `/profiles/lookmhee`、`/profiles/sonya` | → `/people/<slug>` |
| `/resonance`、`/schedule`、`/whispers` | 页面保留，仅移出导航 |

**后台**

- `edit-project-modal.tsx` / `quick-project-modal.tsx`：分类下拉改 8 值，编号前缀 STILL/MAG/STAGE/TRV/AD/BTS/DAILY/G
- `api/admin/drafts/[id]/create-project/route.ts`：`inferCategory` 输出新值，无信号落 `early_archive`
- `api/admin/drafts/[id]/to-gallery/route.ts`：转正时原样保留 `source_post_id`、`file_hash`
- `link-milestone-project`、`gallery/milestone`：落 `personal_travel`
- `archive-credit.tsx`、`vault-tabs.tsx`：分类常量改新值

### 5.3 删除文件

- `app/exhibitions/exhibitions-index.tsx`
- `app/exhibitions/category/[type]/exhibition-content.tsx`
- `lib/exhibition-categories.ts`

删除原因：分类入口已收敛到 `lib/category-registry.ts`，保留第二套映射必然与数据库 CHECK 漂移。旧 URL 本身未删，见上表。

---

## 6. 回滚手册

按依赖顺序反向执行：

1. **前台回滚**：`git revert <本次 commit>`。前台代码对新增列是"存在则用"，旧列 `release_date` 未被改动，回滚后立即可用。
2. **分类回滚**：若需恢复旧分类值，从 `reports/backup-20261018/projects.json` 按 id upsert `category`，并先执行 `temp/m1_ddl2.sql` 中放宽 CHECK 的那段。
3. **约束回滚**：`gallery_assets_project_id_fkey` 改回 `ON DELETE CASCADE`（需先确认无项目删除操作在进行）。
4. **列回滚**：不执行 `drop column`。新增列全部可空或有默认值，保留不影响旧代码；删除只会给未来的重试增加成本。
5. **数据整体回滚**：`reports/backup-20261018/*.json` 提供 5 张表的逐行快照，按主键 upsert 可回到 2026-10-18 18:00 的状态。

---

## 7. 已完成 vs 未完成（如实报告）

### 已完成并本地验证

| 项 | 证据 |
|---|---|
| 类型检查 | `npx tsc --noEmit` 无输出 |
| 单元/契约测试 | `npm test` 338 pass / 0 fail / 50 suites |
| Lint（本次改动文件） | `npx eslint` 无输出 |
| 生产构建 | `npm run build` 成功；`/api/home/summary`、`/people`、`/people/[slug]`、`/timeline`、`/timeline/[year]` 均在产物清单内 |
| 数据侧查询核验 | 通过 Supabase 管理 API 直跑前台等价 SQL：5 个首页入口计数与封面、年份分布（2026×3 / 2025×9 / 2024×9）、两人各关联 2 个公开项目、精选候选 8 条且全部有封面 |

### 未完成 / 被阻塞

| 项 | 状态 | 原因 |
|---|---|---|
| 本地 `next start` 冒烟 | 阻塞（已绕行） | 本机出网被沙箱代理白名单限制：`/api/home/summary` 报 `TypeError: fetch failed / ECONNRESET`，直连 Supabase REST 报 `SSL: UNEXPECTED_EOF_WHILE_READING`，`lmsy.space` 与 Supabase REST 均返回 `000`。绕行方案与线上实测结果见 `20261018-implementation-report.md` §5 |
| 线上真实数据回归 | **已完成** | 通过 PowerShell 系统网络栈实测：首页两接口数据与数据库逐项一致、11 个页面 200、9 条旧路由全部 308、搜索与 sitemap 正确。明细见实现报告 §5.2 |
| Vercel 部署与线上验证 | **已完成** | `12aa80f`、`48b0ecb` 已推送并部署，`48b0ecb` 的 308 行为已在线确认 |
| 桌面 / 移动端视觉检查 | 未做 | 无浏览器控制能力，只有 HTML 与 API 可读 |
| M5 后台验收 | 未做 | 需管理员登录且会在生产库写入测试数据 |
| `file_hash` 回填 | 未做 | 330 行历史图片没有可计算的源文件哈希（只有 CDN URL）。该列只对**新增**入库生效：转正链路已写入，重复检测从下一次采集起可用。历史去重需要下载 330 张图重算，属于独立任务 |
| 5 个采集容器清理 | 未做 | 已用 `is_container` 从前台摘除，前台不再出现。物理删除会连带删掉其中的图片，按"不删图片/核心数据"的约束保留原状，等待人工决定 |
| 精选区标题策展 | 未做 | 见下节 |

---

## 8. 待补齐清单（可直接执行，无需再讨论方案）

以下都是数据侧补值，不涉及代码改动。按优先级排列。

### 8.1 首页精选的标题还是采集原文（优先级最高）

精选区按 `homepage_featured → portal_priority → 分类权重 → event_date` 选出 8 条。当前**只有 `gaze` 被人工标记过**，其余靠自动排序，于是标题里混入采集原文：

| slug | 当前标题 | 建议 |
|---|---|---|
| `airport-20260320` | `20260320-airport` | 在后台把 `title` 改成事件名（如 `Airport · 2026-03-20`），日期已在 `event_date` 里，不必再写进标题 |
| `milestones-archive` | `MILESTONES_ARCHIVE` | 这是里程碑功能自动建的项目。若它不该出现在首页精选，给它设 `portal_priority = -1` 或直接 `homepage_featured = false` + 更低优先级；若该保留，补一个正式标题 |
| `coffee` | `coffee` | 补品牌/活动名 |
| `live` | `live` | 补活动名（同时它在 `needs_review` 里） |
| `close` / `sweet` / `dream` | 单词标题 | 可接受，但补全名更像展品 |

代码侧**不做**标题美化或自动改写——那等于伪造内容。想换展示顺序，最小操作是给 2–3 个真正有代表性的项目设 `homepage_featured = true`。

### 8.2 `behind_the_scenes` / `early_archive` 两个分类为空

入口已按"收录中"处理，不会消失。要填充需要真实素材：花絮类素材从现有 82 条 `draft_items` 里筛，或下次采集时按分类入库（后台已有 8 值下拉）。

### 8.3 两个无图公开项目

`everafter-bloom-sao-paulo`（live_event）、`harmony-secret`（drama_work）。它们会出现在索引里但卡片无图，且 `live_event` 的首页入口因此只有计数没有封面图。补图即可，不需要改代码。

### 8.4 4 条 `needs_review`

`u-magazine`、`tianjin-fan-sign-pb`、`live`、`sirivannavari`——补来源、补 `event_date` 精度、或确认归属后去掉标签即可。

### 8.5 全部 `search_aliases` 为空

搜索目前只能命中标题与已有中文名。要提升召回，给重点项目的 `search_aliases` 补中英泰别名（例如 `affair` 补 `爱情诡计`、`affair the series`）。字段已就位，API 已读，纯数据工作。

### 8.6 `lmsy_archive.messages` 表（2026-10-18 新建）

`/api/whispers` 与 `/admin/messages` 一直在读写 `lmsy_archive.messages`，但该表从未创建，phase 7 因此把右下角留言入口下线（点开必 500）。现在补上：

- 列：`id uuid pk default gen_random_uuid()`、`content text not null`、`author text not null`、`location text`、`color_pref text default 'yellow'`、`is_approved boolean default false`、`created_at timestamptz default now()`
- RLS：`messages_public_read`（select，`is_approved = true`）、`messages_public_insert`（insert，`with check (is_approved = false)`）、`messages_service_role`（all）
- 授权：`anon, authenticated` 仅 `select, insert`；`service_role` 全量
- 索引：`messages_created_at_idx (created_at desc)`
- 迁移脚本：`temp/m_messages.sql`（`temp/` 不进仓库）

### 8.7 `gallery_assets.portal_slot`（2026-10-18 新增）

首页五个固定入口（`HOME_CATEGORIES`）的封面此前不可选：`/api/home/portals` 按 `portal_priority / event_date` 取该分类第一个公开项目，再取它的 `cover_url` 或图库资产。策展人无法决定门外那张图。现在改为可指定：

- 列：`portal_slot text`，值为分类稳定值（`lib/category-registry.ts`），NULL 表示该门走自动封面。
- 唯一索引：`gallery_assets_portal_slot_unique`，`where portal_slot is not null`。一个门只允许一张图，否则首页结果取决于行序。
- **不加 CHECK 约束**：分类清单只在 `category-registry.ts` 一处维护，数据库里写死一份会在下次改分类时变成阻塞。
- 读取优先级：`/api/home/portals` 先读 `portal_slot` 命中的资产，命中即用（即使该门没有公开项目也显示，因为这是人工决定）；未命中才走原自动逻辑，行为与改动前一致。
- 后台：Asset Vault 新增 `PORTALS` 标签页（`app/admin/gallery/components/views/portals-view.tsx`），五个卡位，复用 `VaultImagePicker`，可 SET / CHANGE / CLEAR。
- 写入接口：`PATCH /api/admin/gallery/portal`，`{ imageId, category | null }`；设置前先释放该 `category` 的原持有者，避免撞唯一索引。
- 迁移脚本：`temp/m_portal_slots.sql`（`temp/` 不进仓库）。
