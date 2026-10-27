# 图片命名规范（全站）

2026-10-21 起草，取代同日的 `20261021-asset-naming.md` 初版（那一版只管杂志，且把站点前缀和人物混在了一段里）。
**2026-10-23 修订**：首段改为站点码 `LMSY`，人物改为尾码（见第二节）；699 张单人图与 23 个事件编号已按此重编。

目标是上万张图片仍然可管理：文件名本身就是一条完整档案，脱离数据库也能读懂。

---

## 一、一条规则

```
<事件编号>-<序号>.webp
```

事件编号本身是 `LMSY-<门>-<主体>[-<主题>][-<日期>][-<人物>]`，完整定义见第六节；
**图片名只是事件编号加一个序号**，没有别的变化。

- 全大写 ASCII，只用 `-` 分隔，不用空格、下划线、点、引号、感叹号。
- **缺的段整段省略，不写占位符**（不写 `NA`、不写 `0000`）。
- 首段永远是站点码 `LMSY`，末段永远是序号；**人物码只作尾码出现**（`-LM` / `-SY`），双人图不带。
- 段数不固定，所以从右往左读（序号 → 日期/人物 → 主体 → 门）一定稳。

例：

```
LMSY-MAG-KAZZ217-YOUTHCHOICE-SY-20260731-001.webp
LMSY-MAG-OAT-LM-20241211-012.webp
LMSY-LIVE-20250218-001.webp
LMSY-DRAMA-AFFAIR-STILL-20240830-003.webp
LMSY-EVENT-FANMEET-WUH-20251129-LM-001.webp
```

---

## 二、第一段：站点，最后一段人物

这个站是两个人的站，**所有编号都以 `LMSY` 开头**（2026-10-22 用户定，2026-10-23 落到图片名）。
第一段回答的是「这是哪个站的档案」，不是「谁在里面」。

人物放在**尾码**位，只在单人时出现：

| 值 | 含义 | 出现位置 |
|---|---|---|
| `LMSY` | 双人 | 只在首段，不写尾码 |
| `LM` | Lookmhee 单人 | 事件编号最后一个段（见第六节） |
| `SY` | Sonya 单人 | 同上 |

尾码紧贴**事件编号的末尾**：`MAG` 这类编号没有日期，尾码就接在主体后面（`…-OAT-LM`）；
`EVENT` / `APPEAR` 的编号带日期，尾码在日期之后（`…-WUH-20251129-LM`）。
图片名 = 事件编号 +（编号缺日期时补日期）+ 序号，所以尾码永远在序号前一位。

```
LMSY-MAG-KAZZ217-YOUTHCHOICE-SY-20260731-001     Sonya 单人刊
LMSY-MAG-OAT-LM-20241211-012                     Lookmhee 单人刊
LMSY-EVENT-FANMEET-WUH-20251129-LM-001           武汉 Lookmhee 单人场
LMSY-EVENT-FANMEET-BKK-20250115-001              双人见面会，没有尾码
```

尾码表达的是**这场活动归谁**，不是「这张图里有谁」：单人场里偶尔混着的双人合影也带同一个尾码，
因为编号先要能唯一定位到活动。2026-10-23 之前首段写 `LM-` / `SY-`，同一个活动里的双人页与单人页
会落在两个前缀下、各自起一套序号，取数时要分两次——这是改掉它的原因。

**编号是唯一的，不是识别人数的**：想知道图里有几个人，看图，不看名。

## 三、第二段：门

与站点现有的门一一对应，一个门一个码，不新增不合并。

| 门 | 路径 | 码 |
|---|---|---|
| 影视作品 | `/dramas` | `DRAMA` |
| 杂志特辑 | `/editorial` | `MAG` |
| 特色专题 | `/features` | `FEAT` |
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

主体 = 作品码 + 部分码 + 事件码。

| 作品 | 码 | 作品行自己的编号 |
|---|---|---|
| Affair（爱情诡计） | `AFFAIR` | `LMSY-DRAMA-AFFAIR` |
| Harmony Secret（和谐密语） | `HARMONY` | `LMSY-DRAMA-HARMONY` |
| Hometown Romance（乡村恋人） | `HOMETOWN` | `LMSY-DRAMA-HOMETOWN` |

作品码由**作品行**（`project_kind = 'series'`）的编号提供，新增剧集只改那一行，不入代码表。

| 部分（对应 subtype） | 码 | 收什么 |
|---|---|---|
| 剧集本体 `series_body` | （无，直接接事件码） | 正片分集、官方剧照、试播集 |
| 宣传物料 `promo` | `PROMO` | 官宣、预告、定妆、票务、未剪版；首映/终映也是它的事件码（见下） |
| 音乐 `music` | `MUSIC` | OST / MV |
| 原著小说 `novel` | `NOVEL` | 原著与改编小说 |
| 奖项 `award` | `AWARD` | 这部剧去参评的奖项 |
| 花絮影像 `footage` | `FOOTAGE` | 幕后、Reaction、Highlights、未公开片段 |

**事件码（第三段）**：一个作品的一个部分下往往有多条（Affair 有 4 条花絮），只写「作品 + 部分」会撞号。
事件码取标题的英文名连写大写，去掉冠词与 `Awards` 这类通用词；年份保留后两位：

```
LMSY-DRAMA-AFFAIR-FOOTAGE-HIGHLIGHTS
LMSY-DRAMA-AFFAIR-AWARD-YENTERTAIN24
LMSY-DRAMA-HARMONY-MUSIC-SECRETDEAL
LMSY-DRAMA-HOMETOWN-PROMO-FITTING
```

- **通用词包含载体词**：`IMAGE` / `IMAGES` / `PHOTO` / `PHOTOS` / `PICTURE` / `VIDEO` / `GALLERY` 与冠词、`Awards` 同等对待。它们说的是「这是什么形态」，不是「这是哪一批」——库里每条都是图或视频。`Promotional Image Gallery` 因此是 `PROMOTIONAL`，不是 `PROMOTIONALIMAGEGALLERY`。
- **事件码上限 16 字符**，超出按整词截断（不切半个词）；末尾两位年份优先保留，它是区分两届同名奖项的唯一字符。`FINALEPISODE`（12）、`YENTERTAIN24`（12）、`FINALSECRETDEAL`（15）都在限内。
- **入库向导里末段可改短**：作品 + 部分是选出来的，末段是标题推出来的，标题在描述、编码只需识别。向导允许在入库前把末段改短（`PROMOSTILLS` 之类），一旦入库就固定。
- **首映礼 / 终映归 `promo` 之下**（2026-10-27 调整）：它们不再是独立部分，而是 `PROMO` 下的事件码，如 `LMSY-DRAMA-AFFAIR-PROMO-PREMIERE`、`LMSY-DRAMA-AFFAIR-PROMO-FINALEPISODE`。
- 泰语标题没有英文副标题的，按第九节给四位以内代号（`KAER`、`FAEN`），并在事件台账登记。
- 事件码只增不改：它已经写进图片名。

```
LMSY-DRAMA-AFFAIR-PROMO-PREMIERE-20240830-001.webp
LMSY-DRAMA-HARMONY-PROMO-FINALEPISODE-20250913-001.webp
LMSY-DRAMA-AFFAIR-AWARD-YENTERTAIN24-001.webp
```

代码唯一入口：`lib/catalog-id.ts` 的 `DRAMA_SUBTYPE_CODES` 与 `dramaSubject()`。

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
LMSY-MAG-PERLA-MODERNSHOW-LM-20250914-001.webp
LMSY-MAG-PERLA-ROMANTICPOEM-SY-20250914-001.webp
LMSY-MAG-KAZZ217-YOUTHCHOICE-SY-20260731-001.webp
LMSY-MAG-KAZZ2410-20241001-001.webp        (主题未知)
```

### 4.3 现场活动 `EVENT`

主体 = 子类码 + 城市码。两段都由后台下拉决定，**不手填**（2026-10-23 起）。

| 子类（subtype） | 码 |
|---|---|
| 演唱会与巡演 `concert` | `CONCERT` |
| 粉丝见面会 `fanmeeting` | `FANMEET` |
| 签售会 `fansign` | `FANSIGN` |
| 品牌活动 `brand_event` | `BRANDDAY` |
| 生日会 `birthday` | `BIRTHDAY` |

城市码（`projects.city`，固定表，见 `lib/catalog-id.ts` 的 `CITY_CODES`）：

| 城市 | 码 | 城市 | 码 |
|---|---|---|---|
| 曼谷 | `BKK` | 上海 | `SHA` |
| 澳门 | `MFM` | 深圳 | `SZX` |
| 香港 | `HKG` | 杭州 | `HGH` |
| 台北 | `TPE` | 武汉 | `WUH` |
| 高雄 | `KHH` | 福州 | `FOC` |
| 南宁 | `NNG` | 胡志明市 | `SGN` |
| 天津 | `TSN` | 马尼拉 | `MNL` |
| 重庆 | `CKG` | 金边 | `PNH` |
| 成都 | `CTU` | 新加坡 | `SIN` |
| 首尔 | `SEL` | 墨西哥城 | `MEX` |
| 圣保罗 | `SAO` | | |

城市未知时**整段省略**，不是写 `NA`：

```
LMSY-EVENT-FANMEET-BKK-20250115-001.webp
LMSY-EVENT-FANMEET-MNL-20260919-001.webp
LMSY-EVENT-CONCERT-MEX-20261011-001.webp
LMSY-EVENT-FANSIGN-SHA-20260321-SY-001.webp     单人场，尾码在日期之后
LMSY-EVENT-BIRTHDAY-20250218-LM-001.webp        城市未知，城市段省略
LMSY-EVENT-BRANDDAY-20260822-001.webp           (城市未知)
```

这两门的事件编号带日期，见第六节；单人场的 `-LM` / `-SY` 写在日期之后。

对应的事件编号在后面接日期，见第六节的例外说明。

### 4.4 公开亮相 `APPEAR`

主体 = 子类码 + 城市码。两段都由后台下拉决定，**不手填**（2026-10-23 起，与 4.3 同一机制）。

| 子类 | 码 |
|---|---|
| 颁奖礼 `awards` | `AWARDS` |
| 时装周 `fashion` | `FASHION` |
| 品牌站台 `brand_stage` | `BRANDSTAGE` |
| 行业活动 `industry` | `INDUSTRY` |
| 公益 `charity` | `CHARITY` |
| 公司活动 `company` | `COMPANY` |

城市码同 4.3 的 `CITY_CODES`；城市未知时整段省略。

```
LMSY-APPEAR-AWARDS-BKK-20250515-001.webp
LMSY-APPEAR-FASHION-MNL-20260905-SY-001.webp
LMSY-APPEAR-COMPANY-BKK-20250611-001.webp
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

尾码已经说清是谁开的播，主体不再写 `duo`/`solo`，只写平台（可省）。

```
LMSY-LIVE-20250301-001.webp
LMSY-LIVE-IG-LM-20250412-001.webp
LMSY-LIVE-TIKTOK-SY-20250412-001.webp
```

### 4.8 幕后 / 早期档案

`LMSY-BTS-<作品码>-<日期>-001`、`LMSY-EARLY-<内容码>-<日期>-001`。

### 4.9 特色专题 `FEAT`（2026-10-22 定；2026-10-26 修订：日期段改为可选）

主体 = 专题码。**事件编号一律不写日期**——专题是长期收藏，不是一个时间点的事件，
同一专题往后随时可能补进几年前的旧图或几年后的新图。

**图片编号的日期段可选**（2026-10-26 修订）。旧规是「专题一律不写日期」，这条对
「背影」这类跨年主题成立，但对「日常」这类不成立：日常每一张图都必然属于某一天。
所以日期不再是禁用的，而是**能钉到天就写，钉不到就整段省略**——与其他门同一条规则。

```
LMSY-FEAT-BACKVIEW-001.webp                  跨年主题：不写日期（旧规仍有效）
LMSY-FEAT-DAILY-20221015-001.webp            日常主题：这张图是 2022-10-15 的
LMSY-FEAT-DAILY-20221015-002.webp            同一天的第二张
```

- 写了日期的按**同一天**续号（`LMSY-FEAT-DAILY-20221015-001/002`）；没写日期的
  按**整个专题**续号（`LMSY-FEAT-BACKVIEW-001/002`）。两种可以共存于一个专题。
- 序号只增不减，新图接在最大序号后面，已有图的序号永远不动。
- 专题以 `project_kind = 'theme'` 的项目挂在 `/features`，事件编号 = `LMSY-FEAT-<专题码>`。
- 不要用 `EARLY` 码命名专题——专题不是「早期」，是长期主题（用户 2026-10-22 定）。

---

## 五、日期与序号

- 日期 `YYYYMMDD` 八位。**日期未知就整段省略**，解析时靠「末段前的八位数字」判断即可。
- 序号三位起，`001`。同一天同一事件超过 999 张再用四位。
- 序号是**页序/发布顺序**，不是上传顺序，重传不得打乱。

---

## 六、事件层编号（数据库）

图片文件名是「事件 + 页」，所以事件本身也要有稳定编号，两者必须能对得上。
`projects.catalog_id` 是唯一的权威：图片名从它推导，不反过来。

```
LMSY-<门>-<主体>[-<主题>][-<人物>]             不带日期的门
LMSY-<门>-<主体>[-<主题>]-<日期>[-<人物>]       EVENT / APPEAR
```

| 事件 | `catalog_id` | 图片文件名示例 |
|---|---|---|
| GAZE 2025-02 | `LMSY-MAG-GAZE-THEDREAMUNFOLDS` | `LMSY-MAG-GAZE-THEDREAMUNFOLDS-20250117-001` |
| PERLA Lookmhee | `LMSY-MAG-PERLA-MODERNSHOW-LM` | `LMSY-MAG-PERLA-MODERNSHOW-LM-20250914-001` |
| Affair 宣传 | `LMSY-DRAMA-AFFAIR-PROMO` | `LMSY-DRAMA-AFFAIR-PROMO-20240815-001` |

**`EVENT` / `APPEAR` 的编号带日期（2026-10-23 定）。**
这两门的主体只有「类型 + 城市」，不含活动身份——两门 105 个事件里 69 个会撞号
（曼谷 15 场颁奖礼都叫 `LMSY-APPEAR-AWARDS-BKK`）。日期段把「哪一天办的那一场」变成事件身份：

```
LMSY-EVENT-FANMEET-BKK-20250115        双人见面会
LMSY-EVENT-CONCERT-MNL-20260919        马尼拉 FanCon
LMSY-APPEAR-AWARDS-BKK-20250515        曼谷颁奖礼
LMSY-EVENT-BRANDDAY-20260822           城市未知，城市段整段省略
```

**其余门（`MAG` / `DRAMA` / `BRAND` / `TALK` / `LIVE` / `FEAT`）编号里不带日期。**

**所有门都可能带 `-LM` / `-SY` 尾码（2026-10-23 定）。** 尾码表示这场事件归谁，
写在事件编号的最后一段：不带日期的门接在主体之后，`EVENT` / `APPEAR` 接在日期之后。
双人事件没有尾码。

```
LMSY-EVENT-FANMEET-WUH-20251129-LM      武汉 Lookmhee 单人场
LMSY-MAG-OAT-LM                         Lookmhee 单人刊（只有一版，也带尾码）
LMSY-MAG-KAZZ217-YOUTHCHOICE-SY         Sonya 版，与 LM 版靠尾码分开
LMSY-MAG-GAZE-THEDREAMUNFOLDS           双人，无尾码
```

单人**不再**靠首段区分：旧写法 `LM-MAG-OAT` / `SY-EVENT-FANSIGN-SHA-20260321` 已于 2026-10-23 全部退役。

**关系式（2026-10-23 定）**：

```
图片名 = 事件编号 +（编号里没有日期时补上 <日期>）+ <序号>
```

人物不再是关系式里的变量：没有「把 LMSY 换成人物码」这一步，也没有「去掉尾码」这一步。
`gallery_assets.catalog_id` 存文件名主干（不含扩展名），与 R2 对象名逐字一致。

```
LMSY-EVENT-FANMEET-BKK-20250115        →  LMSY-EVENT-FANMEET-BKK-20250115-001
LMSY-EVENT-FANMEET-WUH-20251129-LM     →  LMSY-EVENT-FANMEET-WUH-20251129-LM-001
LMSY-APPEAR-AWARDS-BKK-20250515        →  LMSY-APPEAR-AWARDS-BKK-20250515-001
LMSY-MAG-GAZE-THEDREAMUNFOLDS          →  LMSY-MAG-GAZE-THEDREAMUNFOLDS-20250117-001
LMSY-MAG-OAT-LM                        →  LMSY-MAG-OAT-LM-20241211-001
LMSY-FEAT-BACKVIEW                     →  LMSY-FEAT-BACKVIEW-001
LMSY-FEAT-DAILY                        →  LMSY-FEAT-DAILY-20221015-001（有日期就带上）
```

| 事件编号 | 归属 | 文件名 |
|---|---|---|
| `LMSY-MAG-GAZE-THEDREAMUNFOLDS` | 双人 | `LMSY-MAG-GAZE-THEDREAMUNFOLDS-20250117-001` |
| `LMSY-MAG-PERLA-MODERNSHOW-LM` | Lookmhee | `LMSY-MAG-PERLA-MODERNSHOW-LM-20250914-001` |
| `LMSY-MAG-KAZZ217-YOUTHCHOICE-SY` | Sonya | `LMSY-MAG-KAZZ217-YOUTHCHOICE-SY-20260731-001` |

代码唯一实现：`lib/catalog-id.ts` 的 `buildProjectCatalogId()`（事件编号）、
`assetIdPrefixFor()`（图片名主干）、`subjectFromProjectId()` / `personFromProjectId()`（反向读）。
文件名叫什么只由这几个函数决定，路由和脚本不再自己拼字符串。

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

对象键（object key）与文件名同源，第一层就是站点码 `lmsy`（2026-10-23 起；旧目录 `lm/` / `sy/` 已清空）：

```
lmsy/<door>/<yyyy>/<文件名>
```

无日期的编号（不钉到某天的 FEAT 专题图）不带年份段：

```
lmsy/<door>/<文件名>
```

```
lmsy/mag/2025/LMSY-MAG-GAZE-THEDREAMUNFOLDS-20250117-001.webp
lmsy/mag/2024/LMSY-MAG-OAT-LM-20241211-001.webp
lmsy/live/2025/LMSY-LIVE-TIKTOK-SY-20250412-001.webp
lmsy/feat/LMSY-FEAT-BACKVIEW-001.webp
lmsy/feat/2022/LMSY-FEAT-DAILY-20221015-001.webp
```

路径由 `lib/catalog-id.ts` 的 `r2KeyForCatalogId()` 从文件名推出来，不单独维护。
旧目录 `magazines/<年>/`（按旧门名分）仍有对象待退役，新图不再写入那里。

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

---

## 十一、2026-10-23 首段统一为站点码（执行记录）

用户决定：单人不再用首段区分，**首段永远是 `LMSY`，单人改成尾码**。理由是两个前缀会把同一场活动的图拆成两套序号。

| 项 | 结果 |
|---|---|
| 受影响事件 | **23 个**（5 本单人杂志 + 18 场单人活动），其中 15 个新加尾码 |
| 图片改名 | **699 张**（R2 复制到新键 → 库内 `catalog_id` / `image_url` 切换 → 删旧键） |
| 事件编号 | 15 条追加 `-LM` / `-SY`（另 8 条本来就是单人、编号已带） |
| 指针 | `projects.cover_url` / `homepage_cover_url`、`profiles.avatar_url` 同步改指新地址 |
| 尺寸表 | `lib/generated/image-dimensions.json` 699 个 key 重写，另删 4 条孤儿 key |
| 校验 | 库内 `catalog_id` 与事件编号全量对账 0 偏差；新键 R2 HEAD 全存在 |
| 备份 | `gallery_assets_snap_person_20261023`、`projects_snap_person_20261023`、`profiles_snap_person_20261023` |

代码侧：`buildProjectCatalogId()` / `assetIdPrefixFor()` 成为唯一构造入口，
`subjectFromProjectId()` 同时剥日期与尾码；后台「人物码」在事件已有编号后锁定，不再逐批手选。

---

## 十二、2026-10-24 影视门编号（执行记录）

第一门原有 4 个编号覆盖 46 行：`LMSY-DRAMA-PREMIERE` 被两场不同首映共用、
`DRAMA-AFFAIR-STILL` 缺站点前缀、39 行干脆没有编号。按 4.1 的「作品 + 部分 + 事件码」一次补全。

| 项 | 结果 |
|---|---|
| 事件编号 | **46 条**（43 个事件/视频 + 3 个作品行）；`projects.catalog_id` 重复数 0 |
| 首映撞号 | 拆成 `HARMONY-PREMIERE` / `HOMETOWN-PREMIERE`；`LMSY-DRAMA-FINAL` → `HARMONY-SERIES-FINALEPISODE` |
| 图片改名 | **68 张**（`FINAL` 31、`AFFAIR-STILL` 18、两条 `PREMIERE` 19） |
| 扩展名 | 其中 9 张 `AFFAIR-STILL` 原本是 `.jpg`，重新编码为 `.webp`，让键可以从编号统一推导 |
| 尺寸表 | 18 个 key 重写；另 50 张的宽高存在 `gallery_assets.width/height`，无需进尺寸表 |
| 校验 | 78/78 图片名 = 事件编号 + 日期 + 序号；旧编号在 `projects` / `gallery_assets` / 指针列中 0 引用 |
| 备份 | `projects_snap_drama_ids_20261023`、`gallery_assets_snap_drama_ids_20261023`，回滚 `temp/20261024_drama_ids_rollback.sql` |

---

## 十三、2026-10-24 后台入库流程对齐八个门

命名规则写在这里，但真正产生名字的是后台。此前草稿箱入库向导只有 4 个选项、6 个门的主体靠手填，
「规范」和「实际产出的名字」是两套东西。本节把两者钉在一起：**向导里每一个决定名字的步骤都是下拉**。

### 13.1 向导顺序（与第一段的构造同序）

`图片分类` 之外全部是选择，顺序就是编号的构造顺序：

| 步 | 选什么 | 落到哪一段 | 数据来源 |
|---|---|---|---|
| 1 | 人物（`LMSY` / `LM` / `SY`） | 首段永远是 `LMSY`；单人只在尾部加码 | 固定三项 |
| 2 | 门（8 个） | 第二段 | `WIZARD_DOORS`，与第三节表格一一对应 |
| 3 | 门内第二层 | 第三段起头 | 见 13.2 |
| 4 | 地点（`EVENT` / `APPEAR`） | 主体第二段 | `CITY_CODES` |
| 5 | 事件 / 日期 / 主题 | 主体余下部分或事件编号 | 事件列表 + 日期修补 |
| 6 | 图片分类 | 不参与命名 | 事件自带分类 ∪ 同类目常用分类，可手填 |

八个门的顺序即是首页顺序：特色专题 → 五个入口（影视作品 / 杂志特辑 / 现场活动 / 公开亮相 / 品牌合作）
→ 灵魂共振两个门（对话 / 直播）。

### 13.2 每个门的第二层

| 门 | 第二层 | 来源 |
|---|---|---|
| `FEAT` | 主题 | `catalog_registry` kind=topic |
| `DRAMA` | 作品行 → 部分 | 作品行（`project_kind=series`）+ `DRAMA_SUBTYPE_CODES` |
| `MAG` | 刊物 | `catalog_registry` kind=publication |
| `EVENT` / `APPEAR` | 分类（subtype）→ 城市 | 分类注册表 + `CITY_CODES` |
| `BRAND` | 品牌 | `catalog_registry` kind=brand |
| `TALK` | 分类（=货架 interview/variety/radio）→ 节目 | 分类 + `catalog_registry` kind=program |
| `LIVE` | 平台 | `LIVE_PLATFORM_CODES` |

事件已有编号时第三段**不再重算**，直接取 `subjectFromProjectId(catalog_id)`——同一个活动不允许出现两种写法。

### 13.3 编码词表 `lmsy_archive.catalog_registry`

品牌、节目、刊物、主题原来散落在对话和代码里，加一个就要改代码。现在是一张表，后台可直接新增：

| 列 | 说明 |
|---|---|
| `kind` | `brand` / `program` / `publication` / `topic` |
| `scope` | `program` 专属货架（interview / variety / radio），其余留空 |
| `code` | `^[A-Z0-9]{2,24}$`，`(kind, scope, code)` 唯一 |
| `name` | 显示名；新增时由它派生 code |

新增入口只有一个：向导里下拉底部的「＋ 新增」行。填的是名字，存的是派生出的 code，
下一批直接可选——**同一个品牌不会被第二个人拼成第二种码**。
接口 `GET/POST /api/admin/catalog-registry`，新增走 `codeFromTitle(name, 24)`，非法 code 不落库。

### 13.4 三个被修掉的死角

| 问题 | 现在 |
|---|---|
| `FEAT` 门在向导里根本不存在 | 认 `project_kind === 'theme'`，不靠类目字符串；`promote.ts` 的 `doorCodeForProject()` 同一逻辑，主题图不会再落到 `EARLY` |
| 事件缺 `event_date` 时向导走到死路 | 主体框下方就地补日期（`PATCH /api/admin/projects/{id}`），不必退回事件页丢失已选批次；`FEAT` 不需要日期（4.9） |
| 「快速新建事件」绕过 API、前缀表还是旧的 | 改走 `POST /api/admin/projects`（白名单 + slug + 失效缓存），分类表按门重写，无日期直接拦下 |

### 13.5 刻意不做的事

- 无门的两个旧类目（`behind_the_scenes` / `early_archive`）从向导里删了，**旧数据不动**：门不存在，
  从向导放进去的批次没有任何页面会读到。
- 图片分类保留手填。它不参与命名，加限制只会挡住新出现的分类。
- 没有宽表、没有自动推断门：门由类目或 `project_kind` 决定，不猜。
