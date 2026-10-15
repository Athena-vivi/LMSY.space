# LMSY.space 历史杂志内页显示故障 —— 专项调查报告

**调查日期：** 2026-10-15
**调查方式：** 代码链路追踪 + Git 历史比对 + 生产 Supabase / R2 只读核验
**边界遵守：** 未修改任何生产数据、R2 对象、数据库结构或代码。所有脚本均为只读分析（temp/ 目录下 mag-orphan-analysis.mjs 等）。

---

## 一、当前杂志详情页的实际数据读取流程

**页面链路：** `/projects`（列表，按分类筛选）→ `/projects/[id]`（详情页，杂志期 = 一个 project）→ 内页图片列表。

当前 `/projects/[id]` 的服务端查询（`app/projects/[id]/page.tsx:101-107`）：

```ts
const { data: galleryImages } = await supabaseAdmin
  .schema('lmsy_archive')
  .from('gallery_assets')        // ← 从这张表取内页
  .select('*')
  .eq('project_id', id)          // ← 按 project_id 关联
  .order('created_at', { ascending: true });
```

- **封面**：直接来自 `projects.cover_url` 字段（独立于图片表），所以封面始终能显示。
- **内页**：依赖 `gallery_assets` 表中 `project_id` 指向该项目、且 `is_cover=false` 的行。
- 排序规则（page.tsx:65-87）：`is_cover` 或 `catalog_id` 以 `-000` 结尾的排最前，再按 `sequence` 字段排序。
- 备用公共接口 `/api/project-gallery` 查询逻辑完全相同。

**线上现状（只读实测）：** `gallery_assets` 仅 18 行，全部是 2026 年 2 月后经新草稿工作流产生的新资产（R2 路径为 `draft/...` 前缀），只关联 3 个项目。**历史杂志期内页在这个表里一行都不存在** → 详情页查到 0 行 → 内页空白。

---

## 二、旧版与当前版的关键差异（Git 证据）

### 时间线

| 时间 | 提交/事件 | 说明 |
|---|---|---|
| 2025-01-09 | 迁移 `20250109_add_project_id_to_gallery.sql` | 给遗留 `gallery` 表加 `project_id` 列，明确注释："References the parent project (**e.g., magazine issue**)" —— 内页关联机制正式建立 |
| 2025-01-10 | 迁移 `20250110_update_project_categories.sql` | 分类改名：**`magazine` → `editorial`**（注释明确 "editorial: Magazine/Editorial content, Catalog prefix: MAG"） |
| 2026-01-11 | 提交 `df29cab`（Implement deep archive system） | 旧版详情页：`.from('gallery').eq('project_id', id)` —— **此版本及之前内页正常** |
| 2026-01-12 | scripts/batch-feed-*.ts、sync-r2-to-db.ts、link-gallery-to-projects.ts | 旧管道：把 `magazines/` R2 文件登记进 `gallery` 表（含 catalog_id、project_id） |
| **2026-03-16** | **提交 `b60e2e2`**（Implement draft-to-asset workflow） | **关键断点**：`app/projects/[id]/page.tsx` 中 `-.from('gallery')` → `+.from('gallery_assets')`。该提交**不含任何数据迁移**（45 个变更文件里唯一的 SQL 是给 gallery_assets 加 rotation 列，`20260316_add_rotation_to_gallery_assets.sql`） |
| 2026-03-18 | `d320853` | 后续 i18n 迁移，同样未回填历史数据 |

### 关键异常（Git + 迁移核查结论）

1. **`gallery_assets` 表没有创建迁移**。全仓库（含全部历史）搜不到 `CREATE TABLE gallery_assets`；`20260316` 迁移直接 `alter table` 它——表是在数据库里手工建的，脱离了迁移体系。
2. **`gallery` → `gallery_assets` 的切换没有携带数据**。b60e2e2 无任何 scripts/ 变更、无数据回填迁移。
3. **所有迁移文件中没有任何 TRUNCATE/DELETE**（全量 grep 证实）；仓库内也没有删除 `gallery` 数据的脚本（`scripts/delete-fake-data.ts` 只删 draft_items 中 source_url 含 'mock' 的行）。

---

## 三、R2 历史图片 ↔ 数据库 ↔ 页面的对应关系（只读实测）

### R2 `magazines/` 全量解析（命名规则 `magazines/{年}/LMSY-{类型}-{YYYYMMDD}-{NNN}.webp`，408 个对象全部可解析，无例外）

| 期号组（类型-日期） | 总页数 | 内页文件（002+） | 被引用 | 孤儿 |
|---|---|---|---|---|
| MAG-20241023 | 22 | 21 | 1 | 20 |
| MAG-20241104 | 19 | 18 | 1 | 17 |
| MAG-20241125 | 22 | 21 | 1 | 20 |
| MAG-20241203 | 1 | 0 | 1 | 0 |
| MAG-20241211 | 24 | 23 | 1 | 22 |
| MAG-20241217 | 39 | 38 | 1 | 37 |
| MAG-20241218 | 22 | 21 | 1 | 20 |
| MAG-20250101 | 22 | 21 | 1 | 20 |
| MAG-20250117 | 38 | 37 | 1 | 36 |
| MAG-20250801 | 19 | 18 | 1 | 17 |
| MAG-20250910 | 19 | 18 | 1 | 17 |
| AD-20240214 | 11 | 10 | 1 | 9 |
| AD-20250926 | 13 | 12 | 1 | 11 |
| AD-20251017 | 9 | 8 | 1 | 7 |
| AD-20251123 | 25 | 24 | 1 | 23 |
| **AD-20251216** | 12 | 12 | **0** | 12 |
| STAGE-20251118 | 13 | 12 | 1 | 11 |
| STILL-20241028 | 10 | 9 | 1 | 8 |
| **TRV-20251216** | 8 | 8 | **0** | 8 |
| **合计** | **332** | **332** | **17** | **315** |

### 对应关系结论

1. **17 个被引用文件 = 每期的 `-001` 页**，且恰好是 17 个项目的 `cover_url`（11 个 editorial 分类 = 原杂志、4 个 commercial = 原广告、1 个 series STILL、1 个 appearance STAGE）。**封面能显示，就是因为 cover_url 直连 R2，不经过任何图片表。**
2. **315 个孤儿文件 = 每期的第 002 页起的全部内页** + 2 个没有对应项目的完整组（AD-20251216 全部 12 页、TRV-20251216 全部 8 页，含其 001 页）。
3. 代码中的 `-000 = 封面` 约定（page.tsx 排序、sync-r2-to-db.ts 的 is_featured 判断）**在真实数据里从未使用**——实际封面是 `-001`。代码约定与数据现实不一致。
4. 项目 `catalog_id` 字段全部为空，无法用 catalog 关联，只能靠 `cover_url` 的 TYPE-DATE 匹配期号。

---

## 四、根因及证据

### 根因（多层叠加，按因果链排序）

**根因 1【主因，类别 A + B】：2026-03-16 提交 `b60e2e2` 把详情页数据源从 `gallery` 切换到 `gallery_assets`，但没有迁移任何历史数据。**
- 证据：`git show b60e2e2 -- app/projects/[id]/page.tsx` 显示 `-.from('gallery')` / `+.from('gallery_assets')`；该提交无数据迁移；线上 `gallery_assets` 中无任何历史杂志行。
- 从这个提交起，所有历史期内页在页面上消失。**图片文件本身完好**（对账 0 断链）——典型"图片还在，页面不读了"。

**根因 2【次因，类别 B】：遗留 `gallery` 表（旧数据的唯一存放处）当前为 0 行。**
- 仓库内找不到任何清空它的脚本或迁移（全量核查），**清空操作发生在版本控制之外**（时间与方式无法从现有证据确认）。
- 这意味着即使把代码改回读 `gallery` 也无济于事——数据已不在表里，唯一完整副本是 R2 文件本身 + 文件名里的编号规则。

**伴生问题【类别 C 的局部体现】：** 代码的封面约定（`-000`）与真实数据（`-001`）不一致；且 2 个期号组（AD-20251216、TRV-20251216）没有任何项目与之对应。

### 结论归类

| 类别 | 是否成立 | 说明 |
|---|---|---|
| A. 图片仍在，页面没有正确读取 | ✅ 成立（主因） | 315 个内页文件完整，当前页面查的表里没有它们 |
| B. 关联数据在迁移中遗漏/丢失 | ✅ 成立 | 表切换未迁移数据；遗留表后被库外操作清空 |
| C. 命名/目录规则被新代码改变 | ⚠️ 部分成立 | 目录与命名规则本身未变；但代码内 `-000` 封面约定与数据 `-001` 现实不符 |
| D. 图片文件缺失 | ❌ 不成立 | R2↔DB 断链 0，所有引用文件均存在 |
| E. 其他 | 补充 | 封面因存于 `projects.cover_url` 而幸免，这解释了"只见封面不见内页"的现象 |

### 尚无法确认的环节（不猜测）

1. `gallery` 表数据被清空的具体时间和操作方式（需 Supabase Dashboard 审计日志/操作历史，普通 API 无历史查询能力）。
2. `gallery_assets` 表确切的创建时间与建表语句（不在版本控制内）。
3. AD-20251216、TRV-20251216 两组是否本就没有对应项目（可能项目从未建，或建了但封面字段为空——`projects` 表另有 8 个项目 cover_url 不指向 magazines/）。

---

## 五、最小修复方案（供审阅，未实施）

**推荐方案：数据回填脚本（不改页面代码、不需要建新表，仅需向现有 `gallery_assets` 插入行）**

1. **改动内容：** 新增一次性脚本（如 `scripts/backfill-magazine-pages.ts`，只在本地手动运行一次）：
   - 列举 R2 `magazines/` 全部对象，解析 `LMSY-{TYPE}-{YYYYMMDD}-{NNN}.webp`；
   - 跳过每期 `-001`（已是项目封面）；
   - 按 `TYPE-DATE` 匹配项目（匹配规则：该项目 `cover_url` 含同名 `-001` 文件）；
   - 为每个文件插入一行 `gallery_assets`：`project_id`=匹配项目、`image_url`=cdn URL、`catalog_id`=重构编号、`sequence`=NNN、`is_cover=false`、`category_tag=null`；
   - 插入前按 `image_url` 查重，保证可重复执行（幂等）。
2. **需要改动：** 仅新增 1 个脚本文件；运行约 315 条 INSERT（只写 `gallery_assets`）。
3. **是否需要数据库迁移：** **不需要**（gallery_assets 已存在且具备全部所需字段：project_id/image_url/catalog_id/sequence/is_cover）。
4. **需要人工决策的点：** AD-20251216（12 页）和 TRV-20251216（8 页）没有可自动匹配的项目——需你确认是补建项目还是暂时不回填。
5. **风险与对策：**
   - 插错项目 → 脚本先输出"文件→项目"映射清单供人工确认后再执行（dry-run 模式）；
   - 重复插入 → 幂等查重 + 执行前对 `gallery_assets` 做一次导出备份（CSV/JSON 落地本地）；
   - 与现有 18 条新资产冲突 → 无冲突（它们全在 draft/ 路径，无交叉）；
   - 可回滚 → 记录本次插入的 id 列表，必要时按 id 精确删除。

**不推荐：** 改回读旧 `gallery` 表（数据已空，无意义）；重构图片系统（超出本问题范围）。

---

## 六、315 个孤儿文件的定性

| 定性 | 数量 | 识别方式 |
|---|---|---|
| **确定是历史杂志/图集内页**（有明确所属项目） | **283** | 所属期号的 `-001` 页被 17 个项目的 cover_url 引用，按 TYPE-DATE 精确匹配：12 个 MAG 组（202 个内页）+ 4 个 AD 组（54 个，含 AD-20251216 除外）+ STAGE（11）+ STILL（8）… 详见表三 |
| **是历史内页但所属项目缺失** | **20** | AD-20251216（12）+ TRV-20251216（8），编号规律一致但无项目可挂 |
| 仍无法确定 | **0** | 408 个 magazines/ 文件全部解析成功、全部定性 |
| 另有 draft/ 孤儿 | 5 | 与杂志无关，属草稿管道残留，另行处理 |

**一句话结论：315 个"未被引用"的历史图片中，295 个是明确有归属的期内页（含 2 组待定项目的 20 张），全部完好保存在 R2，只是数据库关联在 2026-03-16 的表切换中丢失、遗留表随后又被清空。**

---

*本报告全部结论基于代码审查、Git 提交记录与生产系统只读核验。未实施任何修复，等待审阅授权。*
