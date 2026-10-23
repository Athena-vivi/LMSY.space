# 命名规范统一（2026-10-22）

> **2026-10-23 更新**：首段已从「人物码」改为站点码 `LMSY`，单人的 `-LM` / `-SY` 移到事件编号末尾。
> 本文下面的对照表是当时的状态记录，现行规则以 `20261021-asset-naming.md` 为准（其第一、二、六、七、十一节已同步）。

起因：同一件事存在**三套规则**，分别是「文档写的」「代码跑的」「数据里实际存的」。
三者互不相认，所以每次改一处就会在另一处冒出问题。

---

## 零、执行状态（2026-10-22）

**第一步「统一规则」已完成——代码现在只认 `20261021-asset-naming.md` 这一套。**

| 步 | 内容 | 状态 |
|---|---|---|
| **1. 统一规则（改代码）** | `lib/catalog-id.ts` 重写为规范 A 格式；4 处路由正则；门码表；R2 目录；删 `-000` | ✅ 完成 |
| 2-7. 按规则改数据 | 135 张图改名、8 条事件编号、清旧目录 | 🔄 进行中：PERLA 两本（26 张 + 2 条事件编号）✅、KAZZ 五本（54 张 + 5 条事件编号）✅；剩 `LMSY-AD-*` 54 张、`LIVE`/`APPEAR` 4 张、清旧目录 |

统一后实测（`temp/verify_naming.ts` 拿库里全部 395 个真实 ID 跑）：
`total 395  valid 340  invalid 55` —— 55 个被新规则拒绝的，就是后面要按规则改的清单（`LMSY-AD-*` 54、`LIVE-20260808` 1）。

**以后任何新增图片，后台生成的 ID 一定符合规范**；旧的违规 ID 在后面改图时按同一规则改名即可，不会再出现第三套写法。

---

## 一、三套规则对照

| 来源 | 格式 | 封面号段 | R2 目录 |
|---|---|---|---|
| **A. 规范文档** `docs/architecture/20261021-asset-naming.md`（10-21 定稿，唯一权威） | `<人物>-<门>-<主体>[-<主题>]-<日期>-<序号>` | 无 `-000`，序号从 `001` 起，封面是指针 | `<person>/<door>/<年>/` |
| **B. 代码实际跑的** `lib/catalog-id.ts` + 各 upload 路由 | `LMSY-<分类>-<8位日期>-<3位序号>` | 封面固定 `-000` | `magazines/<年>/` |
| **C. 数据里实际存的** `gallery_assets`（398 行 / 26 种形态） | 大部分按 A，少数按 B，还有几种两者都不是 | 混用 | 新旧目录并存 |

**致命冲突**：代码里的校验正则是 `^LMSY-[A-Z]+-\d{8}-\d{3}$`（B 格式）。
用它去验 A 格式的命名，**全部 FAIL**：

```
FAIL  LMSY-MAG-THER-HEARTBEATFORYOU-20250801-001
FAIL  LMSY-MAG-BEATXL-SMOLDERING-20241023-001
FAIL  LM-MAG-OAT-20241211-001
FAIL  SY-MAG-KAZZ-217-20260731-001
FAIL  LMSY-APPEAR-AIRPORT-20260320-001
...（26 种形态里合规的那些也全部 FAIL）
```

后果：
- 后台上传时**手填** A 格式命名 → `getR2PathForCatalogId()` 抛 `Invalid catalog ID`，上传直接失败。
- 后台上传**自动生成** → 产出 B 格式（`LMSY-MAG-20250801-001`），写进 `magazines/2025/`，
  而站上真正读的是 `lmsy/mag/2025/`。新上传的图会落到没人读的目录。
- `/api/admin/r2/sign` 直接返回 400 `Invalid catalog ID format`。

---

## 二、代码里的违规点（9 处）

| # | 位置 | 现在做什么 | 应改成 |
|---|---|---|---|
| 1 | `lib/catalog-id.ts` 全文 | 格式 `LMSY-[CAT]-[YYYYMMDD]-[XXX]`；`parseCatalogId` / `isValidCatalogId` / `generateCatalogId` 全是 B 格式 | 改为 A 格式解析/校验 |
| 2 | `lib/catalog-id.ts:13,100,163-178` | 「Cover image is always sequence 000」+ `generateMagazineCoverCatalogId` | 删掉。封面是指针（`projects.cover_url`），不占号段 |
| 3 | `lib/catalog-id.ts:325` `CATEGORY_TO_CATALOG_PREFIX` | `series:STILL / editorial:MAG / appearance:STAGE / daily:DAILY / travel:TRV / commercial:AD` | 换成规范门码：`DRAMA / MAG / EVENT / APPEAR / BRAND / TALK / LIVE / BTS / EARLY` |
| 4 | `lib/catalog-id.ts:249-257` `getR2PathForCatalogId` | `magazines/${year}/${catalogId}.webp` | `<person>/<door>/<year>/<catalogId>.webp` |
| 5 | `app/api/admin/upload/route.ts:89` | 手填命名用 B 正则校验 | A 正则 |
| 6 | `app/api/admin/upload/route.ts:160` | `getR2PathForCatalogId(catalogId)` → 对新命名 throw | 同上 #4 |
| 7 | `app/api/admin/r2/sign/route.ts:111,120` | B 正则 + `magazines/${year}/`，不匹配直接 400 | A 正则 + 新目录 |
| 8 | `app/api/admin/upload/fallback/route.ts:56,80` | B 正则 + `magazines/${year}/` | 同上 |
| 9 | `app/api/admin/upload/register/route.ts:119` | B 正则 `^LMSY-[A-Z]+-(\d{4})(\d{4})-(\d{3})$` | A 正则 |

附带（非阻塞，但同属一套旧逻辑）：
- `app/admin/upload/_hooks/use-ingestion.ts:219-238` 前端预览号也是 `` LMSY-${prefix}-${compactDate}-${seq} ``
- `app/api/admin/drafts/[id]/to-gallery/route.ts:161` 走 `allocateNextCatalogId()` → B 格式
- `scripts/sync-r2-db.ts:117,131` `LMSY-G-`→`LMSY-MAG-` 硬编码 + `magazines/${year}/`

---

## 三、数据里的违规点

### 3.1 `gallery_assets.catalog_id`（398 行，26 种形态）

合规 263 张 / **违规 135 张** / 待定 3 张。

| 张数 | 现在的形态 | 问题 | 应改成 |
|---|---|---|---|
| 28 | `LMSY-MAG-**KAZZ-211**-20250828-NNN` | 刊物码带连字符，且缺主题段 | ✅ `LMSY-MAG-KAZZ211-HARMONYSECRET-20250828-NNN` |
| 8 | `SY-MAG-**KAZZ-217**-20260731-NNN` | 同上，且在共用目录 `lmsy/mag/2026/` | ✅ `sy/mag/2026/SY-MAG-KAZZ217-YOUTHCHOICE-20260731-NNN` |
| 8 | `LM-MAG-**KAZZ-217**-20260731-NNN` | 同上，且在共用目录 `lmsy/mag/2026/` | ✅ `lm/mag/2026/LM-MAG-KAZZ217-YOUTHCHOICE-20260731-NNN` |
| 8 | `LMSY-MAG-**KAZZ-2502**-20250201-NNN` | 同上 | ✅ `LMSY-MAG-KAZZ2502-20250201-NNN` |
| 2 | `LMSY-MAG-**KAZZ-2410**-20241001-NNN` | 同上 | ✅ `LMSY-MAG-KAZZ2410-20241001-NNN` |
| 24 | `LMSY-**AD**-20251123-NNN` | 门码 `AD` 应为 `BRAND`；缺品牌码 | `LMSY-BRAND-<品牌>-20251123-NNN`（品牌名待定） |
| 12 | `LMSY-**AD**-20250926-NNN` | 同上 | 同上 |
| 10 | `LMSY-**AD**-20240214-NNN` | 同上 | 同上 |
| 8 | `LMSY-**AD**-20251017-NNN` | 同上 | 同上 |
| 13 | `SY-MAG-PERLA-**DREAM**-20250914-NNN` | `DREAM` 是建库时随手起的，官方是「浪漫之诗」 | ✅ 已改 `SY-MAG-PERLA-ROMANTICPOEM-20250914-NNN` |
| 13 | `LM-MAG-PERLA-**MODERNSHOW**-20250914-NNN` | `MODERNSHOW` 当时不在规范主题表 | ✅ 已合规，规范主题表已补 `MODERNSHOW` |
| 1 | `**LIVE**-20260808-NNN` | 缺人物段（规范：首两段永远存在） | `LMSY-LIVE-20260808-001` |
| 3 | `LMSY-APPEAR-**AIRPORT**-20260320-NNN` | `AIRPORT` 不在规范 §4.4 子类表 | 待定：补进子类表 or 换码 |

合规的 13 种（263 张，不动）：
`MAG-TIANJINPB`、`MAG-GAZE-THEDREAMUNFOLDS`、`MAG-THER-HEARTBEATFORYOU`、`LM-MAG-OAT`、
`MAG-UNIQUE-AMORFATI`、`MAG-RETRO-SOULMATE`、`MAG-BEATXL-SMOLDERING`、`MAG-ISLAND-ALLOFMYLIFE`、
`MAG-STARRY21-DEEPINTHEEYE`、`DRAMA-AFFAIR-STILL`、`APPEAR-BRANDSTAGE-SIRIVANNAVARI`、
`EARLY-MILESTONES`、`MAG-UMAG-BRILLIANTMATCH`

### 3.2 `projects.catalog_id`（22 行）

规范：`LMSY-<门>-<主体>[-<主题>]`，**不含人物、不含日期、不含序号**；`LMSY-` 前缀必须带（用户 2026-10-22 定）。
**违规 8 个**：其中 6 个除了缺前缀还有别的错，2 个（PERLA）只缺前缀。

| 现在 | 应改成 | 状态 |
|---|---|---|
| `LMSY-MAG-KAZZ-211` | `LMSY-MAG-KAZZ211-HARMONYSECRET` | ✅ |
| `LMSY-MAG-KAZZ-217-LM` | `LMSY-MAG-KAZZ217-YOUTHCHOICE-LM` | ✅ |
| `LMSY-MAG-KAZZ-217-SY` | `LMSY-MAG-KAZZ217-YOUTHCHOICE-SY` | ✅ |
| `LMSY-MAG-KAZZ-2410` | `LMSY-MAG-KAZZ2410` | ✅ |
| `LMSY-MAG-KAZZ-2502` | `LMSY-MAG-KAZZ2502` | ✅ |
| `LMSY-MAG-PERLA-2509-SY` | `LMSY-MAG-PERLA-ROMANTICPOEM-SY` | ✅ |
| `LMSY-MAG-THER-2508` | `LMSY-MAG-THER-HEARTBEATFORYOU` | ✅ |
| `MAG-PERLA-DREAM-LM` | `LMSY-MAG-PERLA-MODERNSHOW-LM` | ✅ |

**另有 8 本当时「合规」的其实也缺 `LMSY-` 前缀**（规范原文写成不含前缀，按用户口径作废），2026-10-22 已一并补上：
`MAG-BEATXL-SMOLDERING`、`MAG-GAZE-THEDREAMUNFOLDS`、`MAG-ISLAND-ALLOFMYLIFE`、`MAG-OAT`、
`MAG-RETRO-SOULMATE`、`MAG-STARRY21-DEEPINTHEEYE`、`MAG-UMAG-BRILLIANTMATCH`、`MAG-UNIQUE-AMORFATI`。

仍未动的 5 个（不在杂志门，等门级编码统一时处理）：`APPEAR-AIRPORT`、`APPEAR-BRANDSTAGE-SIRIVANNAVARI`、
`DRAMA-AFFAIR-STILL`、`EARLY-MILESTONES`、`EVENT-FANMEET-SEOUL`、`MAG-TIANJINPB`。

### 3.3 R2 目录

| 目录 | 对象数 | 状态 |
|---|---|---|
| `magazines/2024` | 162 | 旧目录，规范 §八说「旧键保留未删」 |
| `magazines/2025` | 154 | 旧目录，同上 |
| `lmsy/mag/2024` `lmsy/mag/2025` `lmsy/mag/2026` | 264 | 新目录 ✅ |
| `lm/mag/2024` `lm/mag/2025` `sy/mag/2025` | 49 | 新目录 ✅ |
| `lmsy/drama` `lmsy/appear` `lmsy/early` | 38 | 新目录 ✅ |
| `draft/*` | 84 | 草稿，无表记录 |
| `events/live` `events/public` | 45 | 孤立封面文件，规范 §十说等失联后整批删 |

---

## 四、统一方案（分步，每步可单独停）

| 步 | 动作 | 涉及量 | 风险 |
|---|---|---|---|
| **1** | 改代码：`lib/catalog-id.ts` 改成 A 格式（解析/校验/目录/门码表/删 000）+ 5 处 upload 路由正则 | 6 个文件 | 低。先做这步，后台才不会再产出违规命名 |
| **2** | 改 `projects.catalog_id` 8 条 + 补另外 8 本的 `LMSY-` 前缀 | 16 行 | ✅ **完成 2026-10-22** |
| **3** | 改 `gallery_assets` 的 KAZZ 连字符（54 张）+ R2 54 个对象改名 | 54 | ✅ **完成 2026-10-22**（顺带补主题段、217 拆到 `lm/` `sy/`、修 211 首页封面 404） |
| **4** | 改 PERLA 两本主题（26 张 + 2 个事件编号） | 26+2 | ✅ **完成 2026-10-22**。Sonya 13 张改名、Lookmhee 图片本就合规，两条事件编号已改，断掉的 `homepage_cover_url` 一并修好。详见 `docs/20261022-magazine-naming-audit.md` §十 |
| **5** | 改 `LMSY-AD-*` → `LMSY-BRAND-<品牌>`（54 张） | 54 | 中。**卡在品牌名未知** |
| **6** | 补 `LIVE-20260808` 人物段（1 张）+ `APPEAR-AIRPORT` 定码（3 张） | 4 | 低 |
| **7** | 清 R2 旧目录 `magazines/*`（316 个） | 316 | 高。**必须等 1-6 全绿、线上确认无误后再做** |

每步做完都跑一次校验：新键 HEAD 200、行数不增不减、前台页面图片 0 条旧路径。

---

## 五、待拍板（我不知道答案，不猜）

| # | 项 | 我的建议 |
|---|---|---|
| 0 | ~~事件编号带不带 `LMSY-` 前缀~~ | ✅ 已定：**必须带**（网站以 LMSY 为核心）。16 本杂志已全部统一 |
| 1 | ~~PERLA 两本的主题码~~ | ✅ 已定并执行：Sonya `ROMANTICPOEM`、Lookmhee `MODERNSHOW` |
| 2 | `LMSY-AD-*` 那 4 批（20240214 / 20250926 / 20251017 / 20251123，共 54 张）的品牌名 | 需要你给。给了就补进 §4.5 品牌码表 |
| 3 | `APPEAR-AIRPORT`（3 张，机场图） | 补进 §4.4 子类表，还是归到别的子类？ |
| 4 | `LIVE-20260808` 那 1 张是谁的播 | 双人 `LMSY` / 单人 `LM` / `SY`？ |
