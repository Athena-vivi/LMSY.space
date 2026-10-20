# 七个入口的内容与配图填充总计划

> 2026-10-20 定稿。这份文档替代此前所有零散的批次表和补图轮次记录，**只以它为准**。
> 上一个版本的「先建 300 条、再统一补图」流程作废，原因写在第一节末尾。

---

## 一、三层结构：门 → 分类 → 事件

配图不是一件事，是三层各管一层。缺任何一层，前台就会出现没有图的格子。

| 层 | 是什么 | 数据落点 | 谁决定 |
|---|---|---|---|
| **L1 门** | 首页 7 个入口的封面 | `gallery_assets.portal_slot`（5 张）<br>`gallery_assets.interview_slot`（2 张） | 后台人工指定，优先于一切自动取值 |
| **L2 分类** | 进入门之后的子分区（见面会 / 品牌活动 / 生日会…） | `projects.subtype` | 由内容归属决定，封面自动取该分类第一个有封面的项目 |
| **L3 事件** | 每一场活动、每一篇访谈、每一场直播 | `projects.cover_url` | 逐条配图，没有例外 |

**L1 和 L3 是必须人工指定的；L2 是派生的**——只要 L3 每一条都有封面，L2 必然有封面。所以工作量在 L3，风险在 L1（门面图选得不对，整个门的气质就错了）。

**为什么废掉旧流程**：旧流程是横向的——先把七个门的记录全建完（约 300 条，`cover_url` 全空、`portal_visible=false`），再统一补图。后果是中间状态没法上线：任何时候打开后台，看到的都是 300 条空壳；补图补到一半，也不知道哪个门能开。现在改成**纵向的：一门一批，批完关门**，每一批结束时那个门是完整的、可以直接上线的。

---

## 二、现状诊断：三层各缺多少

### L1 门面图：7 张有 4 张

| # | 门 | 槽位 | 状态 |
|---|---|---|---|
| 1 | 影视作品 | `portal_slot='drama_work'` | 已指定 |
| 2 | 杂志特辑 | `portal_slot='editorial'` | 已指定 |
| 3 | 线下活动 | `portal_slot='live_event'` | 已指定 |
| 4 | 公开活动 | `portal_slot='public_appearance'` | **缺** |
| 5 | 商务合作 | `portal_slot='commercial'` | 已指定 |
| 6 | 对话 | `interview_slot='talk'` | **缺** |
| 7 | 直播 | `interview_slot='live'` | **缺** |

6、7 两个门现在**完全没有封面**：槽位没指定，而自动兜底要求「该 category 下有公开项目」——`interview` / `variety` / `radio` / `live_stream` 四个分类目前都是 **0 条**，兜底也无处可取值。

### L2 分类：几乎全空

| 门 | 分类 | 现有项目 |
|---|---|---|
| 线下活动 | `fanmeeting` / `brand_event` / `birthday` | 1 条（未分 subtype） |
| 公开活动 | `awards` / `fashion` / `brand_stage` / `industry` / `charity` / `premiere` | 3 条（1 条 `premiere`，2 条未分） |
| 对话 | 访谈 / 综艺 / 电台（Tab） | 0 |
| 直播 | 双人 / Lookmhee / Sonya（Tab） | 0 |
| 商务 | 按 `publisher_brand` 分组 | 0 个品牌有值 |
| 影视 / 杂志 | 无子分类（作品本身就是最小的单位） | — |

**这里有一个功能缺口要单独说**：`subtype` 目前只有 `/live` 在用，`/projects` 页面**根本不按 subtype 分组**——点进线下活动，看到的是一条条平铺的项目，不是「见面会 / 品牌活动 / 生日会」三个区。所以「入口进去有分类」这件事，现在是**不存在的**，不是「分类没图」。
`/talks` 和 `/live` 有 Tab，但 Tab 只是筛选器，Tab 头上没有图。

→ **这是展示层的结构问题，需要你定形态，我不动。** 见第八节。

### L3 事件：28 条里 1 条可见且无图

| 分类 | 项目 | 可见 | 有封面 | 可见且有封面 |
|---|---|---|---|---|
| `editorial` 杂志 | 11 | 11 | 11 | 11 |
| `commercial` 商务 | 4 | 4 | 4 | 4 |
| `public_appearance` 公开 | 3 | 2 | 3 | 2 |
| `drama_work` 影视 | 2 | 2 | 1 | **1**（1 条上线了但没图） |
| `live_event` 线下 | 1 | 1 | 1 | 1 |
| `early_archive` 早期档案 | 5 | 0 | 5 | 0 |
| `personal_travel` 个人行迹 | 2 | 0 | 2 | 0 |
| `interview` / `variety` / `radio` / `live_stream` | 0 | 0 | 0 | 0 |
| **合计** | **28** | **20** | **27** | **19** |

图片资产共 329 张，但只挂在 11 个项目上（杂志 237 + 商务 54 + 影视 18 + 公开 15 + 早期 5）。**其余 17 个项目一张图都没有。**

### 已经上线但还不合格的 5 条

这 5 条不是「缺内容」，是**早期录入时留下的小毛病**，这一轮顺手一起修：

| 条目 | 问题 | 怎么改 |
|---|---|---|
| `Harmony Secret (和谐密语)`（`drama_work`，已可见） | **唯一一条可见但没有封面的项目**，而且是重点剧集 | 补 `cover_url`，剧集海报即可，最容易补的一张 |
| `Affair (爱情诡计)宣传图片`（`drama_work`） | 标题是**素材名**，不是作品名；宣传图不该单独成为一个「作品」 | 改名或合并进 `Affair` 剧集条目 |
| `20260320-airport`（`public_appearance`） | 标题是**日期加场景**，不是事件名；机场是什么活动、去哪、做什么，全不知道 | 补成「机场出发 / 抵达 + 城市」，或确认后归 `personal_travel` |
| `SIRIVANNAVARI`（`public_appearance`） | 标题只有**品牌名**，没有活动形态（站台？看秀？开业？） | 补成「SIRIVANNAVARI 品牌活动 + 地点」，并定 `subtype='brand_stage'` |
| `爱情诡计首映`（`public_appearance` / `premiere`） | 有封面但**没有日期**，所以不可见（档案站与媒体差一天，当时留空了） | 定一个日期即可开放 |

前三条是同一个病根：**早期批量入库时直接用了素材文件夹名当标题**。往后每一批都必须写「活动名 + 城市」，来源见第六节第 1 步。

---

## 三、七个门的目标与内容来源

| # | 门 | category | 现有 | 目标 | 内容来源 |
|---|---|---|---|---|---|
| 1 | 影视作品 | `drama_work` | 2 | 3 | 已知剧集，逐部建 |
| 2 | 杂志特辑 | `editorial` | 11 | 17 | `20261019-lmsy-magazine-list.md`（17 条） |
| 3 | 线下活动 | `live_event` | 1 | **53** | 见面会清单（28 双人 + 12 单人）+ 生日会 3 + 品牌活动 9 + 观影会 1 |
| 4 | 公开活动 | `public_appearance` | 3 | **47** | `20261019-lmsy-public-appearance-list.md`（46，已含首映 4）+ 档案站补的终映 1；subtype 六个 Tab 对齐清单 A–F |
| 5 | 商务合作 | `commercial` | 4 | **45** | `20261019-lmsy-commercial-list.md`（含品牌直播 31 场） |
| 6 | 对话 | `interview` + `variety` + `radio` | 0 | **97** | 访谈 63 + 综艺 21 + 电台 13 |
| 7 | 直播 | `live_stream` | 0 | **55** | `20261019-lmsy-live-stream-list.md`（双人 10 + 单人 45） |
| | | | **28** | **317** | 需新建 296 |

三号门 53 的构成摊开：

四号门 47 的构成摊开（2026-10-20 已建，Tab 与清单类型一一对应）：

| 清单类型 | subtype | 条数 | 说明 |
|---|---|---|---|
| A 颁奖典礼 / 行业奖项 | `awards` | 15 | Japan Expo Thailand 在此（获 JAPAN EXPO RELATIONSHIP AWARD） |
| B 时装周 / 品牌走秀 | `fashion` | 6 | Manila Fashion Week 是本类唯一海外场 |
| C 品牌站台 / 商演 / 民俗舞台 | `brand_stage` | 10 | วันสร้างสุข、SRETSIS 门店开业、Hometown × 三个民俗舞台都在此 |
| D 公司推介会 / 行业展会 | `industry` | 5 | CHANGE2561 两场、iQIYI iJOY 两场、TCM 2026 |
| E 公益 / 社群 / 书展 | `charity` | 6 | Praew 两届、Power of Thai、Thai Pride、两场书展 |
| F 剧集祭拜仪式 / 首映 | `premiere` | 5 | Affair / Harmony Secret / Hometown 三次祭拜 + 首映 + 终映 |

| 分类 | 条数 | 说明 |
|---|---|---|
| `fanmeeting` 双人 | 28 | 清单已办 27 场 + 档案站补的深圳签售 1 场；澳门 11-07、马德里 11-28 未举办不计 |
| `fanmeeting` 单人 | 12 | 清单 C 类，标题写明是谁。南宁那两对是**同城同日各一场**，不是重复行 |
| `birthday` 生日会 | 3 | Lookmhee 2026-02-14 重庆、Sonya 2026-04-18 重庆、Sonya 2026-04-26 与粉丝庆祝 |
| `brand_event` 品牌活动 | 9 | 全部来自档案站补充，见第四节 |
| 观影会 | 1 | Affair 第一集 2024-08-30（粉丝场，不是红毯）。**只有一场，不单设分类**，`subtype` 留空 |

库里已有的 1 条 `live_event` 是 `EVERAFTER: BLOOM in Sao Paulo`（无 subtype），补 `duo` 后计入双人 28 场之内。

---

## 四、遗漏场次归类（档案站多出 15 个区块，逐条判定）

上一轮只报了「15 场不在清单里」，没分类。逐条核完，**其中 2 条根本不是活动，1 条与清单重复，真正新增 12 场**：

| 日期 | 档案站标题 | 判定 | 归属 | 图 |
|---|---|---|---|---|
| 2024-11-23 | A Meet and Greet with Lookmhee by BuddyBesties | 新增 | `live_event` / `brand_event` | 8 |
| 2024-12-14 | #NewtaminsxSaranphat #NewtaminsxSonya | 新增 | `live_event` / `brand_event` | **0** |
| 2025-04-25 | "This hashtag is not exclusive to LMSY, this is for Change Line" | **误收** | 不入库 | 1 |
| 2025-04-26 | LMSY Fansign Event in Chongqing, CN | **与清单 2025-04-20 同一场** | `live_event` / `fanmeeting`（日期取清单 04-20） | 1 |
| 2025-05-10 | LMSY spends a day with the Besties | 新增 | `live_event` / `brand_event` | 3 |
| 2025-06-28 | Event for the LMSY-designed BaBi Blushing jewelries | 新增 | `live_event` / `brand_event` | 7 |
| 2025-08-09 | Special Fan event by Nola Superfoods（Lookmhee 下厨） | 新增 | `live_event` / `brand_event` | 3 |
| 2025-08-26 | Special Fan event by Buddy Besties with Top Spender | 新增 | `live_event` / `brand_event` | 2 |
| 2025-12-28 | "Alternate Hashtag: #HIKARUxLOOKMHEE" | **误收** | 不入库 | 1 |
| 2026-01-31 | FoamDream Top Spender Event, 2 days 1 night | 新增 | `live_event` / `brand_event` | **0** |
| 2026-02-21 | A Fan Event brought to you by Buddy Besties | 新增 | `live_event` / `brand_event` | 1 |
| 2026-03-15 | A Fan Event brought to you by Downy | 新增 | `live_event` / `brand_event` | **0** |
| 2026-04-26 | Sonya's birthday celebration with fans | 新增（与 04-18 不同场） | `live_event` / `birthday` | 6 |
| 2026-05-22 | Hometown Romance Final Episode Event | 新增 | `public_appearance` / `premiere` | 2 |
| 2026-06-27 | LMSY Fan Sign in Shenzhen | 新增 | `live_event` / `fanmeeting` | 4 |

**新增 12 场：品牌活动 9、双人签售 1、生日会 1、终映 1。其中 9 场有图、3 场无图。**

那 9 场品牌活动正好补上了此前「品牌活动 12 场没有明细清单」的缺口——不用再等清单，档案站已经给了逐场标题和配图。

**两条误收的判断依据**：`#ChangeLine` 是 CHANGE2561 公司的通用话题标签，谁参加公司活动都会带；`#HIKARUxLOOKMHEE` 是同一场活动的备用标签。两者都是标签，不是场次。

---

## 五、图源与取图优先级

三个源，按图质排：

| 优先 | 源 | 尺寸/比例 | 寿命 | 适用 |
|---|---|---|---|---|
| 1 | **X 官方账号** `CHANGEARTIST_` / `Lookmheewang` / `sonyarasann` | 1536–1642 × 2048，**3:4** | 永久 | 所有门，尤其 6/7 号门和品牌活动 |
| 2 | **档案站海报** `sites.google.com/view/mylmsyarchive` | 1280 宽，4:5 | **会过期**，几小时后 403 | 3/4 号门逐场对应，封面语义最准 |
| 3 | 视频封面帧 | 不等 | 永久 | 只有视频推文的场次兜底 |

两条硬约束：

1. **档案站海报 URL 有时效，已经因此全部失效过一次。** 抓取当时能下 1.4MB，几小时后再请求就是 403，加 `Referer` 也没用。2026-10-20 复查 P1 那 20 张时，**20 张全部 403**——如果当时直接把这些地址写进 `cover_url`，建库当天是好的，第二天整个线下活动门就只剩破图。
   解法已验证并执行：**回到档案站页面里用 `fetch` 取字节**，存到自己的 R2（`cdn.lmsy.space/events/live/...`）。20 张全部转存成功，现在台账里 0 个会过期的地址。
2. **推文图永久可用**，`pbs.twimg.com/media/...?name=orig` 随时可下，可以直接存 URL。

取图通道（沙箱内 curl 全部不通，必须走 PowerShell 或 Playwright）：

| 要什么 | 怎么拿 |
|---|---|
| 某场活动的原始推文链接 | 档案站每个活动区块下就挂着，**不用搜** |
| 单条推文的图/视频 | `api.fxtwitter.com/status/<id>` → `tweet.media.all[]` |
| 账号近期时间线 | `syndication.twitter.com/srv/timeline-profile/screen-name/<账号>`（每号只 100 条、只到 2025-11，无游标不能翻页） |
| 短链倒推 status id | `pic.twitter.com/<短码>` 的 noscript 页里有完整 URL |

nitter 全线已死（X Corp 2026-08 与 09 两封停止函），不要再用。

---

## 六、执行流程：一门一批，六步关门

每一批都走同样的六步。**第 5 步之前，这一批的数据一律不可见**，所以任何中途状态前台都看不到灰块。

| 步 | 做什么 | 验收 |
|---|---|---|
| 1 | **建记录**。`category` + `subtype` + `event_date` + 标题，`portal_visible=false`、`curation_status='draft'` | 条数对得上清单 |
| 2 | **配事件图**。逐条写 `cover_url`，图源按第五节优先级 | 该分类有图率 ≥ 90% |
| 3 | **核归属**。逐条确认 `subtype` 正确；单人场写 `project_people` 一条，双人场写两条 | 分类下每个 subtype 的条数与清单一致 |
| 4 | **指定门面图**（仅该门的最后一批做）。`portal_slot` / `interview_slot` 选该门最有代表性的一张 | 7 张槽位全部非空 |
| 5 | **开可见**。`update ... set portal_visible=true, curation_status='published'` | 该门条数 = 目标数 |
| 6 | **线上核验**。首页入口有图、进入后有分类、每条有封面 | 抽 3 条打开详情页确认图不 404 |

**回滚**：每批写入时打 `tags = array['batch_<门名>']`，批前建 `projects_before_<门名>` 快照表。回滚 = `delete from projects where tags @> array['batch_<门名>']` + 从快照恢复被改的行。

**两列最易漏写**：`portal_visible` 默认 `false`、`curation_status` 默认 `'draft'`，第 1 步建完必须显式写 `true` / `'published'` 才有前台。

---

## 七、批次表：七个门，七批

顺序原则：**先做图源已经验证过的门**，把「图能不能到位」的不确定性留到最后。每批可以独立上线，不依赖其他批。

| 批 | 门 | 新建 | 图源状态 | 可独立上线 |
|---|---|---|---|---|
| **P1** | 3 号 线下活动 | 52 | ✅ 已实测（本批 53 场里 4 场无图） | 是 |
| **P2** | 4 号 公开活动 | 44 | ✅ 已实测（41/46 有封面） | 是 |
| **P3** | 2 号 杂志特辑 | 6 | ✅ 图库已有 237 张，只需挂到新条目 | 是 |
| **P4** | 7 号 直播 | 55 | ⚠️ 未实测，靠 X 官方账号 + IG 存档 | 是 |
| **P5** | 6 号 对话 | 97 | ⚠️ 未实测，访谈图多为媒体配图，需逐条找 | 是 |
| **P6** | 5 号 商务 | 41 | ⚠️ 品牌物料图需逐条找 | 是 |
| **P7** | 1 号 影视作品 | 1 | ✅ 剧集海报来源明确 | 是 |
| **P0** | 修 5 条不合格条目 | 0（改） | ✅ | 是 |

**P0 先做**，因为它只改 5 条已有数据，风险最低，而且 `Harmony Secret` 无封面这件事现在就在线上。

**P1 先做的理由**：它是内容缺口最大的门（1 条 → 53 条），也是图源唯一已经逐场核过的门。做完这一门，首页 7 个入口里最空的那个就补上了，而且能立刻验证「门 → 分类 → 事件」这个三层结构在真实数据下站不站得住。

**P1 的 53 场现在都有确定的封面，只剩 7 场确实没有图**：

| 日期 | 分类 | 活动 | 为什么没图 |
|---|---|---|---|
| 2024-12-14 | `brand_event` | Newtamins Fan Event | 档案站该区块一条带图推文都没有 |
| 2026-01-16 | `fanmeeting` | 成都 · LM Heart Flutter | 档案站区块只链了视频 |
| 2026-01-31 | `brand_event` | FoamDream Top Spender · 2 天 1 夜 | 同上 |
| 2026-03-15 | `brand_event` | Downy Fan Event | 同上 |
| 2026-10-03 | `fanmeeting` | EVERAFTER: UNFOLD（胡志明） | 刚办完，图还没进档案站索引 |
| 2026-10-09 | `fanmeeting` | EVERAFTER: BLOOM（圣保罗） | 同上（库里已有 `cover_url`，需核对是不是现场图） |
| 2026-10-11 | `fanmeeting` | EVERAFTER: REMEMBER（墨西哥） | 同上 |

封面构成：**R2 自有 20 张 + 推文 26 张 = 46 张可用，0 张会过期**。剩下 7 场先 `portal_visible=false` 建进去，图到了再开——记录本身是准的，只是不开门。

逐场清单见 `docs/20261021-p1-live-event-ledger.csv`（53 行，含 `subtype`、封面地址、图源、`ready`/`no-cover` 状态），那是 P1 的执行依据。

每批内部按分类再分小段，小段之间可以停机（比如 P1 先做 `fanmeeting` 40 条，再做 `brand_event` 9 + `birthday` 3）。但**一个分类必须一次做完**，不能留半截。

---

## 八、已定与待定

### 1. 分类层用 Tab（已定，已实现）

2026-10-20 定：**不分区，用 Tab 切换。**

已落地在 `/projects`：

- 进入有子分类的门（线下活动、公开活动）时，分类 chip 下方多出一行 **Tab**，样式是下划线式，与上面的圆角 chip 明确分两层——chip 选门，Tab 选门内分区。
- 参数走 URL：`/projects?category=live_event&subtype=fanmeeting`，可分享、可回退。
- **切换门时自动清掉 `subtype`**，否则新门会用旧门的子类去过滤，结果是一个空页面，看起来像坏了。
- Tab 只在**至少两个子类有内容**时出现。只有一个子类时显示「全部 40 / 见面会 40」等于没筛，是噪音。
- 子类顺序与文案来自 `SUBTYPES_BY_CATEGORY`（`lib/category-registry.ts`），不在页面里另写一份，避免和数据库 CHECK 约束漂移。
- 「全部」的数字含未分类的行，所以可能比各 Tab 之和多 1（线下活动里那场观影会就没有子类）。这个差值是真实状态，不抹掉。

### 2. 门面图谁选（待定）

7 张门面图决定每个门第一眼的气质。两种做法：

- **我按内容挑**，每个门选一张最有代表性的（比如线下活动选香港场大合照），挑完列给你看，你改。
- **你自己在后台挑**，我把槽位留空，Asset Vault → PORTALS 里点选。

第二种你已经用过（5 个入口里有 4 张是你指定过的），继续这样最不容易出错。

---

## 九、这份计划不做的事

- 不改展示层结构（分类层 Tab 已按你的决定实现，不再调整形态）
- 不补链接（`watch_url` 单独一轮，不阻塞建库）
- 不动 `works` 表与 `work_id` 关联（26 条项目仍悬空，等七个门填完之后单独做）
- 不处理待办场次（澳门 11-07、马德里 11-28 未举办，届时再建）

---

## 十、执行记录

### 2026-10-20 · 1 号门（影视作品）

| 项 | 结果 |
|---|---|
| 条目 | 2 条，全部有封面 |
| `Affair (爱情诡计)` | 标题原为素材名「宣传图片」，已正名；封面从 360×450 的 -001 换到 690×863 的 -008 |
| `Harmony Secret (和谐密语)` | 原本**完全没有封面**（线上就是空格子），补官方双人图 1537×2048 |
| 门面图 | 从 360×450 的 -001 换到 -008，同 4:5 裁切 |

发现：`/projects` 卡片**不用 `projects.cover_url`**，走 `gallery_assets` 的 `is_cover` → `-000` → 最早一条。所以只改 `cover_url` 不动 `is_cover`，卡片上的图不会变。两处要一起改。

### 2026-10-20 · 3 号门（线下活动）

| 项 | 结果 |
|---|---|
| 新建 | 52 条（`fanmeeting` 39 / `brand_event` 9 / `birthday` 3 / 观影会 1 无子类） |
| 可见 | **47 条，47 条全部有封面（100%）** |
| Tab | 全部 47 / Fan Meetings 37 / Brand Events 6 / Birthdays 3 |
| 未开 | 6 条无图（`2024-12-14` `2026-01-16` `2026-01-31` `2026-03-15` `2026-10-03` `2026-10-11`） |
| 门面图 | 原槽位挂的是**杂志 ISLAND**（editorial 的图），已换成 2026-08-08 首尔场现场双人 1602×2048 |

快照表：`lmsy_archive.projects_snap_p1_20261020`（28 行，建库前）。
回滚：删掉 `tags @> array['batch_p1_live']` 的行，并从快照恢复被改的 1 行（EVERAFTER BLOOM 补 `subtype`）。

**封面健康检查**：66 张可见封面逐条 HEAD，全部 200。含 39 张 R2、27 张推文原图。
`cdn.lmsy.space` 与 `pbs.twimg.com` 都不依赖签名，不会像档案站海报那样过期。

### 剩下五个门的状态

| 门 | 现有可见 | 目标 | 图源 |
|---|---|---|---|
| 2 号 杂志特辑 | 11 | 17 | 图库已有 237 张，缺的 6 条要挂到新条目 |
| 4 号 公开活动 | 2 | 47 | 96 场总表里 `group=public` **46 场、41 张封面**已备好 |
| 5 号 商务合作 | 4 | 45 | 未实测 |
| 6 号 对话 | 0 | 97 | 未实测 |
| 7 号 直播 | 0 | 55 | 未实测 |

### 2026-10-20 · 4 号门（公开活动）

| 项 | 结果 |
|---|---|
| 新建 | 46 条，7 个子类全部建齐（awards 14 / fashion 7 / industry 6 / brand_stage 6 / charity 5 / fanday 5 / premiere 5，其中 `2026-03-12` 同日两场） |
| 可见 | **16 条**，15 张封面全部 ≥ 600 宽、0 张破图（Japan Expo 从 industry 移到 awards 后多开 1 条） |
| Tab | All 16 / Awards 3 / Fashion Weeks 1 / Brand Appearances 5 / Charity 2 / Industry 2（Premieres 全无图暂不显示） |
| 未开 | 31 条（premiere 5 条**全无图**，书展与公益类过半无图） |
| 门面图 | 原来是空的，靠自动兜底取到一张机场抓拍（854×1280）。已固定指定 iQIYI iJOY TH 2025（1366×2048） |

**分类口径更正（2026-10-20 下午，用户发现并纠正）**：定稿原只写了四个 subtype（含 `fanday`），实际按清单 A–F 扩成六个。6 条归错已修：Song Sang Suk Day 与 SRETSIS 门店开业、Hometown × 三个民俗舞台归 `brand_stage`，Japan Expo 归 `awards`，两场书展归 `charity`。另补建漏掉的 `2026-05-22 Hometown Romance Final Episode Event`（无封面，隐藏）。现在六个 Tab 与清单 A–F 一一对应，A15 / B6 / C10 / D5 / E6 / F5 = 47。

**这一门暴露了两个方法问题，都写进流程里：**

1. **档案站海报的「标题↔图」配对不可靠。** 旧抓取脚本按 Y 坐标找"图上方的最近标题"，但 Google Sites 的图不在标题的 DOM 子树里（探针确认 6 层祖先内 0 张图），滚动懒加载会让顺序错位。抽查三张全部张冠李戴：文件名写着 `elle-fashion-week-2025-in-iconsiam`，图里是 **HOWE AWARDS** 的背景墙；写着 `thailand-person-of-the-year-awards-2025`，图是一张 **ELLE 时装片**。
   → 已把 26 条 R2 海报封面全部回退成隐藏（`temp/p2_revert_posters.sql`），这些字节留在 R2 但不用。
   → **以后档案站只作"这场活动存在"的证据，不作封面来源**，除非能逐张人眼核过。
2. **推文图能保证日期，不能保证内容。** 用「推文时间戳 ±1 天 + 正文关键词」找回 11 张，尺寸检查后剩 8 张，人眼过一遍又砍掉 6 张：一张是**水牛**（关键词 `change2561` 命中，图完全不相关）、一张是舞台屏幕（`Cr.Amp`）、一张是粉丝举的人形立牌表情包、一张 205×274 的手机截图、一张粉丝应援海报、一张 341×522 的小图。
   → 结论：**自动匹配的图必须逐张看图确认，尺寸合格 ≠ 内容合格**。这一轮用 `temp/make_sheet.js` 生成联系表（21 张一屏）一次核完，以后沿用。

**封面质量闸门（已固化）**：宽 ≥ 600px、非截图/表情包/应援物料/舞台屏幕、主体是两人。三条都过才开门。

**门面图分辨率现状**：5 张首页入口全部达标（690 / 690 / 1602 / 1366 / 690 宽）。6、7 号门仍空白，因为 `interview` `variety` `radio` `live_stream` 四个分类还是 0 条。
