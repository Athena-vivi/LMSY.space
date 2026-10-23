# 2026-10-20 数据库结构调整记录

> 一次结构扩容 + 一批数据修正。**没有删任何一行**，全部可回滚。
> 前台代码未改（`lib/category-registry.ts` 的同步留到建内容之前做）。

---

## 一、快照（回滚依据）

改动前建的三张快照表，保留原样：

| 快照表 | 行数 |
|---|---|
| `lmsy_archive.projects_snap_20261020` | 28 |
| `lmsy_archive.gallery_assets_snap_20261020` | 329 |
| `lmsy_archive.works_snap_20261020` | 2 |

### 回滚方式

```sql
-- 1. 恢复 projects 全部 28 行的字段
update lmsy_archive.projects p
set portal_visible   = s.portal_visible,
    curation_status  = s.curation_status,
    category         = s.category,
    is_container     = s.is_container,
    updated_at       = now()
from lmsy_archive.projects_snap_20261020 s
where p.id = s.id;

-- 2. 清掉本轮新填的 subtype
update lmsy_archive.projects set subtype = null;
```

约束回滚（只在需要退回到旧的 8 类词汇时执行）：

```sql
alter table lmsy_archive.projects drop constraint if exists projects_subtype_check;
drop index if exists lmsy_archive.idx_projects_category_subtype;
alter table lmsy_archive.projects drop column if exists subtype;

alter table lmsy_archive.projects drop constraint if exists projects_category_check;
alter table lmsy_archive.projects add constraint projects_category_check
  check (category is null or category in (
    'drama_work','editorial','live_event','public_appearance',
    'commercial','behind_the_scenes','personal_travel','early_archive'));
```

---

## 二、结构扩容

### 2.1 `projects.category`：8 → 12

新增四个，对应之前没有位置的内容：

| 值 | 含义 | 归到哪个门 |
|---|---|---|
| `interview` | 访谈（深度 / 群访 / 电视 / 新闻） | 6 号门 |
| `variety` | 综艺 | 6 号门 |
| `radio` | 电台 | 6 号门 |
| `live_stream` | 自开直播 | 7 号门 |

`personal_travel` **暂时保留在约束里**。它现在只剩 2 行已归档的残留，等这些行清理掉再删约束，否则会撞约束。

### 2.2 `works.kind`：4 → 8

原值 `series / film / stage_play / other`，新增 `song / novel / magazine / endorsement`。

### 2.3 新增 `projects.subtype`（text，可空）

一个字段服务所有门的内部分栏，避免为子类去拆 category。

| 归属 | 取值 |
|---|---|
| `live_event` | `concert` / `fanmeeting` / `fansign` / `brand_event` / `birthday` |
| `public_appearance` | `awards` / `fashion` / `brand_stage` / `industry` / `charity` / `premiere` |
| `interview` | `feature` / `press` / `tv_news` |

2026-10-23 拆分 3 号门：`fanmeeting` 一个值装了 42 场，从签售到 EVERAFTER 巡演全在里面，访客分不出「一场签售」和「一场售票演唱会」。按活动形态拆成三个：`concert`（FanCon / 巡演站次）、`fanmeeting`（见面会）、`fansign`（签售）。单人场不单独成类——单人写标题和人物码，形态仍是见面会。同日把 2025-11-01 杭州 FoamDream 从 `fanmeeting` 改回 `brand_event`（官宣原文是品牌代言人活动）。迁移：`supabase/migrations/20261023_live_event_split_and_city.sql`，快照与回滚在 `temp/`。

2026-10-20 更正：4 号门最终是六个值，与 `docs/20261019-lmsy-public-appearance-list.md` 的类型 A–F 一一对应。原表只列了四个（含 `fanday`），建库时发现「Fan Day 与平台活动」装不下清单里的 C（品牌站台 / 商演 / 民俗舞台，10 场）和 E（公益 / 社群 / 书展，6 场）两类，`fanday` 在这一门也没有对应内容，遂取消。定稿第五节同步改过。

配索引 `idx_projects_category_subtype (category, subtype)`。

**为什么不拆 category**：`live_event` 一旦拆成三个值，3 号门就要改成多分类查询，CHECK 约束、筛选 chips、i18n、搜索全要跟着改；一个 subtype 字段解决全部。

---

## 三、数据修正

### 3.1 归档五条空壳

这五条是自动抓取生成的，**每条 0 张图、0 描述、标题是日期或抓取来源名**（已逐条核对资产数）：

| id | 标题 | 原状态 |
|---|---|---|
| `a8668aeb…` | `Project 2026-10-19` | 隐藏 |
| `c7aee9fe…` | `Project 2026-03-15` | **公开，且 is_container** |
| `abbc104e…` | `2025年6月28日` | 隐藏 |
| `315cfd6a…` | `Photo from Lookmhee & Sonya Radar Updates - March 31, 2026` | 隐藏 |
| `0a24391c…` | `Photo from LMSY自动雷达 - 10/15/2026` | **公开，且 is_container** |

处理方式：`portal_visible = false`、`curation_status = 'archived'`。**软归档，不删行**。

两条 personal_travel 的垃圾原本是公开可见的，归档后前台可见项目从 23 条变 20 条。

### 3.2 修正两处错分类

| 项目 | 改动 | 原因 |
|---|---|---|
| `爱情诡计首映` | `early_archive` → `public_appearance`，`subtype='premiere'` | 首映会是公开活动，不是早期档案 |
| `MILESTONES_ARCHIVE` | `personal_travel` → `early_archive`，`is_container=true`，隐藏 | 它装着 4 张年度首页图，是容器不是条目；`is_container` 让前台统一排除（`lib/project-visibility.ts:40`） |

`爱情诡计首映` 的 `event_date` **故意留空**：首映日期在档案站与媒体清单之间还差一天，没核完不填。

### 3.3 改动后的分布

| category | 行数 | 前台可见 |
|---|---|---|
| editorial | 11 | 11 |
| early_archive | 5 | 0 |
| commercial | 4 | 4 |
| public_appearance | 3 | 2 |
| drama_work | 2 | 2 |
| personal_travel | 2 | 0 |
| live_event | 1 | 1 |
| **合计** | **28** | **20** |

---

### 3.4 回填三条广告的品牌（`publisher_brand`）

这四条广告只有单词标题、没有品牌。三条能对上商务清单，其中一条还有画面证据：

| 标题 | 日期 | 品牌 | 依据 |
|---|---|---|---|
| `Close` | 2025-09-26 | FoamDream | 商务清单记「FoamDream 直播前一天」；**打开图看，画面里有 `foam` 道具牌和 FOAMTAIL 纸袋**，视觉坐实 |
| `live` | 2025-10-17 | Mistine | 商务清单记「Mistine 抖音直播同日」 |
| `coffee` | 2025-11-23 | Sip The Vibe | 商务清单记「Sip The Vibe 直播前一天」，画面是咖啡馆场景 |
| `Sweet` | 2024-02-14 | **留空** | 唯一对不上直播记录的一条，画面里没有可辨认的 logo，不猜 |

字段 `publisher_brand` 目前**前台没有任何地方在读**（全仓只有 `lib/supabase/types.ts` 的类型定义），所以这次回填在页面上暂时看不出变化。它是为 5 号门的品牌墙准备的：建那 41 条商务内容时，分组就靠这个字段。

---

## 四、这轮没做的事（留给后面）

1. **`lib/category-registry.ts` 没同步**。数据库能存 12 类了，但 `PROJECT_CATEGORIES` 还是 8 个，前端筛选 chips 认不出新值。**建第一条 interview 项目之前必须补上**，同时改 `lib/languages.ts` 的三语言标签。之所以没顺手做，是因为那是代码改动，按约定不与数据混。
2. **works 只有 2 条**（Affair、Harmony Secret），缺 Hometown Romance、10 首歌、3 本原著。歌名要逐首核，不能凭印象填。
3. **26 条项目没有 `work_id`**（只有 2 条 drama_work 挂了）。
4. **11 本刊物的 `catalog_id` 全是 NULL**。`/editorial` 的杂志架子读的就是这个字段（`app/api/editorial/route.ts:135`），编号为空等于架子没有索引号。补编号要先定格式。
5. **4 条 `commercial` 的标题只有单词**（`Sweet` / `Close` / `live` / `coffee`）。这四条合计 54 张图，不是空壳；品牌已按 3.4 回填三条，标题本身还没改——改标题要定一套命名规范。
6. **`personal_travel` 还有 2 行残留**（已归档），清掉之后才能从 CHECK 约束里删掉这个值。

---

## 五、事件表统一（2026-10-20 晚追加执行）

前面几节默认「一个门一张表」可以做下去，实际跑一遍才发现代价：1 号门单开 `drama_events` 之后，同一件事在后台既是项目又是事件，加事件=加项目，草稿箱与项目管理两个列表立刻对不上。**已改回单表模型，`projects` 就是事件表。**

**结构变更**

```sql
-- project_kind 扩容
alter table lmsy_archive.projects drop constraint if exists projects_project_kind_check;
alter table lmsy_archive.projects add constraint projects_project_kind_check
  check (project_kind in ('event', 'theme', 'series', 'video'));

-- subtype 白名单：去掉三个剧名，加六个组名
alter table lmsy_archive.projects drop constraint if exists projects_subtype_check;
alter table lmsy_archive.projects add constraint projects_subtype_check
  check (subtype is null or subtype in (
    'fanmeeting','brand_event','birthday',
    'premiere','awards','fashion','brand_stage','industry','charity',
    'feature','press','tv_news','duo','lookmhee','sonya',
    'series_body','music','novel','promo','award','footage'
  ));

-- slug 唯一性：全局 → (所属作品, slug)
drop index if exists lmsy_archive.projects_slug_key;
create unique index if not exists projects_slug_scope_key
  on lmsy_archive.projects (coalesce(work_id, '00000000-0000-0000-0000-000000000000'::uuid), slug)
  where slug is not null;
```

**挂载规则**

- 剧行（作品本体）：`category='drama_work' and project_kind='series'`，地址 `/dramas/<slug>`
- 剧下事件：同一 `work_id`（指向 `works`），`project_kind` 为 `event`/`video`，地址 `/dramas/<剧slug>/<事件slug>`
- 其他门事件：`work_id` 为空，地址 `/projects/<slug|uuid>`
- 图片：`gallery_assets.project_id` 直接指向事件行，**不再需要 `event_id`**（该列保留为空，代码不读）

**回滚**

```sql
-- 数据
update lmsy_archive.projects p set
  is_container = s.is_container, curation_status = s.curation_status, portal_visible = s.portal_visible
from lmsy_archive.projects_snap_m1_20261020 s where p.id = s.id;
-- 新增的 39 行按 created_at/来源筛出后删除；18 张图按 gallery_assets_snap_m1_20261020 还原 project_id
```
