# 第三阶段第二批：现状审计、字段决策与候选事件清单（v1.0，2026-10-16）

**状态：阶段 A/B/C 完成，停在检查点。未做任何代码改动、未建项目、未入库任何图片。**
本批固定顺序：审计 → 字段决策 → 事件确认（本文档）→ 站长确认 → 最小改动 → ≤20 张试运行 → 人工审核验收。

---

## 1. 阶段 A：现状审计（证据均为实测）

### 1.1 数据库真实结构（PostgREST OpenAPI + 实际查询，2026-10-16）

**projects（25 行）**

| 字段 | 类型 | 与本批的关系 |
|---|---|---|
| `title` / `title_i18n` | varchar / jsonb | 项目名（多语言） |
| `category` | varchar | 项目类别（描述注明 Orbit 分类体系；现有值如 `daily`） |
| `start_date` / `end_date` | date，可空 | **可直接表达活动日期/日期范围**，不确定可留空 |
| `release_date` | date | 现列表/排序用的主日期 |
| `description` / `description_i18n` | text / jsonb | 事件背景、地点、证据来源均可写在这里 |
| `cover_url` | text | 项目封面 |
| `curation_status` | text | **draft / published / archived**——"候选项目不自动公开"的字段基础 |
| `portal_visible` / `portal_priority` | bool / int | 首页门户可见性（与公开列表是两回事，见 §1.3） |
| `catalog_id` / `tags` / `is_ongoing` / `theme_statement*` | — | 本批不动 |

**没有地点（location/venue）字段。**

**draft_items（73 行；status: draft 67 / published 6；platform: weibo 35 / telegram 32 / twitter 6）**

| 字段 | 与本批的关系 |
|---|---|
| `project_id`（FK→projects.id，可空） | **入库时/审核时绑定项目的现成通道**；现有 33/73 条已带值 |
| `file_hash`（唯一索引） | 幂等去重依据（已验证：重灌返回 duplicate，不产生新记录） |
| `tags`（text[]） | 现有值全是采集渠道词（Telegram/Channel 等）；**可承载本批的分类语义** |
| `curator_note` / `event_date` / `raw_event_date` | 证据说明 / 事件日期语义（批 1 已修） |
| `sequence_order` | 同组图片排序 |
| `batch_id` | **不存在**（OpenAPI 确认） |

**gallery_assets（330 行，100% 有 project_id）**

| 字段 | 与本批的关系 |
|---|---|
| `project_id`（FK） | 资产与项目关联的现成方式 |
| `source_url` / `source_platform` / `source_account` | 批 1 新增的来源三列；account 目前全空（下游没人传） |
| `tag`（单值） | 内容分类（Magazine 237 / Advertising 54 / STAGE 12 / STILL 9 / Telegram 3 / null 15） |
| `event_date` / `curator_note` / `sequence` / `catalog_id` | 直接复用 |

### 1.2 API 与业务逻辑审计

| 能力 | 现状 | 证据 |
|---|---|---|
| `/api/ingest` 入参 | `source_url`、`source_platform`、`media_url`、`title/description`、`event_date`、`raw_event_date`、`tags`、`source_post_id`、`original_text`；**不支持 `project_id`/`batch_id`/`source_account`**，插入时不带 project_id | `lib/supabase/types.ts` L276-292、`app/api/ingest/route.ts` L240-264 |
| ingest 幂等 | file_hash 下载后先查重（不传 R2）+ 唯一索引 23505 兜底 + 插入失败补偿删 R2 对象；单次单图 | ingest route L181-233、L268-323 |
| 项目创建 | **存在**：`POST /api/admin/drafts/[id]/create-project`——从草稿建项目，自动 `curation_status:'draft'`、`portal_visible:false`，并把该草稿 `project_id` 绑上去；草稿已绑项目时幂等返回已有项目 | `app/api/admin/drafts/[id]/create-project/route.ts` |
| 项目修改 | `PATCH /api/admin/projects/[id]`（含 curation_status）；**集合级 POST（凭空建项目）不存在** | `app/api/admin/projects/[id]/route.ts` |
| 草稿→正式资产 | 单条 `to-gallery`：要求草稿已有 `project_id`，携带 source_url/source_platform（批 1 修复）；**不带 source_account**（草稿表也没有该列） | `app/api/admin/drafts/[id]/to-gallery/route.ts` L34、L110-113 |
| 批量发布 | `POST /api/admin/drafts/batch-publish` 只把 `draft_items.status` 改为 `published`，**不生成 gallery_assets**——"批量改状态"≠"批量转正"；真正的转正只有单条 to-gallery | `app/api/admin/drafts/batch-publish/route.ts` |
| 按项目审核 | 后台草稿页**没有**按 project_id 筛选的视图 | `app/admin/drafts/page.tsx` 无 project 过滤 |
| to-gallery 重复执行防护 | **没有**：同一条草稿二次转正会生成重复资产（批量操作下双击风险真实存在） | 同 route，insert 前无存在性检查 |

### 1.3 一个必须报告的公开性问题

公开页 `/projects` 列表和 `/projects/[id]` 详情**都不过滤 `curation_status`**（`app/projects/page.tsx` L60-64、`app/projects/[id]/page.tsx` L54）。即：新建的"候选项目"（curation_status='draft'）会出现在公开项目列表里（页面内容为空壳，但标题可见）。图片本身安全——`gallery_assets` 只有转正才产生。**要满足"项目审核前不公开"，需要给两处公开查询补过滤**（注意存量项目多为 NULL，需 `published OR NULL` 语义，否则会误伤现有 25 个项目）。

---

## 2. 字段三分类决策表

| 结论 | 项目 | 处理 |
|---|---|---|
| **现有字段足够，直接复用** | 项目名/title_i18n、类别 category、活动日期 start_date/end_date（可空）、封面 cover_url、项目背景与地点 → description(_i18n) | 不改数据库。地点不新增列，写进 description（证据式文本），未来确有筛选需求再加 |
| | 图片↔项目绑定 → `draft_items.project_id` / `gallery_assets.project_id` | 复用 |
| | 幂等 → `file_hash` 唯一索引 + ingest 现有查重 | 复用，不重做 |
| | 图片分类语义（来源身份/场景/人物范围）→ `draft_items.tags[]` + `curator_note`；发布分类 → `gallery_assets.tag` | 复用（规则见 §4）；不新增分类字段 |
| | 批次号追踪 → `batch_id` | **不存在**，见下 |
| | 候选项目不公开 → `curation_status='draft'` + `portal_visible=false` | 字段在，但公开查询未过滤 → 补代码（§3-3） |
| **字段/代码存在但流程未用，补业务逻辑** | `create-project` 已有但从未被批量流程使用 | 本批流程正式启用：先查重 → create-project → 绑定 |
| | `gallery_assets.source_account` 列已建但全链路没人传值 | ingest 增加 source_account 入参并打通到 to-gallery |
| | `sequence_order` | 同事件多图排序时启用 |
| **确实缺少，最小扩展** | ① `draft_items.batch_id`（nullable text + 普通索引） | 新迁移（此前方案已预告，仍未建）：批次查询/统计/恢复 |
| | ② `draft_items.source_account`（nullable text） | 同一迁移顺带：来源账号从采集贯通到 `gallery_assets.source_account` |
| | ③ `/api/ingest` 接受可选 `project_id`、`batch_id`、`source_account` | 代码改动，向后兼容（不传行为不变；project_id 先验证存在再写入，防 FK 500） |
| | ④ to-gallery 增加防重复转正守卫 + 透传 source_account | 代码改动 |
| | ⑤ 公开 projects 两处查询补 curation_status 过滤 | 代码改动（§1.3） |
| | ⑥ 后台草稿列表支持按 `batch_id`/`project_id` 筛选（GET query 参数 + UI 下拉） | 代码改动，满足"按项目/按批次审核" |
| | ⑦ 批量转正 | **不加新服务端接口**：后台 UI 对选中草稿循环调用现有单条 to-gallery，逐条回报成功/失败（复用已验证逻辑，风险最小） |

**本批明确不做**：location 列、事件/人物关联表、采集工作台、自动匹配算法（首批用人工核对的事件匹配）、全量采集、自动发布、历史数据回改。

---

## 3. 最小实施方案（待批准后执行）

改动 5 个文件级单位 + 1 个迁移，全部向后兼容：

1. **迁移 `20261016_drafts_batch_provenance.sql`**：`ALTER TABLE draft_items ADD COLUMN batch_id text, ADD COLUMN source_account text; CREATE INDEX draft_items_batch_id_idx ON draft_items(batch_id);`（均可空，纯增量，回滚 = DROP 两列一索引；预计 0 行数据变化）
2. **`/api/ingest`**：+3 个可选参数，落库到草稿；project_id 先查存在性
3. **to-gallery**：透传 source_account；insert 前按 `image_url = r2_media_url` 查重，已存在返回 duplicate（幂等守卫）
4. **公开 projects 查询 ×2**：`.or('curation_status.eq.published,curation_status.is.null')`
5. **后台草稿页**：批次/项目筛选 + "批量转正"按钮（循环单条接口，逐条回报）
6. 批次报告：入库脚本输出 `reports/batch-bYYYYMMDD-01.json`（候选/成功/重复/失败/缺字段/对账）

生产迁移执行沿用既定流程：先 `npm run backup:db`，再用现有 sbp_ 令牌跑（脚本带预检与验证）。

---

## 4. 阶段 C：图片分类规则 → 字段映射

| 维度 | 落点 | 示例值 |
|---|---|---|
| 来源平台 | `source_platform`（ingest 已有） | `twitter` / `weibo` |
| 来源账号 | `source_account`（本批打通） | `change2561`、`LMLOOKMHEE` |
| 来源身份 | `tags[]` 词条 | `Official` / `Organizer` / `Photographer` / `Media` / `Fan` / `Unknown`（由发布账号身份判定，**不由图片外观断言**） |
| 图片形式 | `tags[]` 词条 | `Official-photo` / `Promo` / `Event-photography` / `Other` |
| 具体场景 | `tags[]` 词条 | `Airport-departure` / `Airport-arrival` / `Fanmeeting` / `Backstage` / `Fanop` / `Unknown` |
| 人物范围 | `tags[]` 词条 | `Duo` / `Solo` / `Unknown` |
| 事件日期 | `event_date`（有证据才填）/ `raw_event_date`（发帖时间只作证据） | 见 §5 证据规则 |
| 证据说明 | `curator_note` | 原帖链接、账号身份依据、日期依据 |
| 发布分类 | `gallery_assets.tag` | 转正时由人工确认的 `tags[0]` 或 `Fanmeeting` |

日期证据规则（沿用批 1 语义）：活动日期 2026-10-09 已被官方海报多源证实，本事件图片的 `event_date` 按图片实际归属填 `2026-10-09`（现场图）/ 机场图按可证实的行程日期或留空；**发帖时间一律只进 `raw_event_date`**。

---

## 5. 阶段 B：候选事件与来源清单

### 5.1 候选事件（已多源核实，非编造）

| 项 | 内容 | 证据 |
|---|---|---|
| 事件名 | **LOOKMHEE SONYA "EVERAFTER: BLOOM" IN SÃO PAULO**（圣保罗粉丝见面会） | 官方 X/IG 宣传文案全文（下方 §5.3） |
| 日期 | 2026-10-09（星期五）20:00 | 官方宣传文案；巴西活动汇总账号 LobeProjetos 月表 "Lookmhee & Sonya (Fan Meeting) – 09/10" |
| 地点 | BTG Pactual Hall, São Paulo, Brazil | 同上两源 |
| 主办/经纪 | CHANGE2561（@change2561 / @CHANGEARTIST_） | 官方 X 账号发文；Manila 站（EVERAFTER: BEGIN, 9/19）同为 CHANGE2561，GMA/Trendrod 报道佐证 |
| 状态 | **已发生**（上周五），现场图/官方图已存在 | 粉丝帖 "CONSEGU COMPRAR… A GENTE SE VÊ EM OUTUBRO"、新浪超话"活动现场同框"帖（sina 5339179001054749） |

同系列佐证（证明 EVERAFTER 巡演真实存在）：Manila 站 "EVERAFTER: BEGIN" 2026-09-19 Samsung Hall（GMA Network、Trendrod 报道，含官方 X 帖 pic 引用）。

### 5.2 采集来源优先级（实际抓取时逐帖登记原帖 URL）

| 优先级 | 来源 | 获取方式 | 预期图片类型 |
|---|---|---|---|
| 1 | 官方：X @change2561 / @CHANGEARTIST_、IG @change2561 | twstalker 镜像枚举帖子（本机直连 X 被限，镜像可达） | 官方精修、现场官方照、合影环节官方图 |
| 2 | 官方微博 @LMLOOKMHEE（微博侧主来源） | 微博 m 站接口（此前 weibo 采集已验证可通） | 官方宣传图、行程图 |
| 3 | 摄影师/媒体（现场 photo thread 账号，抓取时按水印/署名确认） | twstalker 搜索 "LMSY são paulo" | 现场摄影 |
| 4 | 高质量粉丝账号（有明确原帖可回查） | 同上 + 新浪超话转载帖定位原帖 | 现场、机场 |

**采集时明确排除**：登录墙内容（IG 未登录只能拿公开 OG 图，拿不到就跳过该帖）、无法定位原始出处的二次转载图。

### 5.3 官方宣传原文（事件名/日期/地点的原始证据）

> 🇧🇷 Brazil, your princess charming is coming! 👑 Catch Lookmhee & Sonya as they grace São Paulo with their effortless beauty and charisma.
> 📃 LOOKMHEE SONYA "EVERAFTER: BLOOM" IN SÃO PAULO
> 📅 October 9 | Friday | 8 PM 📍 BTG Pactual Hall
> Tickets go on sale August 10, 2026.

（发布：@change2561，2026-07-27；LM/SM IG 同日同文案；中文转载见新浪 5325325953155559 / 5325305725059527 / 5325318035343188）

### 5.4 候选图片构成计划（≤20 张，双人同框优先）

- 官方精修/宣传图：3-5 张（CHANGE2561 发布）
- 见面会现场（双人同框）：8-12 张（官方 + 摄影师/粉丝各占一部分）
- 机场出发/抵达（如能定位可靠原帖）：0-4 张（找不到就为 0，不硬凑）
- 每张登记：原帖链接、账号、平台、发帖时间、图片类型/场景/人物范围、日期证据。

---

## 6. 检查点：请站长确认以下 4 项后进入实施

1. **事件确认**：圣保罗 EVERAFTER: BLOOM（2026-10-09）是否就是目标事件？
2. **迁移批准**：§3-1 的 `draft_items + batch_id + source_account` 迁移（纯增量、可空、带回滚说明）是否批准？
3. **代码改动批准**：§3-2~3-7（ingest 3 参数、to-gallery 幂等守卫 + account 透传、公开页 curation_status 过滤、后台筛选与批量转正按钮）是否批准？
4. **来源范围确认**：§5.2 的优先级与"登录墙跳过"原则是否认可？机场图找不到可靠原帖时允许为 0？

确认后执行顺序：迁移 → 代码 → 门禁（typecheck/单测/构建/冒烟）→ 枚举具体帖子 → 建候选项目 → ≤20 张入库（只产草稿）→ 批次报告 → 交人工审核。
