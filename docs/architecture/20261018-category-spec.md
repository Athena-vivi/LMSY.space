# LMSY.space 一级分类规范与现有数据映射

> 依据：`projects_category_check` 实际约束 + 26 行真实数据。
> 本文给出目标分类定义、三种落地路径的取舍、以及逐项目的迁移映射。
> 状态：**已实施**（2026-10-18）。数据库 CHECK 已收窄到本文的 8 个稳定值，26 行全部按本文映射迁移完成，执行记录见 `20261018-migration-log.md`。

## 1. 目标分类的语义边界

| 稳定值 | 展示名 | 纳入 | 排除 |
|---|---|---|---|
| `drama_work` | Drama & Works | 剧集相关：剧照、官方 still、剧集宣传 | 剧之外的杂志、广告 |
| `editorial` | Editorial | 杂志内页/封面、写真书、时尚专题 | 品牌投放的广告图 |
| `live_event` | Live Events | 粉丝见面会、舞台、签名会、演出 | 机场与非活动类公开露面 |
| `public_appearance` | Public Appearances | 机场、品牌活动出席、红毯、公开亮相 | 有独立作品属性的拍摄 |
| `commercial` | Commercial | 品牌广告、代言、商业拍摄 | 杂志编辑内容 |
| `behind_the_scenes` | Behind the Scenes | 拍摄花絮、制作花絮 | 正式成片 |
| `personal_travel` | Personal & Travel | 旅行、非公开行程的个人记录 | 机场送机/接机（属公开露面） |
| `early_archive` | Early Archive | 2022–2023 等早期、暂无法归类的资料 | 已能明确归类的内容 |

判定顺序（避免同一项目被两类抢）：

```
有独立作品的剧集物料 → drama_work
杂志/写真书/时尚专题 → editorial
品牌付费的广告与代言 → commercial
线下活动/见面会/签名会 → live_event
机场、红毯、品牌活动出席 → public_appearance
拍摄过程/花絮 → behind_the_scenes
私人旅行与非公开行程 → personal_travel
无法判定但确有资料 → early_archive
```

## 2. 落地路径三选一（必须先定）

### 方案 A：保留现有 6 值，补 2 值

```
series            → 语义等于 drama_work
editorial         → 不变
appearance        → 语义等于 live_event
travel            → 语义等于 public_appearance
daily             → 语义等于 personal_travel
commercial        → 不变
behind_the_scenes → 新增
early_archive     → 新增
```

- 数据迁移：**0 行 UPDATE**，只扩 CHECK 约束。
- 代码改动：只在展示层补 2 个分类的文案与图标。
- 历史 URL：全部不变，无 404 风险。
- 代价：数据库值与展示名继续不一致（`series` 显示为 Drama），需要靠映射表维护。

### 方案 B：全量重命名 8 值

- 数据迁移：26 行 UPDATE（含 6 个旧值 → 新值）。
- 代码改动：`projects_category_check`、`lib/exhibition-categories.ts`、所有 `category === 'series'` 判断、路由段、首页门户 key、测试。
- 历史 URL：`/exhibitions/category/drama|stage|travel|daily` 需 301 或别名。
- 代价：一次大范围改动，回归面覆盖首页/列表/详情/编年史/搜索/sitemap。
- 收益：数据库语义自解释，`daily` 这种含糊值消失。

### 方案 C：值不动，展示名统一（推荐）

- 数据库保留 6 值（+2 新增），在 `lib/category-meta.ts` 建立唯一映射：稳定值 → 展示名 / 图标 / 路由段 / 搜索别名。
- 前台任何地方不得硬编码分类文案，一律走这张表。
- 历史 URL 不变。
- 代价：数据库值仍叫 `series`；需要靠代码约束保证不再出现第二套映射。

**建议 C**。理由：本次改造的真正问题是"数据库值、路由段、文案三层各叫一套"，而 C 正好把这三层收敛到一张表；B 虽然更彻底，但会同时改动 URL 与数据，回归成本远高于收益。

## 3. 26 个项目逐条映射

> "状态"：`确定` = 数据足以判断；`待确认` = 需要你一句话确认。
> 三种方案下"建议值"一致，仅 A/C 不改写数据库。

| # | 项目 | 现分类 | 图片 | 建议分类 | 依据 | 状态 |
|---|---|---|---|---|---|---|
| 1 | Affair (爱情诡计) | series | 18 | drama_work | 剧集 Still | 确定 |
| 2 | Harmony Secret (和谐密语) | series | 0 | drama_work | 剧集，暂无入库图 | 确定 |
| 3 | Dream | editorial | 18 | editorial | 杂志期 | 确定 |
| 4 | Untamed | editorial | 18 | editorial | 杂志期 | 确定 |
| 5 | GAZE | editorial | 37 | editorial | 杂志期 | 确定 |
| 6 | ISLAND | editorial | 21 | editorial | 杂志期 | 确定 |
| 7 | Retro Soul: December Edition | editorial | 21 | editorial | 杂志期 | 确定 |
| 8 | Oat-Lookmhee | editorial | 23 | editorial | 单人写真 | 确定 |
| 9 | 20241125-UNIQUE | editorial | 21 | editorial | 杂志期 | 确定 |
| 10 | 20241104-Stars Twinking | editorial | 18 | editorial | 杂志期 | 确定 |
| 11 | Smoldering Embrace | editorial | 21 | editorial | 杂志期 | 确定 |
| 12 | U! | editorial | 1 | editorial | 杂志期，仅 1 图 | 待确认（是否为容器） |
| 13 | 20241217【天津Fan sign PB】 | editorial | 38 | editorial 或 live_event | "PB"=写真书偏向 editorial；"Fan sign"=签名会偏向 live_event | **待确认** |
| 14 | coffee | commercial | 24 | commercial | 品牌广告 | 确定 |
| 15 | Close | commercial | 12 | commercial | 品牌广告 | 确定 |
| 16 | Sweet | commercial | 10 | commercial | 品牌广告 | 确定 |
| 17 | live | commercial | 8 | commercial | 标题只有 "live"，内容待核 | 待确认（可能是直播活动） |
| 18 | SIRIVANNAVARI | appearance | 12 | public_appearance 或 commercial | 泰国品牌；若为品牌活动出席 → public_appearance；若为付费代言 → commercial | **待确认** |
| 19 | EVERAFTER: BLOOM in Sao Paulo (Fan Meeting) | appearance | 0 | live_event | 粉丝见面会，暂无图 | 确定 |
| 20 | 20260320-airport | travel | 3 | public_appearance | 机场公开行程 | 确定 |
| 21 | MILESTONES_ARCHIVE | daily | 6 | early_archive（并标 `is_container`） | 采集收集器，非策展项目；6 图后续拆入具体项目 | 待确认（拆图方式） |
| 22 | Photo from LMSY自动雷达 - 10/15/2026 | daily | 0 | 不作项目（`is_container`） | 0 图，纯采集落点 | 确定 |
| 23 | Photo from LMSY Radar Updates - Feb 24, 2026 | daily | 0 | 不作项目（`is_container`） | 同上 | 确定 |
| 24 | Project 2026-03-15（a） | daily | 0 | 不作项目（`is_container`） | 同上 | 确定 |
| 25 | Project 2026-03-15（b） | daily | 0 | 不作项目（`is_container`） | 同上 | 确定 |
| 26 | Project 2026-03-15（c） | daily | 0 | 不作项目（`is_container`） | 同上 | 确定 |

### 映射后的分布

| 分类 | 项目数 | 图片数 | 前台是否有内容 |
|---|---|---|---|
| drama_work | 2 | 18 | 有 |
| editorial | 10 | 209 | 有 |
| commercial | 4 | 54 | 有 |
| live_event | 1 | 0 | **无图** |
| public_appearance | 2 | 15 | 有 |
| behind_the_scenes | 0 | 0 | 无 |
| personal_travel | 0 | 0 | 无 |
| early_archive | 0–1 | 0–6 | 视 MILESTONES 处置 |

## 4. 空分类问题（与既有指令冲突，必须裁决）

目标 8 类里有 3 类会是空的（`behind_the_scenes`、`personal_travel`、`live_event` 无图）。

- 本次改造指令 §7.2 写："没有公开项目的分类不应展示为空卡片。"
- 但 2026-10-18 17:00 你明确要求：五个分类入口必须都在，不能因内容空而隐藏。

这两条直接冲突。三种处理：

| 选项 | 做法 | 后果 |
|---|---|---|
| **D1-a（建议）** | 首页入口固定 5 个（Drama / Editorial / Live / Appearances / Commercial），空分类保留入口，卡片显示"收录中"状态 | 与你今天的立场一致；与文档 §7.2 偏离 |
| D1-b | 严格按 §7.2，只显示有内容的分类 | 入口数量随数据波动，会出现"入口消失" |
| D1-c | 首页固定入口 + 空分类卡不可点击 | 折中，但仍要写"收录中" |

## 5. 约束变更草案（未执行）

```sql
-- 方案 A / C：只扩容，不改现有值
alter table lmsy_archive.projects
  drop constraint projects_category_check;

alter table lmsy_archive.projects
  add constraint projects_category_check
  check (category in (
    'series','editorial','appearance','travel','daily','commercial',
    'behind_the_scenes','early_archive'
  ));

-- 方案 B：扩容后逐行 UPDATE，26 行，RETURNING 核对
-- update lmsy_archive.projects set category = case category
--   when 'series' then 'drama_work'
--   when 'appearance' then 'live_event'
--   when 'travel' then 'public_appearance'
--   when 'daily' then 'personal_travel'
--   else category end
-- returning id, category;
```

## 6. 分类维护规则

1. 新增分类必须同时改四件事：CHECK 约束、`lib/category-meta.ts`、首页入口配置、搜索别名表。缺一不可。
2. 不允许为单个项目新建分类。
3. `early_archive` 只能暂存，每个季度复核一次。
4. 采集容器一律标 `is_container=true`，**不占用分类值**，也不进入前台项目列表。
5. 图片 `tag` 只表达内容类型（Still / Stage / Magazine / Advertising / BTS），平台信息归 `source_platform`。
