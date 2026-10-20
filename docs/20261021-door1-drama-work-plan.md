# 1 号门「影视作品」实施方案（待确认，未动任何数据与代码）

> 2026-10-21 · 只出方案。依据：`20261019-lmsy-drama-promotion-list.md`（10-19）、`20261020-lmsy-content-and-presentation-plan.md`（10-20 定稿）、库里现状。
> 你说的两件事本文都处理了：**一门一页**、**清单去重**。

---

## 一、先说去重：影视清单的时间轴，大部分不属于这一门

把影视清单逐条判完，47 个节点里只有 **14 条属于 1 号门**，其余已经或应该落在别的门。这就是"边界模糊"的来源——那份清单是按"一部剧的宣传期"组织的，而门是按"内容的性质"组织的。

| 影视清单里的条目 | 实际归属 | 现状 |
|---|---|---|
| 2024-04-25 CHANGE2561 推介会官宣 | 4 号门 industry | 已建 `CHANGE2561 Annual Showcase 2024` |
| 2024-05-20 Affair 记者招待会 | 6 号门 press | 在采访清单"记者群访 15"里 |
| 2024-08-30 首映会 / 观影会 | 3 号门 | 已建 `Affair 第一集观影会` |
| 2024-10-18 Final EP. Fan Meeting | 3 号门 | 已建 |
| 澳门 / 香港 / 马尼拉 / 台北 4 站 | 3 号门 | 见面会清单 #2 #3 #7 #8，**不重建** |
| 2024-10-09 Sound Check | 6 号门 variety | 在综艺清单 |
| 2025-06-11 Harmony 祭拜 | 4 号门 premiere | 已建 |
| 2025-07-26 Harmony 首映 | 4 号门 premiere | 已建 |
| 2025-09-08 / 09-15 两档综艺 | 6 号门 | 在综艺清单 |
| 2025-09-13 Final EP. Fan Meeting | 3 号门 | 已建 |
| 2026-01-28 ChangeVerse 官宣 | 4 号门 industry | 已建 `CHANGEVERSE 2026` |
| 2026-03-01 / 03-07 / 03-25 三场民俗舞台 | 4 号门 brand_stage | 已建 |
| 2026-04-23 / 04-24 / 05-01 三档综艺采访 | 6 号门 | 在综艺清单 |
| 2026-05-22 终映包场 | 4 号门 premiere | 已建 |
| 2026-06-06 BE MY ROMANCE FanCon | 3 号门 | 已建（见面会 #19） |
| 2026-09-27 FEED×KAOSOD 获奖 | 4 号门 awards | 已建 |
| **两首 T-POP 独立单曲** | **未决，见第五节** | — |

**一条真重复**：库里的 `爱情诡计首映`（`public_appearance` / `premiere`，日期为空）和 `Affair 第一集观影会`（`live_event`，2024-08-30）**是同一场**——影视清单写明"首映会与首播同一天，不是提前点映"，就是 House Samyan 那场观影会。前者要合并掉，不是新建。

---

## 二、1 号门到底装什么

只装**剧这个长期实体**和它身上长出来的东西：

| 内容 | 数量 | 放哪 |
|---|---|---|
| 三部剧 | 3 | 3 个 `drama_work` 项目，一部剧一个 |
| OST | 7 首（Affair 1 + Harmony 4 + Hometown 2） | `works` 表 `kind='song'`，剧内页展示 |
| 原著小说 | 3 本 | `works` 表 `kind='novel'` |
| 官方周边 | 15 SKU | 剧内页区块（先不做 `works`，见第八节） |
| 奖项 | 8 项（获奖 3 + 提名 5） | 剧内页区块，**获奖与提名分列** |
| 宣传节点 | 官宣 / 预告 / 定档 / 未删减上架等 11 个 | 剧内页时间线，不建项目 |
| 影像物料 | reaction 8 集、vlog、teaser、Unseen Hometown 7 集 | `gallery_assets` 挂剧项目 |

**这一门不需要新建一堆项目**：3 个项目 + 10 条 `works` + 资产挂接。密的是详情页，不是列表。

---

## 三、三级结构（按你说的：门 → Tab → 竖列表）

```
L1 门      /dramas                    影视作品（含音乐，见第五节）
L2 Tab     Affair | Harmony Secret | Hometown Romance     按剧切，不按内容类型切
L3 竖列表  每部剧详情页内纵向分组，每组下面是带日期的条目：
             剧集本体    首播 / 终映 / 集数 / 播出平台
             音乐作品    7 条，每条：曲目、演唱、发布日期、外链
             原著小说    3 条
             官方周边    15 条
             奖项        8 条，获奖与提名分列
             宣传节点    11 条，纵向时间线
             影像物料    reaction / vlog / teaser，宫格
```

**为什么 L2 按剧切，不按"音乐 / 原著 / 奖项"切**：OST、原著、奖项在事实上都属于某一部剧，按类型切会把同一部剧的东西拆到三个 Tab 里，反而难管。按剧切，每部剧一个 URL，SEO 上三个可收录的落地页；类型分组放在剧内做竖排，照样能单独索引到。

**路由**：新建 `/dramas` 落地页（替代现在的 `/projects?category=drama_work`，查询参数不利于收录）；剧详情沿用已有 `/projects/[id]`，只把详情页改成竖排分组。不动现有 6 条 308 重定向。

---

## 四、1 号门要修的数据（4 条，都带证据）

| # | 现状 | 改成 | 证据 |
|---|---|---|---|
| 1 | `Affair (爱情诡计)` `event_date` 2024-08-29 | 2024-08-30 | 中文维基 / Flicklist / Flixi / TV Universe / gaydaytime 五源一致；10-19 文档 §6.2 |
| 2 | `Hometown Romance Worship Ceremony` 2026-03-12 | **2026-03-14** | 10-19 采访清单 §1.1：档案站 Press Interview 区 `[20260314] Hometown Romance Blessing — ONE Entertainment`；3-12 是 9ENT Awards |
| 3 | `爱情诡计首映`（`public_appearance`/`premiere`，无日期） | 合并进 `Affair 第一集观影会`，本条归档 | 同一场，见第一节 |
| 4 | `Harmony Secret (和谐密语)` 0 资产 | 挂封面与剧照 | 现在线上是个空容器 |

`works` 表现有 Affair、Harmony Secret 两条，**缺 Hometown Romance**，一并补。

---

## 五、音乐作品的归属——这里两份文档打架，要你定

- 10-20 定稿说：「音乐只能放这里，10 首全是 OST，没有独立单曲，单开一扇门太薄」
- 10-19 影视清单第十节说：T-POP 双人单曲（My Safe Zone / Jealous 等）属音乐线，档案站单列 T-POP Duo 分区
- 事实：**有**两首独立单曲《พื้นที่วางใจ (My Safe Zone)》《เปล่าห่วง (Jealous)》，2025-01~03 发行，而且带动了 17 条采访（采访清单"单曲期"）

三个选择：

| 选项 | 做法 | 代价 |
|---|---|---|
| A（推荐） | 7 首 OST 归 1 号门各剧；两首独立单曲也进 1 号门，作为 L2 之外的第四个 Tab「音乐作品」 | Tab 结构与"按剧切"不完全一致，但音乐线有家 |
| B | 只收 7 首 OST，两首独立单曲暂不建 | 音乐线仍然没归属，且这两首是采访高峰的驱动 |
| C | 独立单曲单独开一门 | 只有 2 条，撑不起一门 |

---

## 六、执行分批（一门一门，1 号门内部再分小步）

| 步 | 做什么 | 验证 | 可回滚 |
|---|---|---|---|
| D1.1 | 修 4 条数据（第一节 + 第四节），补 `works` 的 Hometown | select 前后对比 | 快照表 |
| D1.2 | 建 Hometown Romance `drama_work` 项目（隐藏），补 Harmony Secret 封面 | 线上该门 3 张剧卡 | 按 tag 删 |
| D1.3 | 7 首 OST + 3 本原著进 `works`，挂到对应剧 | 剧内页竖排出现两组 | 按 kind 删 |
| D1.4 | 奖项 8 项 + 宣传节点 11 条进剧内页区块 | 详情页两块内容 | 改 JSON 字段 |
| D1.5 | 影像物料挂接（Affair 已有 18 张；Harmony / Hometown 从档案站取） | 每部剧物料宫格非空 | 删 asset 行 |
| D1.6 | 新建 `/dramas` 落地页 + 详情页竖排改造（**这一步是展示层，单独 commit**） | 线上 /dramas 可访问、三 Tab 可切 | revert commit |
| D1.7 | 全部门面图与封面 HEAD 检查 | 0 破图 | — |

每一步做完停下来给你看，不连着做。

---

## 七、七个门的推进顺序（按"缺口 × 图源就绪度"排）

| 顺序 | 门 | 为什么这个位置 |
|---|---|---|
| 1 | 影视作品 | 内容最集中，图库已有 18 张打底，且它是别的门的事件源头（先立边界，后面不重复） |
| 2 | 公开活动 | 台账 47 条已建好，只剩补图 |
| 3 | 线下活动 | 53 条已建好，剩 7 场补图 |
| 4 | 杂志特辑 | 11 条在，差 6 本，图库 237 张可挂 |
| 5 | 商务合作 | 45 条，图源未实测 |
| 6 | 对话 | 97 条从零，但清单最全 |
| 7 | 直播 | 55 条从零，且一条播放地址都没有 |

---

## 八、还没定的四件事

1. **音乐归属**选 A / B / C（第五节）。
2. **周边 15 SKU**：`works.kind` 白名单里没有 `merchandise`，要加还是先只做区块展示？
3. **宣传节点**要不要也建成可点击的条目（带档案站链接），还是只做剧内页时间线文字？
4. **`/dramas` 独立页**现在做，还是等 1 号门内容填完再做（D1.6 的顺序）？

---

## 九、这份方案明确不做的事

- 不动 `components/`、`app/api/**`，直到 D1.6 且你确认
- 不建任何数据，直到你说"从 D1.1 开始"
- 不碰 6 号门的 97 条（等 1 号门收尾）
- 不改 3、4 号门已建的 100 条，除了第四节那 2 条日期/合并修正

---

## 十、表结构统一（2026-10-20 晚已执行，推翻本文第三节的临时做法）

方案最初为 1 号门单开了一张 `drama_events`。这是错的：它让「同一件事」在后台有两个身份（一个项目 + 一个事件），于是加一条事件就等于多加一个项目，草稿箱和项目管理两个列表对不上。已按下面这一套改回来。

**唯一的规则：前台最小单位（事件）= `projects` 里的一行。门就是类型。**

| 层级 | 由什么表达 | 例子 |
|---|---|---|
| 门 | `projects.category` | `drama_work` / `public_appearance` / `live_event` |
| 门内分类 | 1 号门用「剧行」表达（`project_kind='series'`）；其他门用 `subtype` | Affair / Harmony Secret / Hometown Romance；`awards` / `fashion` / `premiere` |
| 事件 | 一行 project | Premiere、Hub Awards、I'm Yours |
| 事件的内容形态 | `project_kind` + 已有字段 | `event`=图片墙、`video`=介绍+外链（`watch_url`）、有 `interview_md`=正文 |

1 号门内再往下分六组（`series_body / music / novel / promo / award / footage`），这六组是**事件的 subtype**，不是剧的分类——新增一部剧不会改这张表，只是多一行 `project_kind='series'`。

**已执行的动作（快照可回滚）**

1. 快照：`projects_snap_m1_20261020`、`gallery_assets_snap_m1_20261020`、`drama_events_snap_m1_20261020`
2. 三部剧行：`project_kind='series'`，`subtype` 置空
3. CHECK 约束扩容：`project_kind ∈ (event, theme, series, video)`；`subtype` 去掉三个剧名、加六个组名
4. `slug` 唯一性从「全局唯一」改为「(所属作品, slug) 唯一」，否则三部剧不能各有一个 `premiere`
5. 43 条事件全部落进 `projects`，其中 4 条原本已按公开活动手工登记（CHANGE2561 Showcase / Harmony First Premiere / Hometown Final Episode / KAZZ Awards 2026）→ **改挂而不是新建**，避免同名两份
6. 18 张 Affair stills 的 `gallery_assets.project_id` 从剧行改指 `stills` 事件行
7. 代码：`/dramas` 三页、`sitemap`、后台项目管理改成读 `projects`；删掉只服务旧模型的 `/api/admin/drama-events`、`/api/admin/projects/[id]/event-link` 和关联弹窗

`drama_events` 表**没有删**，作历史快照保留，代码不再读取。

**后台因此得到的两个入口（这一轮补的）**

- 新建项目：选门 → 选分类（subtype）→ 1 号门再选所属剧；建完即为已发布事件，图片直接挂在这一行上
- 编辑项目：同上，另外 `project_kind` 可设 `series`（作品本体）/ `video`（外链条目）
