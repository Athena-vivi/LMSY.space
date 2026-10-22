# 项目名称（title）命名规范

2026-10-22 起定。**此前 title 从来没有规范**——`20261019-lmsy-magazine-list.md` §五 只有一段「命名建议」，
从未定案，所以 16 本杂志的标题一直是各时期随手写的，格式不齐。

本文档是 title 的唯一权威。与 `20261021-asset-naming.md` 分工：那份管**文件名与编码**，这份管**人看的标题**。

---

## 一、一条规则

```
<刊物名>[ 期号] · <主题>[(人物)]
```

- ` · `（空格 中点 空格）是唯一分隔符，固定不变。
- 方括号里的段**没有就整段省略**，不留空、不写占位（与文件名规范一致）。
- 刊物名用官方原名，原样保留大小写和标点：`BEAT'XL`、`U!`、`THE R`、`ISLAND JOY`。
- 期号紧跟在刊物名后，中间一个空格。**刊物不按期号发行就不写**（PERLA、UNIQUE、RETRO、OAT、BEAT'XL、THE R 都没有）。
- 主题用官方发布的原文，**不翻译**。PERLA 官方是中文就写中文，其余是英文就写英文。
- **官方没有主题时，主题位改填刊期**（`2025 年 2 月号`）。这是唯一允许非主题内容占主题位的情况。
- 人物只在**单人刊**写，放最后，圆括号，用英文名：`(Lookmhee)` / `(Sonya)`。

### 为什么人物要放最后而不是主题位

`OAT · Lookmhee` 是老写法，主题位放的是人名 —— 读起来像"OAT 刊的主题是 Lookmhee"。
人物是「谁」，主题是「拍什么」，两件事，位置不能换。

---

## 二、16 本杂志现状对照

页面顺序 = `/editorial` 从上到下（`release_date` 倒序）。

| # | `catalog_id` | 现在的 title | 按规范应为 | 判定 |
|---|---|---|---|---|
| 1 | `LMSY-MAG-KAZZ217-YOUTHCHOICE-SY` | KAZZ 217 · Youth Choice (Sonya) | 同左 | ✅ |
| 2 | `LMSY-MAG-KAZZ217-YOUTHCHOICE-LM` | KAZZ 217 · Youth Choice (Lookmhee) | 同左 | ✅ |
| 3 | `LMSY-MAG-PERLA-ROMANTICPOEM-SY` | PERLA · 浪漫之诗 (Sonya) | 同左 | ✅ |
| **4** | `LMSY-MAG-PERLA-MODERNSHOW-LM` | **PERLA · 摩登秀场 (Lookmhee)** | 同左 | ✅（格式合规，中文是官方原文） |
| 5 | `LMSY-MAG-KAZZ211-HARMONYSECRET` | KAZZ 211 · Harmony Secret | 同左 | ✅ |
| 6 | `LMSY-MAG-THER-HEARTBEATFORYOU` | THE R · Heartbeat for You | 同左 | ✅ |
| 7 | `LMSY-MAG-GAZE-THEDREAMUNFOLDS` | GAZE · The Dream Unfolds | 同左 | ✅ |
| 8 | `LMSY-MAG-ISLAND-ALLOFMYLIFE` | ISLAND JOY · All of my Life | 同左 | ✅ |
| 9 | `LMSY-MAG-RETRO-SOULMATE` | RETRO · Soulmate | 同左 | ✅ |
| 10 | `LMSY-MAG-OAT` | OAT · Lookmhee | **OAT (Lookmhee)** | 🔧 人名占了主题位 |
| 11 | `LMSY-MAG-UMAG-BRILLIANTMATCH` | U! · Brilliant Match | 同左 | ✅ |
| 12 | `LMSY-MAG-UNIQUE-AMORFATI` | UNIQUE · Amor Fati | 同左 | ✅ |
| 13 | `LMSY-MAG-STARRY21-DEEPINTHEEYE` | STARRY 21 · Deep in the Eye | 同左 | ✅ |
| 14 | `LMSY-MAG-BEATXL-SMOLDERING` | BEAT'XL · Smoldering Embrace | 同左 | ✅ |
| 15 | `LMSY-MAG-KAZZ2502` | KAZZ 2025-02 | **KAZZ 206 · 2025 年 2 月号** | 🔧 无格式、期号已查明是 206 |
| 16 | `LMSY-MAG-KAZZ2410` | KAZZ 2024-10 | **KAZZ · 2024 年 10 月号** | 🔧 无格式、期号未查明 |

**13 本已合规，3 本要改。**

---

## 三、编码与标题同源

同一本刊在三处出现，三处必须能互相对上：

| 层 | 例（KAZZ 217 Sonya） | 规则 |
|---|---|---|
| 事件标题（人看） | `KAZZ 217 · Youth Choice (Sonya)` | 本文档 |
| 事件编码（库） | `LMSY-MAG-KAZZ217-YOUTHCHOICE-SY` | `整机-20261021-asset-naming §6` |
| 图片文件名（R2） | `SY-MAG-KAZZ217-YOUTHCHOICE-20260731-001.webp` | `整机-20261021-asset-naming §1` |

**转换关系**：标题里的「刊物名+期号」压成连写（`KAZZ 217` → `KAZZ217`）、「主题」压成连写（`Youth Choice` → `YOUTHCHOICE`）固定在编码里；
`(Sonya)` 在编码里是 `-SY`，在文件名里换成首段 `SY-`。

所以**标题看着不齐，编码就一定不齐**，反之亦然。当前编码不齐的正是同样那 3 本：
`LMSY-MAG-OAT`、`LMSY-MAG-KAZZ2502`、`LMSY-MAG-KAZZ2410` —— 只有 3 段（缺主题段），
其余 13 本都是 4 段。这就是「这个是那样、那个是那样」的全部原因。

---

## 四、`title_i18n` 会盖掉 `title`

页面取标题走 `getLocalizedText(title_i18n, language, title)`，逻辑是
`title_i18n[当前语言] || title_i18n.en || title` —— **只要 `title_i18n` 不是 null，`title` 就永远轮不到显示。**

`LMSY-MAG-PERLA-MODERNSHOW-LM` 就是踩了这个坑：它是 16 本里唯一填过 `title_i18n` 的，值是
`{"en":"perla杂志","th":"","zh":""}`。三种语言全都回退到 `en`，于是页面上第 4 张卡的标题一直是
**`perla杂志`**，`title` 里写好的 `PERLA · 摩登秀场 (Lookmhee)` 一次都没露过面。

2026-10-22 已把这条置为 `null`，与其余 15 本一致。

**规则**：杂志标题不填 `title_i18n`。标题里已经带官方原文（PERLA 中文、其余英文），三种语言共用一条即可。
真要做多语言，必须三语齐全，不能只填 `en`——否则就是「英文位置放中文、且不带任何格式」。

---

## 五、执行记录（2026-10-22）

| 项 | 改动 |
|---|---|
| `LMSY-MAG-OAT` | `OAT · Lookmhee` → `OAT (Lookmhee)` |
| `LMSY-MAG-KAZZ2502` | `KAZZ 2025-02` → `KAZZ 206 · 2025 年 2 月号` |
| `LMSY-MAG-KAZZ2410` | `KAZZ 2024-10` → `KAZZ · 2024 年 10 月号` |
| `LMSY-MAG-PERLA-MODERNSHOW-LM` | `title_i18n` 由 `{"en":"perla杂志",...}` 置 `null` |
| 这 3 本共 33 张图的 `caption` | 按新标题重排为 `<标题> p.NNN`（原先同一本里 `p.001` 和 `- Page 002` 两种写法混用） |
| 快照 | `snap_titles_projects_20261022`、`snap_titles_assets_20261022` |
| 其余 12 本 | 未动，已符合本文档第一节格式 |

---

## 六、待定

| # | 项 | 说明 |
|---|---|---|
| 1 | `KAZZ 2410` 的期号 | 公开渠道查不到这一期的刊头期号，查到后 `KAZZ · 2024 年 10 月号` → `KAZZ <期号> · 2024 年 10 月号` |
| 2 | 主题语言 | 现按官方原文，PERLA 两条是中文、其余英文。若要求全站统一（全中文 或 全英文），需整体重写 16 条 |
| 3 | KAZZ 期号写法 | 编码里有两套：`KAZZ211` / `KAZZ217` 用期号，`KAZZ2410` / `KAZZ2502` 用年月。`2502` 已知是 **206** 期，要不要一并改 `KAZZ206`，需定 |

---

## 七、编码不齐的真实来源

`projects.catalog_id` 现在 13 条 4 段、3 条 3 段，看着不齐：

```
LMSY-MAG-KAZZ217-YOUTHCHOICE-SY   4 段
LMSY-MAG-OAT                      3 段  <- 无主题段
LMSY-MAG-KAZZ2410                 3 段  <- 无主题段
```

按 `20261021-asset-naming.md`「缺的段整段省略」，3 段本身是合规的——它们确实没有官方主题名。
不齐来自**内容确实缺**，不是格式错。补齐只有两条路：
(1) 查到这些期的官方主题名，补主题段；(2) 改规则，允许主题位填刊期（如 `-2024OCT`）。

两条都要先改规范再改数据，未定。
