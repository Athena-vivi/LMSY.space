# LMSY.space 内容数据模型（目标态）

> 依据：`20261018-ia-audit.md` 的实际 schema。本文只定义模型与取舍，不含已执行的 DDL。
> 状态：**已实施**（2026-10-18）。`works`、`project_people` 两张新表已建并各有 2 / 4 行真实数据，实际 DDL 与回填记录见 `20261018-migration-log.md`。

## 1. 四个实体

```
Person (profiles)
   │  N:M via project_people
   ▼
Project (projects) ──1:N──► GalleryAsset (gallery_assets)
   │  N:1 (nullable)
   ▼
Work (works)
```

| 实体 | 职责 | 现有载体 | 判定 |
|---|---|---|---|
| Project | 一组图片的内容主题，有独立详情页 | `projects` | 已有，补字段 |
| GalleryAsset | 一张可独立追溯的图片 | `gallery_assets` | 已有，补字段 |
| Person | 人物身份，可跨项目 | `profiles` | 已有，缺关联表 |
| Work | 一部剧/一个创作对象，可跨项目 | 无 | 新建 |

## 2. 关系规则

### 2.1 Project ↔ GalleryAsset（已有，不改结构）

- 一个项目拥有 N 张图；一张图属于 1 个项目。
- `gallery_assets.project_id` 必填（现有 330/330 已满足）。
- 外键当前是 `ON DELETE SET NULL`。**建议改为 `ON DELETE RESTRICT`**，防止误删项目产生孤儿图片。改之前必须先确认没有删除项目的业务路径。
- 图片不跨项目复用。若同一张图要出现在两个项目，建两条记录（各自有 catalog_id 与来源）。

### 2.2 Project ↔ Person（新建）

需要一张连接表，而不是在 `projects` 上放文本数组：

```sql
-- 草案，未执行
create table lmsy_archive.project_people (
  project_id  uuid not null references lmsy_archive.projects(id) on delete cascade,
  profile_id  uuid not null references lmsy_archive.profiles(id) on delete cascade,
  role        text not null default 'subject'
              check (role in ('subject','photographer','host','guest')),
  primary key (project_id, profile_id)
);
```

理由：
- 人物页要能反查"这个人参与的所有项目"，数组字段做不到索引友好的反查。
- 目前只有 2 个人物，但角色（出镜/摄影/主持）会分化。

初始数据可人工判定：26 个项目里，绝大多数是双人出镜；`Oat-Lookmhee` 从标题看是 Lookmhee 单人。

### 2.3 Project ↔ Work（新建，可空）

```sql
-- 草案，未执行
create table lmsy_archive.works (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  title_i18n  jsonb,
  kind        text not null default 'series'
              check (kind in ('series','film','stage_play','other')),
  year        integer,
  external_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table lmsy_archive.projects
  add column work_id uuid references lmsy_archive.works(id) on delete set null;
```

取舍说明：
- 现在只有 2 部剧、每部 1 个项目，建 `works` 的即时收益接近 0。
- 但 `category='series'` 迟早会拆成"剧照 / 宣传写真 / 幕后 / 宣传活动"多个项目，届时必须有 `work_id` 才能聚合。**建议现在就建表并关联 2 行**，成本极低，避免以后再次迁移。
- 杂志、品牌、活动类项目 `work_id` 保持空，不强行挂作品。

## 3. 现有模型里不该动的东西

| 东西 | 为什么不改 |
|---|---|
| `gallery_assets.project_id` 单外键 | 已经 100% 覆盖、0 孤儿，结构正确 |
| `projects.category` 单值 | 一个项目一个主分类，符合"分类是一级维度"的要求 |
| `site_content_blocks` | 首页文案块的正确载体，4 条在用 |
| `draft_items` | 采集中间层，与前台解耦；不该并进 `gallery_assets` |
| `catalog_id` 唯一约束 | 编号是有价值的人工标识，只是不该出现在卡片正面 |

## 4. 现有模型要补的字段（汇总）

### projects

| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| `slug` | text | 是 | 唯一索引；为空时详情页继续用 UUID |
| `event_date` | date | 是 | 事件/拍摄实际发生日；不确定就留空 |
| `source_published_at` | date | 是 | 原始内容发布日（杂志发行日、帖子发布日） |
| `location` | text | 是 | 地点 |
| `publisher_brand` | text | 是 | 出版方/品牌/主办方 |
| `search_aliases` | text[] | 是 | 别名、简称、泰文名、中文名 |
| `is_container` | boolean | 否，默认 false | 标记采集容器（不是给访客看的项目） |
| `updated_at` | timestamptz | 否，默认 now() | 触发器维护 |

> `release_date` 保留，但语义收窄为"原始发布/上线日"，编年史优先用 `event_date`。
> `start_date` / `end_date` 保留给有档期的项目（展览、巡演），不做强制。

### gallery_assets

| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| `file_hash` | text | 是 | 用于查重；唯一索引 `where file_hash is not null` |
| `source_post_id` | text | 是 | 原帖 ID，配合 source_url 定位 |
| `people_ids` | — | — | 不建，人物通过项目关联（图片级人物暂不需要） |

> `source_url` / `source_platform` / `source_account` 已存在，**不加字段，补写入链路**。

### profiles

| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| `slug` | text | 是 | 唯一索引，用于 `/people/lookmhee` |
| `bio_i18n` | jsonb | 是 | 三语简介 |
| `role_label` | text | 是 | 展示用身份（演员 / 歌手） |

## 5. 与"不要过度抽象"的边界

明确**不引入**的东西：

- 不建 `tags` 维表。`gallery_assets.tag` 是低基数枚举，够用。
- 不建 `events` 表。项目的 `event_date` 就是事件锚点；Chronicle 从项目与图片组派生。
- 不建 `sources` 表。来源是图片的属性，不是独立实体（除非将来要统计同一来源下的多图，那时再抽）。
- 不改 `draft_items` 结构。它是采集层，字段已经够用。

## 6. 迁移后的读取路径

| 前台页面 | 读取 |
|---|---|
| 首页分类入口 | `projects` group by `category` + 每类封面 |
| 项目索引 | `projects`（公开过滤）+ 分类筛选 |
| 项目详情 | `projects` 1 行 + `gallery_assets` N 行 + `project_people` + `works` |
| 人物详情 | `profiles` 1 行 + `project_people` 反查 + 关联图片 |
| 时间线 | `projects.event_date`（优先）/ `source_published_at`（次之）/ `gallery_assets.event_date` 分组合并 |
| 图库 | `gallery_assets` + join `projects`（用于显示所属项目） |
| 搜索 | `projects.title/aliases/description` + `gallery_assets.title/caption` + `profiles.name/nickname` |

一份数据、多处读取，不再各自复制。
