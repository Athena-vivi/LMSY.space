# 杂志门 17 本 · 命名核对与修补规划（2026-10-22）

依据：`docs/architecture/20261021-asset-naming.md`（唯一规范）+ `lib/catalog-id.ts`（已统一的代码实现）。

核对口径：
- 图片文件名 = `<人物>-<门>-<主体>[-<主题>]-<YYYYMMDD>-<NNN>`
- 事件编号 `projects.catalog_id` = `<门>-<主体>[-<主题>]`（不含人物、不含日期、不含序号）
- 刊物码见规范 §4.2：`BEATXL / STARRY21 / UNIQUE / RETRO / OAT / UMAG / ISLAND / GAZE / KAZZ211 / KAZZ217 / KAZZ2410 / KAZZ2502 / THER / PERLA / FIVEME`

---

## 一、总账

| 项 | 结果 |
|---|---|
| 杂志项目 | **17 本**，图 **305 张** |
| 图片文件缺失 | **0**（305 张在 R2 全部存在） |
| 日期与发售日不一致 | **0**（每本图片日期段都等于 `projects.release_date`） |
| 序号断号 | **0**（每本都是 001 连续到 N） |
| 命名完全合规 | **7 本 / 162 张** |
| 需要改名 | **8 本 / 104 张**（其中 67 张要动 R2，37 张只需改项目编号） |
| 待定 | **2 本 / 39 张** |
| 封面指针断掉 | **2 本** |

---

## 二、需要改名的 8 本（2026-10-22 已完成，下表「改成」列按最终口径 `LMSY-` 前缀）

| # | 标题 | 日期 | 张数 | 项目编号 现在 → 改成 | 图片命名 现在 → 改成 | 动 R2？ |
|---|---|---|---|---|---|---|
| 1 | KAZZ 217 · Youth Choice (Lookmhee) | 2026-07-31 | 8 | `LMSY-MAG-KAZZ-217-LM` → `LMSY-MAG-KAZZ217-YOUTHCHOICE-LM` | `LM-MAG-KAZZ-217-…` → `LM-MAG-KAZZ217-YOUTHCHOICE-…` | ✅ 8 |
| 2 | KAZZ 217 · Youth Choice (Sonya) | 2026-07-31 | 8 | `LMSY-MAG-KAZZ-217-SY` → `LMSY-MAG-KAZZ217-YOUTHCHOICE-SY` | `SY-MAG-KAZZ-217-…` → `SY-MAG-KAZZ217-YOUTHCHOICE-…` | ✅ 8 |
| 3 | PERLA · 摩登秀场 (Lookmhee) | 2025-09-14 | 13 | `MAG-PERLA-DREAM-LM` → `LMSY-MAG-PERLA-MODERNSHOW-LM` ✅ | 已合规 | ❌ |
| 4 | PERLA · 浪漫之诗 (Sonya) | 2025-09-14 | 13 | `LMSY-MAG-PERLA-2509-SY` → `LMSY-MAG-PERLA-ROMANTICPOEM-SY` ✅ | `SY-MAG-PERLA-DREAM-…` → `SY-MAG-PERLA-ROMANTICPOEM-…` ✅ 13 | ✅ 13 |
| 5 | KAZZ 211 · Harmony Secret | 2025-08-28 | 28 | `LMSY-MAG-KAZZ-211` → `LMSY-MAG-KAZZ211-HARMONYSECRET` | `LMSY-MAG-KAZZ-211-…` → `LMSY-MAG-KAZZ211-HARMONYSECRET-…` | ✅ 28 |
| 6 | THE R · Heartbeat for You | 2025-08-01 | 24 | `LMSY-MAG-THER-2508` → `LMSY-MAG-THER-HEARTBEATFORYOU` | 已合规 | ❌ |
| 7 | KAZZ 2025-02 | 2025-02-01 | 8 | `LMSY-MAG-KAZZ-2502` → `LMSY-MAG-KAZZ2502` | `LMSY-MAG-KAZZ-2502-…` → `LMSY-MAG-KAZZ2502-…` | ✅ 8 |
| 8 | KAZZ 2024-10 | 2024-10-01 | 2 | `LMSY-MAG-KAZZ-2410` → `LMSY-MAG-KAZZ2410` | `LMSY-MAG-KAZZ-2410-…` → `LMSY-MAG-KAZZ2410-…` | ✅ 2 |

**错的模式只有两种**，不是 8 种：
1. 刊物码带连字符 `KAZZ-217`、`KAZZ-211`、`KAZZ-2502`、`KAZZ-2410`（规范是 `KAZZ217` 连写）
2. 主题段缺失或写错：`KAZZ 217` 缺 `YOUTHCHOICE`、`KAZZ 211` 缺 `HARMONYSECRET`、`THE R` 用 `2508` 这种年月占位、`PERLA` 用旧名 `DREAM`

> 原第 1 条「项目编号多带了 `LMSY-` 前缀」已于 2026-10-22 作废：用户明确事件编号必须带 `LMSY-`，8 本不带前缀的反而要补上。

---

## 三、合规的 7 本（不动）

| 标题 | 日期 | 张数 |
|---|---|---|
| GAZE · The Dream Unfolds | 2025-01-17 | 37 |
| ISLAND JOY · All of my Life | 2025-01-01 | 21 |
| RETRO · Soulmate | 2024-12-18 | 21 |
| OAT · Lookmhee | 2024-12-11 | 23 |
| UNIQUE · Amor Fati | 2024-11-25 | 21 |
| STARRY 21 · Deep in the Eye | 2024-11-04 | 18 |
| BEAT'XL · Smoldering Embrace | 2024-10-23 | 21 |

---

## 四、待定 2 本

| 标题 | 张数 | 问题 |
|---|---|---|
| 20241217【天津Fan sign PB】 | 38 | ① 标题是「日期+中文方括号」，不符合全站标题写法；② `TIANJINPB` 不在规范刊物码表里（这是粉丝签售写真书，不是杂志刊号） |
| U! · Brilliant Match | **1** | 编号合规（`MAG-UMAG-BRILLIANTMATCH`），但**只有 1 张**。规范文档记过「官方 3 封面」 |

---

## 五、图片不全 —— 只有 3 本需要补

序号连续、文件不缺，所以「不全」= 本来收录得少，不是断档。

| 标题 | 现有 | 判断 | 怎么弄 |
|---|---|---|---|
| **U! · Brilliant Match** | 1 | 明显不足，一本刊不可能 1 张；规范里提过官方 3 封面 | 去官方渠道找该期全部内页/封面，补齐后按 `LMSY-MAG-UMAG-BRILLIANTMATCH-20241203-002…` 续号 |
| **KAZZ 2024-10** | 2 | 一本刊 2 张，明显不足 | 同上。同时要确认「2024-10-01」是不是真实发售日（月初第一天高度像占位） |
| **KAZZ 2025-02** | 8 | 8 张对 KAZZ 这种大刊偏少，但可能是只收了双人正片 | 先核实官方发了多少张，再决定补不补 |

其余 14 本在 8–38 张之间，不需要补。

**补图流程（沿用已有脚本）**：`scripts/ingest-magazine-issue.ts`（`npm run ingest:magazine <spec.json>`），
`start_index` 填现有最大序号 + 1，来源必须是官方渠道。

---

## 六、封面指针断了 2 本（这个最影响观感，建议先修）

| 标题 | `cover_url` 现在指向 | 状态 | 应指向 |
|---|---|---|---|
| PERLA · 浪漫之诗 (Sonya) | `homepage_cover_url` → `…/SY-MAG-PERLA-DREAM-20250910-001.webp`（`cover_url` 本身指 008，是好的） | 文件不存在（旧日期+旧主题） | ✅ 已修为 `…/SY-MAG-PERLA-ROMANTICPOEM-20250914-001.webp` |
| KAZZ 211 · Harmony Secret | `…/LMSY-MAG-KAZZ-211-20251001-001.webp` | 文件不存在（旧日期 20251001） | `…/LMSY-MAG-KAZZ211-HARMONYSECRET-20250828-001.webp` |

这两本的门页卡片和首页入口现在很可能显示不出图（或显示裂图）。

---

## 七、R2 里的垃圾

| 目录 | 数量 | 性质 |
|---|---|---|
| `lmsy/mag/2026/` `SY-MAG-KAZZ-217-20260701-*` | **8** | **真孤儿**：旧日期 20260701、DB 无记录，可直接删 |
| `magazines/2024/` | 143 | 改造前的旧命名副本，DB 已不引用 |
| `magazines/2025/` | 78 | 同上 |

后两项按规范 §八「旧键保留，线上确认一周后再删」，现在不动。

---

## 八、执行顺序（每步独立，可单独停）

| 步 | 动作 | 量 | 风险 | 前置 |
|---|---|---|---|---|
| **P0** | 修 2 个封面指针 | 2 行 DB | 无 | 无 |
| **P1** | 改 8 条 `projects.catalog_id` | 8 行 DB | 无（只影响卡片 `#` 号） | 无 |
| **P2** | 删 `lmsy/mag/2026/` 8 个孤儿 | 8 个 R2 对象 | 低 | 无 |
| **P3** | 改 67 张图片名（R2 + DB + 尺寸表 + 封面指针） | 67 | 中。每本单独做、逐本校验 HEAD 200，旧键删前先验证 | P1 |
| **P4** | 补 3 本的图 | 视官方 | 中 | 需要你给来源 |
| **P5** | 天津 PB 定名 | 1 本 | 低 | 需你定刊物码 |
| **P6** | 清 `magazines/*` 221 个旧副本 | 221 | 高，最后做 | P3 全绿后一周 |

P0 + P1 + P2 是纯数据修正，零风险，可以立刻做。

---

## 九、要你定 3 件事

1. ~~**PERLA 两本主题码**~~ ✅ 已定并已执行：Sonya `ROMANTICPOEM`、Lookmhee `MODERNSHOW`。
2. **天津 PB**：它是「2024-12-17 天津 fan sign 写真书」，不是杂志刊号。刊物码用 `TIANJINPB`（保持），还是归到别的门？
3. **KAZZ 2024-10 的发售日**：现在 `2024-10-01` 是月首占位，要查真实开卖日吗？

---

## 十、执行记录（2026-10-22）

### PERLA 两本（第 3、4 行）✅ 完成

| 项 | Sonya · 浪漫之诗 | Lookmhee · 摩登秀场 |
|---|---|---|
| 图片命名 | `SY-MAG-PERLA-DREAM-20250914-001..013` → `SY-MAG-PERLA-ROMANTICPOEM-20250914-001..013` | 本来已是 `LM-MAG-PERLA-MODERNSHOW-20250914-001..013`，不动 |
| R2 对象 | 13 个复制到新键、逐条比对字节（全部一致）后删旧键 | 不动 |
| `projects.catalog_id` | `LMSY-MAG-PERLA-2509-SY` → `LMSY-MAG-PERLA-ROMANTICPOEM-SY` | `MAG-PERLA-DREAM-LM` → `LMSY-MAG-PERLA-MODERNSHOW-LM` |
| `homepage_cover_url` | 原指 `…-20250910-001`（404），已修为 `…-20250914-001` | 本来就是 `null` |
| `cover_url` | 本来就指 008（未动） | 本来就指 001（未动） |
| 尺寸表 | 13 个键改名，473 条不变 | 不动 |

快照：`snap_perla_rename_assets_20261022`（26 行）、`snap_perla_rename_projects_20261022`（2 行）。

核验：13 个新键 `cdn.lmsy.space` HEAD 全 200、字节与 R2 一致；两个详情页本地渲染各 13 张新键、`PERLA-DREAM` 0 条；
全库扫 `gallery_assets` / `projects` / `site_content_blocks` / `gallery` / `draft_items` 均 0 残留。

### 口径冲突（2026-10-22 已裁决）

本文档 §二「错的模式」第 1 条原写「项目编号多带了 `LMSY-` 前缀」，要改成 `MAG-…`。
**用户 2026-10-22 明确：网站以 LMSY 为核心，事件编号必须带 `LMSY-`。** 上面这条作废，规范 §6 已同步改写。

### KAZZ 五本 + 其余 8 本前缀统一（2026-10-22 完成）

16 本杂志的 `projects.catalog_id` 现已全部以 `LMSY-` 开头，54 张 KAZZ 图片同步改名。

| 本 | 图片（旧 → 新） | 事件编号 |
|---|---|---|
| KAZZ 2024-10 | `LMSY-MAG-KAZZ-2410-*` → `LMSY-MAG-KAZZ2410-20241001-*`（2 张） | `LMSY-MAG-KAZZ-2410` → `LMSY-MAG-KAZZ2410` |
| KAZZ 2025-02 | `LMSY-MAG-KAZZ-2502-*` → `LMSY-MAG-KAZZ2502-20250201-*`（8 张） | `LMSY-MAG-KAZZ-2502` → `LMSY-MAG-KAZZ2502` |
| KAZZ 211 | `LMSY-MAG-KAZZ-211-*` → `LMSY-MAG-KAZZ211-HARMONYSECRET-20250828-*`（28 张） | `LMSY-MAG-KAZZ-211` → `LMSY-MAG-KAZZ211-HARMONYSECRET` |
| KAZZ 217 (LM) | `lmsy/mag/2026/LM-MAG-KAZZ-217-*` → `lm/mag/2026/LM-MAG-KAZZ217-YOUTHCHOICE-*`（8 张） | `LMSY-MAG-KAZZ-217-LM` → `LMSY-MAG-KAZZ217-YOUTHCHOICE-LM` |
| KAZZ 217 (SY) | `lmsy/mag/2026/SY-MAG-KAZZ-217-*` → `sy/mag/2026/SY-MAG-KAZZ217-YOUTHCHOICE-*`（8 张） | `LMSY-MAG-KAZZ-217-SY` → `LMSY-MAG-KAZZ217-YOUTHCHOICE-SY` |

另外 8 本只补前缀，图片名不动（本来就有正确的人物码）：`MAG-BEATXL-SMOLDERING`、`MAG-STARRY21-DEEPINTHEEYE`、
`MAG-UNIQUE-AMORFATI`、`MAG-UMAG-BRILLIANTMATCH`、`MAG-OAT`、`MAG-RETRO-SOULMATE`、
`MAG-ISLAND-ALLOFMYLIFE`、`MAG-GAZE-THEDREAMUNFOLDS`。

KAZZ 217 的 16 张顺带从共用目录 `lmsy/mag/2026/` 挪到 `lm/mag/2026/`、`sy/mag/2026/`，规范 §七 的目录错配在这 16 张上已消除。

**KAZZ 211 首页封面**：原指 `…-20251001-001`（发货月日期段，实测 404），改为 `…-20250828-001`。
**KAZZ 211 `event_date`**：2025-08-11（拍摄日）→ 2025-08-28（开卖日），与 `release_date`、图片日期段对齐。

快照：`snap_kazz_naming_projects_20261022`（16 行）、`snap_kazz_naming_assets_20261022`（54 行）。
核验：54 个新键 HEAD 全 200、字节与 R2 一致；5 个 KAZZ 详情页本地渲染 2/8/28/8/8 张、旧形态 0 条；
全库 `catalog_id` / `image_url` / 封面指针 `KAZZ-` 旧形态 0 条；`verify_naming` 剩 55 条不合法全是商业门 `LMSY-AD-*`。
