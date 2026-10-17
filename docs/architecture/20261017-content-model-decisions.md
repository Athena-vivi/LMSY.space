# 架构决策记录 ADR-001：LMSY.space 内容模型（阶段 1 基准）

- 日期：2026-10-17
- 状态：**Proposed（待站长批准后成为 Accepted 基准）**
- 基准文档：`reports/20261017-长期架构改造-阶段1-内容模型与字段语义确认.md`（下称「阶段1报告」）、`reports/20261017-长期架构审计-站长侧一手证据.md`
- 本记录性质：后续实施人员以本文为准，不得自行重新解释核心概念。阶段1报告与本文冲突处，**以本文校验结论为准**（见 §二三处修正）。
- 本轮校验新增实证：3 次只读 SQL（隐藏容器资产分布、CHECK 约束原文）+ 代码核查（gallery/exhibitions 查询、curation_status 全部读写点、ingest duplicate 路径）。未修改任何代码/数据。

---

## 一、八项决策记录

### D1. projects 保留为统一项目表，用身份语义区分作品与容器

- **事实与证据**：26 行 = 19 真作品（portal_visible=true）+ 7 容器（false）。projects 行承担 5 重职责，其中「编号载体」是空壳（projects.catalog_id 0/26）。容器由 4 条路径自动创建：create-project/route.ts:75-82、split/route.ts:68、link-milestone-project/route.ts:58-65、admin/gallery/milestone/route.ts:16-36（MILESTONES_ARCHIVE 的来源）。
- **最终建议**：不拆表。身份语义先行约定——**portal_visible=true 即前台作品**；当前唯一反例（20260320-airport）本质是待转正作品而非容器，约定成立。
- **是否已确定**：不拆表 ✅ 已确定；身份语义的落地形式 ⏸ 未确定（见 §二问题 1）。
- **尚未确定部分**：是否新增 kind 列、何时加。
- **对后续阶段影响**：阶段 2 前台 IA 以「19 作品」为唯一前台单元集合；容器永不进导航/详情/sitemap。
- **兼容性风险**：若未来出现「隐藏的真作品」（非待转正、长期下架的成品），「可见⇒作品」约定失真——届时加 kind 列是兜底，成本一次 DDL+26 行回填，可接受。

### D2. gallery_assets 是正式图片资产事实源；draft_items 是采集暂存与审核区

- **事实与证据**：330 vs 82 行；「双栖息」仅 18 行重叠（按 image_url）；转正不删草稿（to-gallery/route.ts 只 insert 资产+更新草稿状态）；**6 条 published 草稿仅 2 张真在图库**（本轮 SQL 实证）。
- **最终建议**：维持两表分工；转正单向流、草稿留档。
- **是否已确定**：✅ 已确定。
- **尚未确定部分**：4 条「published 未入图库」孤岛草稿的处置（§六.3）。
- **对后续阶段影响**：图片导入/浏览/搜索全部只对 gallery_assets 建索引与查询；draft_items 不进任何前台查询（编年史过渡期除外，见 D6）。
- **兼容性风险**：批量图片迁移/清理时严禁同时动两表；转正幂等依赖 image_url 相等，改 URL 规范化会破坏幂等。

### D3. 作品类型、图片类型、图片用途、采集来源四分，不再互相代用

- **事实与证据**：四概念现由 4 字段承载（projects.category ✅ / gallery_assets.tag 被污染 / category_tag 有码无数据 / draft_items.tags 渠道词）。泄漏机制：to-gallery/route.ts:87-90 `tag = draft.tags[0]`。tag **无 CHECK 约束**（本轮约束原文实证），大小写混杂（Magazine vs STAGE）。
- **最终建议**：四分确立；tag 枚举化（新 CHECK，DDL，P2）；切断 tags→tag 直接搬运。
- **是否已确定**：概念四分 ✅ 已确定；tag 枚举值表 ⏸ 未确定（§六.5）。
- **对后续阶段影响**：Gallery 筛选、搜索过滤维度、后台录入表单都以此四分为字段依据。
- **兼容性风险**：tag 收 CHECK 前必须先清洗全部 330 行（含 Telegram×3、15 个 NULL、大小写），否则约束创建失败；清洗属禁止事项（本阶段不动）。

### D4. portal_visible 管前台可见性；curation_status 旧语义重定义，但依赖核查完成前不迁移

- **事实与证据**：portal_visible 是 d2e8b19 后 8 个表面的唯一开关（lib/project-visibility.ts）；curation_status 全部读写点本轮盘点完毕——**写入 5 处**（create-project 'draft'、split 'draft'、link-milestone 'published'、admin/gallery/milestone 'published'、admin PATCH 直通 `||'draft'`），**读取 4 种解释**（visibility 模块 neq archived / admin projects 页 watch_url 推断:338 / admin 首页 `??'legacy'`:97 / 编辑弹窗回显 'draft' 默认:87）；CHECK = draft|published|archived（原文实证）。
- **最终建议**：portal_visible 地位不变；curation_status **冻结写入语义**（现有 5 个写入点暂不改值、不批量迁移），目标语义 active|archived 待 CHECK 收窄与写入点改造后一次完成（P2）。
- **是否已确定**：portal_visible 地位 ✅；不批量迁移 ✅（站长指令明令禁止）；新语义值集 ⏸ 未确定（§六.2）。
- **对后续阶段影响**：任何新代码不得再发明 curation_status 的第四种解释；后台筛选暂维持现状。
- **兼容性风险**：冻结期间新容器仍会带 draft/published 旧值（接受，前台不读）；未来 CHECK 收窄时 5 个写入点需同步改造，清单即上文。

### D5. 图片持久编号统一 gallery_assets.catalog_id；展示层停止自造编号

- **事实与证据**：真编号覆盖 312/330（MAG237/AD54/STILL12/STAGE12 前缀实测）；转正管道不生成（18 NULL=双栖息量）；手动上传有生成逻辑（upload/route.ts:129-137）；展示层 4 种即时假编号（lib/catalog.ts AR/PR/SC、lib/timeline.ts:44 D、editorial:137 ED）+ 死代码 archive-number.ts。
- **最终建议**：catalog_id 唯一持久编号；转正管道复用 upload 的生成逻辑补齐；展示层编号改为从 catalog_id 派生或删除；AD/STAGE/STILL 收编入 CATALOG_ID_STANDARD。
- **是否已确定**：唯一编号原则 ✅；标准文本扩展与转正生成规则 ⏸ 未确定（属实施细节）。
- **对后续阶段影响**：搜索可加编号直达；访客全站看到同一资产同一编号。
- **兼容性风险**：18 个历史 NULL 回填需与现有序号冲突检测（upload 逻辑已含冲突重试，可复用）；假编号下线会改变页面显示内容（视觉回归需验收）。

### D6. Chronicle 长期模型暂不定案；先止血机器标题与孤岛草稿

- **事实与证据**：lib/timeline.ts:20-29 实读 draft_items WHERE status='published' AND chronicle_visible=true（chronicle_events 0 行不参与）；6 条全为雷达机器命名（chronicle_title 全 NULL，回退链 :46-49 失守）；**portal_visible 不覆盖此通道**——这是可见性体系最大例外；6 条中 4 条图库外孤岛。
- **最终建议**：长期实体设计延后至阶段 2/3；近期只做两件止血（需站长给内容口径）：补写 chronicle_title 或将 6 条 chronicle_visible 置 false 临时下架。
- **是否已确定**：暂不定案 ✅；止血方案与口径 ⏸ 未确定。
- ****特别约束**：站长指令禁止现在修改 Chronicle 线上展示逻辑——止血动作需站长批准后单独执行。
- **兼容性风险**：无论长期走哪条路（独立条目模型/作品附属视图），现有 6 条数据的标题与日期都需人工重录；draft_items.status 语义收窄（D7 关联）会改变编年史可见条件，迁移时必须同步改 lib/timeline.ts 的 WHERE。

### D7. magazine_issue 是待启用的刊物检索维度；后台录入流程设计时考虑

- **事实与证据**：0/330 全空；237 张 MAG 图无任何期数信息；publications 表 0 行；字段宿主在 gallery_assets。
- **最终建议**：作为待启用维度立项；宿主问题（图片级 vs 作品级）证据不足，见 §二问题 6。
- **是否已确定**：待启用 ✅；宿主实体 ⏸ 未确定。
- **兼容性风险**：无（启用是纯增量）。

### D8. 作品别名是搜索改造需求，不提前实施

- **事实与证据**：无任何 alias 字段/机制；搜索无法命中「爱情诡计↔Affair」对应关系（阶段1报告 §1.8）。
- **最终建议**：阶段 4 搜索改造时一并设计（字段/表形式届时定）；当前不加表、不改结构。
- **是否已确定**：✅ 已确定（不提前）。

---

## 二、阶段1报告校验结果（指令第二节 8 问）

| # | 校验问题 | 结论 | 证据 |
|---|---|---|---|
| 1 | kind 字段是否确有必要 | **非必需即时项**。约定「portal_visible=true 即作品」可覆盖当前 26/26 行（唯一反例 airport 本是待转正作品）；「长期隐藏的真作品」场景约定失效，届时加列兜底 | 本轮 SQL：7 容器全 false、19 作品全 true |
| 2 | curation_status 新语义与代码/默认值/CHECK 一致性 | **不一致，需 P2 一次完成**：目标 active\|archived ≠ 现 CHECK（draft\|published\|archived）；5 个写入点、4 种读取解释清单已列（D4）。在收窄前任何「语义修正」都只改文档不改值 | pg_constraint 原文；grep 12 处读写点 |
| 3 | portal_visible 是否足以控制所有前台入口 | **不足，两处例外实锤**：① /gallery 直读资产池无项目过滤（app/gallery/page.tsx:39-55，仅 tag+分页）——隐藏容器的 **9 张资产**（airport 3 + MILESTONES 6）公开可见；② Chronicle 通道（D6）。exhibitions 分类页安全（:125-157 `.in('project_id', projectIds)` 且 ids 已过滤）✓ | 本轮代码核查 + SQL |
| 4 | 编号规则覆盖手动上传/采集转正/历史资产 | 手动 ✅（upload:129-137）；采集转正 ❌（to-gallery insert 无 catalog_id）；历史 18 NULL ❌——三段式缺口确认，无新反证 | 阶段1报告 §词典9 + to-gallery:97-117 |
| 5 | tag/category_tag/来源与 CHECK 的映射问题 | tag **无 CHECK**（枚举化需 DDL）；category_tag CHECK 3 值且代码在用（project-gallery:72-74）；来源字段与 tag 间唯一映射点就是 tags[0]→tag（需切断）；**无其他未解决冲突** | 约束原文 + grep |
| 6 | magazine_issue 放资产还是刊物作品 | **证据不足，报告未充分支持**：取决于「1 个 editorial 项目=1 期」还是「=1 组特辑图」，需站长确认业务口径后定（B 类） | 0/330；publications 0 行；项目命名混合（DREAM/UNTAMED/GAZE/ISLAND 无期数特征） |
| 7 | 空表/空字段/冗余索引清理是否推迟 | **是，推迟正确**。补充依据：gallery 旧表 anon SELECT 权限未撤、视图与外部客户端依赖未盘点、旧版客户端缓存可能仍引用——先重命名观察一周再删是当前最优路径 | 阶段1报告 §八 P2 行 + 本轮确认 |
| 8 | 报告其他矛盾/证据不足/顺序问题 | **3 处修正**（见 §三） | 见下 |

### §三 阶段1报告的三处修正（以本文为准）

1. **「资产公开=所属项目公开」不成立**（报告验收自检）：
   实际规则是分层的——作品页/分类页/搜索/sitemap/门户=项目级过滤 ✅；**Gallery=资产池全量（无项目过滤）**；Chronicle=草稿状态通道。Gallery 是否应改为尊重项目可见性是**产品决策**（9 张资产去留口径），不是既有 bug 的自动修正。
2. **draft_items.status 推荐工作流修正**：报告写「draft→approved→promoted」，但现有 CHECK 为 `draft|pending_review|published|rejected|archived`（无 approved/promoted）。修正：**复用现有枚举零 DDL**——工作流 draft → pending_review → published | rejected；转正完成的草稿置 **archived**（同时解决「防二次转正」，替代报告中不存在的 'promoted'）。
3. **「d2e8b19 后 8 表面统一可见性」口径补充**：8 表面指 projects 型表面；Gallery 与 Chronicle 从不在其列，属遗留例外（Q3/Q4 既有列账，非新回归）。

另：ingest 的 `ingestion_stage:'duplicate'`（route.ts:223）仅出现在 **API 响应体**，不写库，与 CHECK（无 duplicate 值）无冲突——此前疑点排除。

---

## 三、实施边界

### A. 已确定的架构原则（实施人员必须遵守）

1. projects 不拆表；portal_visible=true 即前台作品；容器永不进前台单元集合。
2. gallery_assets 唯一资产事实源；draft_items 只进采集/审核/编年史（过渡）查询。
3. 类型四分：作品类型=projects.category；图片类型=gallery_assets.tag；图片用途=category_tag；来源=source_*。不得互相代用。
4. 可见性唯一开关=portal_visible；新代码禁止发明 curation_status 第四种解释。
5. 唯一持久编号=catalog_id；展示层禁止按列表序号自造编号。
6. 空表/空字段/冗余索引清理一律走「先重命名观察→再删」路径。
7. 任何数据变更前：备份 → dry-run → 小批量 → 验证（沿用项目既有流程）。

### B. 需要站长作产品决策的事项

1. Gallery 是否应尊重项目可见性（隐藏容器 9 张资产的口径）。
2. curation_status 新值集（推荐 active|archived）。
3. 编年史定位（独立实体 vs 作品附属）+ 4 条孤岛草稿处置 + 机器命名口径。
4. magazine_issue 宿主（1 项目=1 期？）。
5. tag 枚举值表（含大小写与三语展示名）。
6. kind 列是否加、何时加（可推迟到出现首个「长期隐藏真作品」时）。

### C. 可进入后续实施阶段的技术任务（无 DDL、无存量数据变更）

1. to-gallery 停止 `tags[0]→tag`（改为站长显式选择或映射表）。
2. 切断 admin/projects/page.tsx:338 的 watch_url 状态推断。
3. 转正管道补 catalog_id 生成（复用 upload 逻辑）。
4. 统一后台 3 种状态解释为「只读 visibility 模块」。
5. 展示层假编号下线/改为 catalog_id 派生（含视觉回归验收）。
6. （D6 批准后）编年史止血：补 chronicle_title 或 6 条下架。

### D. 暂时不应执行的任务（高风险/破坏性）

站长指令明令禁止，全部确认执行：

- 批量更新 curation_status（含「把 19 个 draft 改 active」这类语义修正）。
- 删除任何表/字段/索引（gallery/publications/chronicle_events、category、display_role、三重索引等全部不动）。
- 批量清洗/重写图片分类（tag 清洗冻结）。
- 修改 Chronicle 线上展示逻辑。
- 增加别名表或任何 DDL。
- 顺手修复其他页面问题。

---

## 四、决策状态总表

| 决策 | 结论 | 状态 | 未决部分 |
|---|---|---|---|
| D1 projects 统一表 | 不拆表+可见⇒作品约定 | ✅ 确定 | kind 落地形式 |
| D2 资产/草稿分工 | 两表分工+单向转正留档 | ✅ 确定 | 4 条孤岛处置 |
| D3 类型四分 | 概念确立 | ✅ 确定 | tag 枚举值表 |
| D4 可见性/状态 | portal_visible 唯一开关；curation_status 冻结待迁 | ✅ 确定（冻结） | 新值集；CHECK 收窄时点 |
| D5 编号 | catalog_id 唯一持久编号 | ✅ 确定原则 | 标准文本扩展；转正生成规则细节 |
| D6 Chronicle | 暂不定案，先止血 | ✅ 确定（暂缓） | 止血口径；长期模型 |
| D7 magazine_issue | 待启用维度 | ✅ 立项 | 宿主实体 |
| D8 别名 | 阶段 4 实施，不提前 | ✅ 确定 | — |

---

## 五、建议的后续实施顺序

```
第 0 步（现在）  站长审阅本 ADR，拍板 §六 清单 → ADR 转 Accepted
第 1 步（阶段2） C 类技术任务 1-5（纯代码，无 DDL 无数据变更，可独立提交验收）
第 2 步          编年史止血（B3 口径批准后单独执行，含视觉验收）
第 3 步（阶段3） P1 数据修正：备份→tag 清洗→18 个 catalog_id 回填→dry-run→小批量
第 4 步          P2 DDL 打包：curation_status CHECK 收窄+5 写入点改造、tag CHECK、
                 死表死字段重命名观察一周→删除、索引去重
第 5 步（阶段4） 搜索与命名改造（含别名、magazine_issue 启用）
```

顺序依据：C 类先行是因为它们阻断新脏数据产生（stop the bleeding）；数据修正在代码停止产生新问题之后；DDL 最后且打包一次评审。

---

## 六、仍需站长亲自确认的关键事项（5 项）

1. **Gallery 口径**：/gallery 目前公开显示隐藏容器名下 9 张资产（airport 3 + MILESTONES 6）。保持现状（Gallery=全图池）还是改为尊重项目可见性？
2. **curation_status 新值集**：确认收窄为 active|archived（或提出替代），并接受「冻结期间旧值共存」。
3. **编年史三连**：定位（独立实体 vs 作品附属）；4 条 published 未入图库草稿的处置；6 条机器命名条目的口径（补标题 or 临时下架）。
4. **magazine_issue 宿主**：1 个 editorial 项目是否对应 1 期杂志？
5. **tag 枚举值表**：Magazine/Advertising/Stage/Still（+是否扩 Appearance 等）及统一大小写。

---

*本文由阶段 1 收尾任务产出。批准后即成为内容模型唯一基准；后续任何概念变更须更新本记录并注明日期。*
