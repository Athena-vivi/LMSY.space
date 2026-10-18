# LMSY.space 前台重构与验收报告

> 日期：2026-10-18
> 配套文档：`20261018-migration-log.md`（数据库与迁移细节）、`20261018-target-ia.md`（方案）
> 本文回答三件事：**改了什么、验到什么程度、线上还有哪些没验**。

## 1. 信息架构落地结果

### 1.1 导航

| 位置 | 入口 | 目标 |
|---|---|---|
| 导航 1 | Projects | `/projects` |
| 导航 2 | Timeline | `/timeline` |
| 导航中间 | 搜索 | 全站搜索，⌘K / Ctrl+K |
| 导航 3 | People | `/people` |
| 导航 4 | Gallery | `/gallery` |

`/resonance`、`/schedule`、`/whispers`、`/copyright` 页面仍在，只是移出导航。`Duality` 作为社交外链组，不占主导航位。

### 1.2 首页区块

顺序：Hero → MuseumPreface → Explore by Type → Featured Projects → Timeline Preview → People & Archive Story。

| 区块 | 数据来源 | 空态处理 |
|---|---|---|
| Explore by Type | `/api/home/portals` 返回 5 个固定入口的 `counts` + `covers` | 计数为 0 时显示"收录中"徽章 + 渐变底，**卡片不消失** |
| Featured Projects | `/api/home/summary` 的 `featured`（≤8） | 无封面项目一律跳过；不足 8 条时显示实际条数，不用占位图凑 |
| Timeline Preview | `summary.years`（2022 起，真实分布） | 空年份带"暂无记录"标签，不伪造计数 |
| People | `summary.people` | 只显示真实 profiles 行 |

五个首页入口固定为 `drama_work`、`editorial`、`live_event`、`public_appearance`、`commercial`（`HOME_CATEGORIES`）。`behind_the_scenes`、`early_archive` 不在首页露出，但在 `/projects` 的完整筛选里存在。

### 1.3 分类单一事实源

`lib/category-registry.ts` 同时供：数据库 CHECK 的取值来源、首页入口、`/projects` 筛选 chip、搜索结果的分类聚合、旧 URL 别名解析。`lib/category-meta.ts` 降为薄适配层，只负责把 registry 的 `labelKey` 翻译成文案，不再自己维护一份分类表。

旧值不丢：`series/appearance/travel/daily/magazine/journal/music` 通过 `LEGACY_CATEGORY_ALIASES` 解析，`?category=series` 这类旧链接仍然能落到 `drama_work`。

### 1.4 路由

| 路由 | 类型 | 说明 |
|---|---|---|
| `/projects` | 索引 | 支持 `?category=`；chip 只显示有内容的分类 |
| `/projects/[id]` | 详情 | `id` 段先按 slug 查，再按 uuid 查，两种 URL 都能开 |
| `/timeline` | 时间线 | 事件 = 项目（按 `event_date`）+ 图片组（按 `gallery_assets.event_date`） |
| `/timeline/[year]` | 年份页 | 非 4 位数字直接 404 |
| `/people` | 人物索引 | — |
| `/people/[slug]` | 人物详情 | slug 与 uuid 双支持，反查关联的公开项目 |
| `/gallery` | 图库 | 卡片角标显示项目名 + 事件日期，不再用 `catalog_id` |

旧路由兼容表见 `20261018-migration-log.md` §5.2，7 组全部保留重定向，没有制造 404。

## 2. 日期与可见性规则

- 展示日期优先级：`projects.event_date` → `projects.release_date` → `gallery_assets.event_date`。
- 全站**没有**一处用 `created_at` 或采集日当事件日期。
- 只知年份的记录只保留年份（当前数据里没有这种行，规则已在代码层成立）。
- `created_at` 保留原义（入库时刻），继续用于"最近入库"这类排序。
- 公开可见性仍是 `applyPublicProjectFilter` 一个函数，新增 `is_container !== true` 一个条件，JS 侧与 SQL 侧同步改。所有前台读取（列表、详情、首页、时间线、图库、搜索、sitemap）都走它。

## 3. 测试结果

| 检查项 | 命令 | 结果 |
|---|---|---|
| 类型 | `npx tsc --noEmit` | 通过，无输出 |
| 单元/契约测试 | `npm test` | **338 pass / 0 fail / 50 suites** |
| Lint（本次改动文件） | `npx eslint <files>` | 0 error（`app/gallery/lightbox.tsx` 4 条 `_node` 未使用警告，为 `react-markdown` 组件映射的惯例写法） |
| 生产构建 | `CODEBUDDY_SAFE_DELETE_ENABLED=0 npm run build` | 成功 |

构建产物中新增路由均按预期出现：`/api/home/summary`（动态）、`/people`（动态）、`/people/[slug]`（动态）、`/timeline`（动态）、`/timeline/[year]`（按需 ISR）。

测试改动说明：`tests/phase4-frontend.test.ts`、`phase4-batch2.test.ts`、`phase5-search.test.ts`、`phase6-batch1.test.ts` 中，原先断言"展览分类映射""`/chronicle` 是唯一时间线""`buildExhibitionResults` 存在"的用例，已改为断言新的单一分类表、`/timeline`、`buildCategoryResults`。这些是**断言跟着架构变更走**，不是把失败用例删掉。

## 4. 数据侧核验（可执行的部分）

本机无法访问 Supabase REST 与 `lmsy.space`（详见 §5），因此改为通过 Supabase 管理 API 直接跑**与前台等价的 SQL**，确认数据能支撑页面：

| 核验项 | 结果 |
|---|---|
| 5 个首页入口的公开项目数 | editorial 11 / commercial 4 / public_appearance 2 / drama_work 2 / live_event 1 |
| 各入口能解析到封面 | editorial 11/11、commercial 4/4、public_appearance 2/2、drama_work 1/2、live_event 0/1 |
| 年份分布（2022 起） | 2026×3、2025×9、2024×9 |
| 人物与关联项目 | lookmhee 2、sonya 2 |
| 精选候选（有封面、每类≤2） | 8 条，全部有封面 |
| 项目 slug 覆盖 | 26/26 |
| 孤儿图片 | 0 |
| 公开项目可见图片 | 330 |

两张卡的封面为空是已知内容缺口，不是代码问题：

- `drama_work` 的 `harmony-secret` 无图 → 该入口的封面由 `affair` 提供，实际有图。
- `live_event` 只有 `everafter-bloom-sao-paulo` 一个项目且无图 → 该入口显示计数 1 + 渐变底，不出图。补图即恢复。

## 5. 未验证的部分（明确报告）

指令要求"不得将本地测试结果描述为线上验收成功"，因此逐项列明：

| 项 | 状态 | 原因 |
|---|---|---|
| 本地 `next start` 端到端冒烟 | **失败，非代码问题** | `/api/home/summary` 返回 500，日志为 `TypeError: fetch failed` / `ECONNRESET`；直连 Supabase REST 报 `SSL: UNEXPECTED_EOF_WHILE_READING`；`curl https://lmsy.space/` 与 Supabase REST 均返回 `000`；尝试 64333 / 7890 / 10809 三个本机代理端口均无监听。判定为本机出网受限 |
| 线上真实数据回归 | **未执行** | 同上 |
| 桌面 / 移动端实机检查 | **未执行** | 同上 |
| 旧路由线上 30x 实际跳转 | **未执行** | 路由实现已在本地构建中编译通过，运行时跳转未在线上确认 |
| 图片断链检查 | **未执行** | 线上 CDN 不可达 |
| Vercel 部署 | **未执行** | 同上；提交与推送可做，部署后无法本地验证 |

规避措施：为降低对 PostgREST 嵌入语法的依赖（本地无法验证其行为），`/projects/[id]` 的人物关联从 `profiles:profile_id(...)` 嵌入查询改为两次普通查询（先查 `project_people`，再用 `in` 查 `profiles`）。语义等价，不依赖嵌套 select。

## 6. 已知遗留（数据侧，非代码缺陷）

1. **精选区标题有 4 条是采集原文**：`airport-20260320`（20260320-airport）、`coffee`、`live`、`milestones-archive`（MILESTONES_ARCHIVE）。代码不做标题美化——那等于伪造内容。最小操作是在后台补标题，或给 2–3 个真正有代表性的项目设 `homepage_featured = true` 来换掉它们。
2. **`behind_the_scenes` 与 `early_archive` 分类为空**：入口按"收录中"显示，要在下次采集时按新分类入库才会填充。
3. **`file_hash` 全为 NULL**：330 行历史图片没有源文件哈希可算。该列对**新增**入库已生效（转正链路写入），重复检测从下一次采集起可用。历史去重是独立任务。
4. **5 个采集容器**：`is_container = true` 已把它们从前台全部摘除（公开项目 26 → 21），但物理行与其中的图片保留原状，等人工决定是否合并/删除。
5. **`search_aliases` 全为空**：搜索目前只能命中标题与已有中文名。补别名是纯数据工作，字段与 API 都已就绪。

## 7. 提交内容

本次改动范围：Schema 迁移脚本（`temp/`，不入库）、前台 4 个新目录、11 个新文件、40 余处改写、3 个文件删除、4 份测试断言更新、6 份文档（5 份方案 + 本文与迁移记录）。

删除的文件只有 3 个，均为已被单一分类表取代的重复实现；**没有任何页面路由被删除**。
