# 图片命名规范（全站）

2026-10-21 起草，取代同日的 `20261021-asset-naming.md` 初版（那一版只管杂志，且把站点前缀和人物混在了一段里）。

目标是上万张图片仍然可管理：文件名本身就是一条完整档案，脱离数据库也能读懂。

---

## 一、一条规则

```
<人物>-<门>-<主体>[-<主题>]-<日期>-<序号>.webp
```

- 全大写 ASCII，只用 `-` 分隔，不用空格、下划线、点、引号、感叹号。
- **缺的段整段省略，不写占位符**（不写 `NA`、不写 `0000`）。
- 段数不固定，但首两段（人物、门）和末段（序号）永远存在，所以从右往左读一定稳。

例：

```
LMSY-MAG-KAZZ217-YOUTHCHOICE-20260731-001.webp
LM-MAG-OAT-20241211-012.webp
SY-LIVE-20250218-001.webp
LMSY-DRAMA-AFFAIR-STILL-20240830-003.webp
```

---

## 二、第一段：人物

一站两角，所以人物是最先要能看出来的东西。

| 值 | 含义 |
|---|---|
| `LMSY` | 双人 |
| `LM` | Lookmhee 单人 |
| `SY` | Sonya 单人 |

双人刊、双人活动、双人直播一律 `LMSY`。单人刊、单人直播、单人出席一律写人名码。
**这一条同时解决了「同一天两人各拍一本」的编号相撞问题**——PERLA 2025-09-10 两版靠首段就分开了。

---

## 三、第二段：门

与站点现有的门一一对应，一个门一个码，不新增不合并。

| 门 | 路径 | 码 |
|---|---|---|
| 影视作品 | `/dramas` | `DRAMA` |
| 杂志特辑 | `/editorial` | `MAG` |
| 现场活动 | `/live-events` | `EVENT` |
| 公开亮相 | `/appearances` | `APPEAR` |
| 品牌合作 | `/commercial` | `BRAND` |
| 对话 | `/talks` | `TALK` |
| 直播 | `/live` | `LIVE` |
| 幕后（无门） | — | `BTS` |
| 早期档案（无门） | — | `EARLY` |

旧命名里的 `LMSY-AD-…`（AD = advertisement）统一换成 `BRAND`，因为 `AD` 看不出是哪个品牌。

---

## 四、第三段：主体

主体 = 这个门里的第二层，回答「哪一个」。缺了主体，文件名就只是一串日期。

### 4.1 影视作品 `DRAMA`

主体 = 作品码 + 部分码。

| 作品 | 码 |
|---|---|
| Affair（爱情诡计） | `AFFAIR` |
| Harmony Secret（和谐密语） | `HARMONY` |
| Hometown Romance（乡村罗曼史） | `HOMETOWN` |

| 部分（对应 subtype） | 码 |
|---|---|
| 剧集正片 / 剧照（`series_body`） | `STILL` |
| 宣传物料（`promo`） | `PROMO` |
| 音乐 / MV（`music`） | `MV` |
| 原著小说（`novel`） | `NOVEL` |
| 奖项（`award`） | `AWARD` |
| 花絮影像（`footage`） | `FOOTAGE` |

```
LMSY-DRAMA-AFFAIR-PROMO-20240815-001.webp
LMSY-DRAMA-HARMONY-STILL-20250726-001.webp
LMSY-DRAMA-HOMETOWN-AWARD-20260520-001.webp
```

### 4.2 杂志 `MAG`

主体 = 刊物码（有期号就连期号），第四段 = 主题。

| 刊物 | 码 |
|---|---|
| BEAT'XL | `BEATXL` |
| STARRY 星光画报 | `STARRY21` |
| UNIQUE | `UNIQUE` |
| RETRO | `RETRO` |
| OAT | `OAT` |
| U! | `UMAG` |
| ISLAND JOY | `ISLAND` |
| GAZE | `GAZE` |
| KAZZ 211 | `KAZZ211` |
| KAZZ 217 | `KAZZ217` |
| KAZZ 2024-10 | `KAZZ2410` |
| KAZZ 2025-02 | `KAZZ2502` |
| THE R | `THER` |
| PERLA | `PERLA` |
| FIVEME | `FIVEME` |

主题写连写大写：`SMOLDERING`、`DEEPINTHEEYE`、`AMORFATI`、`SOULMATE`、`BRILLIANTMATCH`、`ALLOFMYLIFE`、`THEDREAMUNFOLDS`、`HEARTBEATFORYOU`、`HARMONYSECRET`、`YOUTHCHOICE`、`MODERNSHOW`、`ROMANTICPOEM`。主题不明就省略这一段。

PERLA 2025-09 两本是同一天出的单人刊，主题取各自官方中文名的意译（不是旧名 `DREAM`，那是最初建库时随手写的）：

| 事件 | 主题码 | 依据 |
|---|---|---|
| PERLA · 摩登秀场 (Lookmhee) | `MODERNSHOW` | 标题「摩登秀场」 |
| PERLA · 浪漫之诗 (Sonya) | `ROMANTICPOEM` | 标题「浪漫之诗」 |

```
LMSY-MAG-BEATXL-SMOLDERING-20241023-001.webp
LMSY-MAG-GAZE-THEDREAMUNFOLDS-20250117-001.webp
LM-MAG-PERLA-MODERNSHOW-20250914-001.webp
SY-MAG-PERLA-ROMANTICPOEM-20250914-001.webp
SY-MAG-KAZZ217-YOUTHCHOICE-20260731-001.webp
LMSY-MAG-KAZZ2410-20241001-001.webp        (主题未知)
```

### 4.3 现场活动 `EVENT`

主体 = 子类码 + 场次码（城市或活动简称）。

| 子类（subtype） | 码 |
|---|---|
| 粉丝见面会 `fanmeeting` | `FANMEET` |
| 品牌活动 `brand_event` | `BRANDDAY` |
| 生日会 `birthday` | `BIRTHDAY` |

```
LMSY-EVENT-FANMEET-BKK-20250115-001.webp
LMSY-EVENT-FANMEET-MNL-20260919-001.webp
LM-EVENT-BIRTHDAY-20250218-001.webp
```

### 4.4 公开亮相 `APPEAR`

主体 = 子类码 + 活动码。

| 子类 | 码 |
|---|---|
| 颁奖礼 `awards` | `AWARDS` |
| 时装周 `fashion` | `FASHION` |
| 品牌站台 `brand_stage` | `BRANDSTAGE` |
| 行业活动 `industry` | `INDUSTRY` |
| 公益 `charity` | `CHARITY` |
| 首映 `premiere` | `PREMIERE` |

```
LMSY-APPEAR-AWARDS-KAZZAWARDS-20250515-001.webp
LMSY-APPEAR-FASHION-MNLFW-20260905-001.webp
```

### 4.5 品牌合作 `BRAND`

主体 = 品牌码 + 战役码。品牌码统一取品牌英文名连写大写。

```
LMSY-BRAND-SIRIVANNAVARI-20250926-001.webp
LMSY-BRAND-ALDO-COFFEE-20251123-001.webp
```

### 4.6 对话 `TALK`

主体 = 类别码 + 节目码。类别就是 `/talks` 的第二层。

| 类别 | 码 |
|---|---|
| 采访 `interview` | `INTERVIEW` |
| 综艺 `variety` | `VARIETY` |
| 电台 `radio` | `RADIO` |

```
LMSY-TALK-INTERVIEW-PRAEW-20250908-001.webp
LMSY-TALK-VARIETY-WOODY-20250610-001.webp
```

### 4.7 直播 `LIVE`

人物段已经说清是谁开的播，主体不再写 `duo`/`solo`，只写平台（可省）。

```
LMSY-LIVE-20250301-001.webp
LM-LIVE-IG-20250412-001.webp
SY-LIVE-TIKTOK-20250412-001.webp
```

### 4.8 幕后 / 早期档案

`LMSY-BTS-<作品码>-<日期>-001`、`LMSY-EARLY-<内容码>-<日期>-001`。

---

## 五、日期与序号

- 日期 `YYYYMMDD` 八位。**日期未知就整段省略**，解析时靠「末段前的八位数字」判断即可。
- 序号三位起，`001`。同一天同一事件超过 999 张再用四位。
- 序号是**页序/发布顺序**，不是上传顺序，重传不得打乱。

---

## 六、事件层编号（数据库）

图片文件名是「事件 + 页」，所以事件本身也要有稳定编号，两者必须能对得上。

`projects.catalog_id` = `LMSY-<门>-<主体>[-<主题>]`，**不含人物、不含日期、不含序号**：

| 事件 | `catalog_id` | 图片文件名示例 |
|---|---|---|
| GAZE 2025-02 | `LMSY-MAG-GAZE-THEDREAMUNFOLDS` | `LMSY-MAG-GAZE-THEDREAMUNFOLDS-20250117-001` |
| PERLA Lookmhee | `LMSY-MAG-PERLA-MODERNSHOW-LM` | `LM-MAG-PERLA-MODERNSHOW-20250914-001` |
| Affair 宣传 | `LMSY-DRAMA-AFFAIR-PROMO` | `LMSY-DRAMA-AFFAIR-PROMO-20240815-001` |

**事件编号一律以 `LMSY-` 开头**（2026-10-22 用户定：网站以 LMSY 为核心，编号必须带）。
这里的前缀是站名，和图片名第一段的人物码不是一回事——单人刊的图片名仍然以 `LM-` / `SY-` 起头。

单人刊是独立事件，主体位后加 `-LM` / `-SY` 以便两条事件不撞号；双人事件不加。

**关系式**：取事件编号，把开头的 `LMSY` 换成该页的人物码（双人页仍是 `LMSY`）、去掉末尾的 `-LM` / `-SY`，
再接日期和序号。`gallery_assets.catalog_id` 存文件名主干（不含扩展名），与 R2 对象名逐字一致。

| 事件编号 | 人物 | 文件名 |
|---|---|---|
| `LMSY-MAG-GAZE-THEDREAMUNFOLDS` | 双人 | `LMSY-MAG-GAZE-THEDREAMUNFOLDS-20250117-001` |
| `LMSY-MAG-PERLA-MODERNSHOW-LM` | Lookmhee | `LM-MAG-PERLA-MODERNSHOW-20250914-001` |
| `LMSY-MAG-KAZZ217-YOUTHCHOICE-SY` | Sonya | `SY-MAG-KAZZ217-YOUTHCHOICE-20260731-001` |

事件编号末尾的 `-LM` / `-SY` 只是为了把两条单人事件在数据库里分开，人物段已经表达了是谁，所以文件名里不重复。
只有同一刊物确实出了两人两个版本时才加这个后缀（PERLA、KAZZ 217）；OAT 只有单人版，事件编号就是 `LMSY-MAG-OAT`。

### 6.1 封面不参与命名（2026-10-21 定）

**封面不是一个文件，是这个事件的一个指针。** 它指向该事件图批里已有的某一张，取值就是那张图的地址：

- `projects.cover_url` — 门里那张卡片用的图。
- `projects.homepage_cover_url` — 首页/区块用的图。

所以规则里**没有「封面层」，也没有 `-000` 号段**，序号永远从 `001` 开始。换封面时只改指针，
文件名不动、序号不动、Cloudflare 上的对象不搬——这是「封面会变」这件事唯一不漏的做法。

后台入口（已存在）：`/admin/projects/<id>/curate` 点某张图设为封面 → `PATCH /api/admin/projects/<id>/cover`，
一次写两处：`gallery_assets.is_cover`（把旧封面清掉、新的置 true）和 `projects.cover_url`。

三层封面各存一处，别混：

| 层 | 存在哪里 | 后台在哪改 |
|---|---|---|
| 门 | `gallery_assets.portal_slot`（首页五入口）/ `interview_slot`（对话、直播） | `/admin/curation` 或素材库 PORTALS |
| 分类 | `gallery_assets.category_slot`，值是二层路径 `/live-events/fanmeeting` | `/admin/curation` |
| 事件 | `projects.cover_url`（影视门第二层的剧集也是这一层） | `/admin/curation` 或项目 → 策展 |

`/admin/curation` 就是按「门 → 分类 → 事件」摆的一棵树，三层的封面都在那里指定，
走同一个选图弹窗（默认只看本节点的图，可切「全部图片」）。分类封面的列定义见
`docs/architecture/20261021-category-slot.sql`。

老代码里的 `-000` 判断（`lib/editorial-issues.ts` 的 `discoverCoverFromGallery`、后台 curate 的 `isCover`）
作为历史兜底保留：库里若还有 `-000` 结尾的旧图仍然认它，但新规则不再产出这种编号。

---

## 七、Cloudflare R2 目录

对象键（object key）分层，便于按人物/门/年批量操作：

```
<person>/<door>/<yyyy>/<文件名>
```

```
lmsy/mag/2025/LMSY-MAG-GAZE-THEDREAMUNFOLDS-20250117-001.webp
lm/mag/2024/LM-MAG-OAT-20241211-001.webp
sy/live/2025/SY-LIVE-20250218-001.webp
```

现在用的是 `magazines/2025/…`（按旧门名分目录），改名时一并换成上面的结构。

---

## 八、现有 330 张怎么迁

事实：`gallery_assets` 共 330 行，其中 8 行没有 `catalog_id`。R2 凭据在 `.env.local`，可程序化改名。

| 步 | 动作 | 说明 |
|---|---|---|
| 1 | 生成对照表 | 输出 `old_key → new_key` 的 CSV，先给用户过目 |
| 2 | R2 复制 | 用 S3 API `CopyObject` 到新键，旧键暂不删 |
| 3 | 回写数据库 | `gallery_assets.image_url` / `catalog_id` / `title` / `caption`、`projects.cover_url`、`projects.homepage_cover_url`、`profiles.avatar_url` |
| 4 | 校验 | 逐条 HEAD 新地址必须 200，数量必须是 330 |
| 5 | 删旧键 | 校验通过后再删，删的是旧键不是新键 |

**风险**：第 4 步没全绿就不能进第 5 步。整个过程旧地址在 1–4 步之间仍然可用，所以站点不会挂图。

---

## 九、非 ASCII 名称怎么进码

文件名只允许 A-Z 0-9 和 `-`，所以泰语、中文标题必须换成一个代号，不能直接音译进文件名。

- 已有英文名的用英文名：`Only We Know` → `ONLYWEKNOW`、`Secret Deal` → `SECRETDEAL`。
- 只有泰语名的 OST（`แค่รักก็มากพอ`、`ดีพอกับใจ` 等），取官方英文副标题；没有英文副标题的，给四位以内代号并登记在事件台账里。
- 中文活动名同上：`田言蜜语·田园罗曼 双人见面会` → 用城市/系列代号，不拼拼音。
- 代号一旦给定不再改：它是文件名的一部分，改了等于改名。

## 十、执行记录（2026-10-21）

用户定稿：人物码 `LMSY / LM / SY`，主题进文件名，现有图片全部迁移。

| 项 | 结果 |
|---|---|
| 计划迁移 | 276 张 |
| 实际改名 | **275 张**（另 1 张不是我们的对象，见下） |
| 暂不处理 | **54 张**（商业门 4 个事件，标题是 `Sweet` / `Close` / `live` / `coffee`，品牌名未知） |
| 未改动的 | 1 张图存的是外链 `pbs.twimg.com`，不在 R2，改名会断链，已保留原地址 |
| 数据库事件编号 | 16 个 `projects.catalog_id` 写入 |
| 同步改写的字段 | `gallery_assets.image_url` / `catalog_id`、`projects.catalog_id`、`projects.cover_url` / `homepage_cover_url`（15 条）、`profiles.avatar_url`（2 条） |
| 校验 | 275 个新键 R2 HEAD 全部存在且字节数一致；`cdn.lmsy.space` 抽查 12 条返回 200；`/editorial`、`/dramas`、`/appearances` 渲染出的图片地址 0 条旧路径 |
| 快照 | `gallery_assets_snap_rename_20261021`、`projects_snap_rename_20261021`、`profiles_snap_rename_20261021` |

**旧键全部保留**，没有删除。删旧键要等线上确认一周后再做，删的脚本见 `temp/` 下的一次性脚本，不放进仓库。

### 还欠的

1. 商业门 4 个事件的品牌名（Sweet / Close / live / coffee 都是泛词，对应 54 张图），给了名字就补。
2. 事件封面（`projects.cover_url` 指向 `events/live/*.png`、`events/public/*.png` 的那批，共 45 个）仍停在旧目录。**不按 §6.1 给它们起名**：改由后台「设为封面」把指针指到该事件图批里的某一页，指针改了这些孤立的封面文件自然就不被引用，等它们全部失联后整批删掉即可。
3. 未引用的 52 个 R2 对象（`draft/` 下 34 个等）不在任何表里，暂不碰。
