# LMSY.space 搜索契约（阶段 5 基准）

- 日期：2026-10-17
- 状态：**Accepted（内部技术契约，本轮实施依据；不含任何数据库结构/生产数据变更）**
- 前置：ADR-001（Proposed，本文不改变其状态）、前台 IA 方案 §六、阶段 4 最终验收报告 P5-1~P5-5
- 性质：本文定义 `GET /api/search` 的结果契约、覆盖范围、路由映射与排序规则。实施代码：`app/api/search/route.ts`（API）+ `lib/search-results.ts`（纯函数排序/映射）+ `components/search-command.tsx`（前端）。

## 一、设计原则

1. 只搜正式、公开、可直达的内容；不生成任何虚构字段（ADR-001 D5）。
2. 复用现有数据与可见性规则，零 DDL、零新表新列。
3. 结果契约统一、稳定、可测试；前端不通过标题文本推断类型。
4. `draft_items` 孤立草稿、隐藏项目及其图片、已移除的虚构 Resonance 曲目、旧 MDX 内容一律不进公开搜索。

## 二、搜索范围与可见性

| 内容 | 纳入 | 可见性约束 | 依据 |
|---|---|---|---|
| Projects | ✅（type: `project`） | `applyPublicProjectFilter`（portal_visible=true 且未 archived） | lib/project-visibility.ts，与 projects 列表同规则 |
| Gallery 图片 | ✅（type: `gallery`） | 上述公开项目的 id 集合 `.in('project_id', ids)`，与 /gallery 页面同一门禁；id 集合解析失败 fail-closed（图片结果为空，不回退全量） | 阶段 4 批 2 Task 1；修复验收项 P5-1 |
| Editorial | ✅（type: `project`，category='editorial'） | 同 Projects（editorial 本就是 projects 行）；规范地址 `/editorial/[id]`。**同一作品只有一个结果**，不存在 Projects/Editorial 重复 | 阶段 4 批 2 Task 3 |
| Exhibitions | ✅（type: `exhibition`，仅当关键词命中分类名） | 仅收当前有 ≥1 个公开作品的分类（由公开项目 id+category 集合推导，不虚构展览实体）；地址 `/exhibitions/category/[type]` | lib/exhibition-categories.ts |
| Chronicle | ❌ 不单独纳入 | 时间线是作品/图片的派生视图，每个图片组不是独立内容实体；其内容已通过 project/gallery 结果覆盖 | IA 方案 §6.1 方案 A |
| Schedule | ❌ | 无数据源（scheduleItems 恒空数组）；/schedule 路由保留但不出现在搜索结果与 Quick Access | 阶段 4 审计 P1-2 |

## 三、结果契约

响应体：`{ "results": SearchResult[] }`；查询/服务异常：`{ "results": [], "error": "..." }` + 相应 4xx/5xx 状态码。

```ts
interface SearchResult {
  /** 结果类型。前端据此选图标/徽标，禁止用标题推断。 */
  type: 'project' | 'gallery' | 'exhibition';
  /** 数据库稳定标识：projects.id / gallery_assets.id（uuid）；exhibition 为 /exhibitions/category/ 的 type 段。禁止数组下标或临时编号。 */
  id: string;
  /** 可展示标题，全部来自真实字段（见下方映射表），无 'Untitled' 类兜底。 */
  title: string;
  /** 规范详情地址（见 §四路由映射）。 */
  href: string;
  /** 真实描述；无则省略（不伪造）。 */
  description?: string;
  /** 真实图片地址（gallery_assets.image_url 原值，前端经 resolveImageUrl 解析）；无则省略，前端用统一空图样式。 */
  image?: string;
  /** 可靠日期（ISO 字符串）；无则省略。 */
  date?: string;
  /** 可靠分类；无则省略。 */
  category?: string;
}
```

字段映射（全部真实字段，无生成值）：

| type | title | description | image | date | category |
|---|---|---|---|---|---|
| project | projects.title | projects.description（空则省略） | —（项目封面派生链复杂，第一版不提供；结果页用类型图标） | projects.release_date（空则省略） | projects.category |
| gallery | caption → catalog_id → `#{tag}` 三级真实兜底；三者全空的资产不进结果（无法有意义展示） | —（caption 已作 title；tag 放 category） | gallery_assets.image_url | gallery_assets.event_date（空则省略） | gallery_assets.tag（空则省略） |
| exhibition | 分类 label（en/zh/th 按请求 `lang` 参数，默认 en） | 分类 description（en） | — | — | projects.category 值 |

不变式（测试断言）：
1. `id` 必须是数据库 uuid 或真实分类 type 段；同一输入下结果 id 集合确定。
2. `title`/`description`/`image`/`date`/`category` 只能来自上表字段，缺真值时省略。
3. `type='project'` 且 `category='editorial'` ⇒ `href` 必须以 `/editorial/` 开头；其余 project ⇒ `/projects/`。
4. `type='gallery'` ⇒ `href` 必须是 `/gallery#{该资产真实 uuid}`（Gallery 页锚点即资产 uuid，支持自动翻页定位；无 catalog_id 的资产照常用 uuid，不伪造编号）。
5. `type='exhibition'` ⇒ `href` 必须是 `/exhibitions/category/{type}`，且该分类当前有公开作品。

## 四、路由映射

| 内容 | href |
|---|---|
| 普通作品 | `/projects/[uuid]` |
| Editorial 作品 | `/editorial/[uuid]`（唯一规范入口，接受 uuid 与 catalog_id 双识别；搜索结果统一输出 uuid 形式） |
| 图片 | `/gallery#[asset-uuid]`（现有已验证的稳定定位方式：Gallery 页 `id={item.id}` + 锚点自动翻页） |
| Exhibition 分类 | `/exhibitions/category/[type]`（type ∈ EXHIBITION_CATEGORIES） |

不存在/无法可靠定位的目标不生成链接：隐藏项目及其图片在结果集层面被过滤（不是生成后过滤），因此不会出现死锚点。

## 五、排序与去重（可解释、可测试）

打分（纯函数 `lib/search-results.ts`，输入统一小写化比较）：

| score | 匹配 |
|---|---|
| 40 | 标题精确匹配（== term） |
| 30 | 标题前缀匹配（startsWith） |
| 20 | 标题包含匹配（includes） |
| 10 | 元数据匹配（project: description/category；gallery: tag/caption-元数据；exhibition 恒 10） |

排序规则（同一输入结果顺序确定）：
1. score 降序；
2. 同分时类型优先级 project > exhibition > gallery（作品先于图片/入口）；
3. 再同分时真实日期降序（无日期排同组末尾，不伪造日期补位）；
4. 最终 tiebreak：id 字典序（保证完全稳定）。

去重：
- project 结果天然唯一（单查询、单映射；editorial 是 project 行的一种 href 映射，不产生第二结果）。
- gallery 结果按 gallery_assets.id 查询唯一，无重复路径。
- 同一作品 + 其图片同时命中属预期（不同 type、不同 href，非重复）。

限量：projects 候选池 50、gallery 候选池 100（DB 层 ILIKE 预筛；池容量按当前数据量取足，避免 uuid 序截断召回）；两个候选池均先按数据库 `id` 升序形成确定集合，再由应用层打分排序，各取前 10 / 总结果上限 15。关键词清洗沿用 `lib/search-term.ts`（<2 字符返回空结果；分隔符、通配符及单双引号等语法字符剥离，防止破坏 `.or()` 语法）。

## 六、前端消费（components/search-command.tsx）

- 三态：加载中（spinner）/ 无结果（三语文案）/ 请求失败（三语错误文案，与无结果区分）。
- 类型展示：按 `type` 选图标与徽标（project/exhibition/gallery），**不解析标题**。
- 图片：`result.image` 存在时经 `resolveImageUrl` 显示缩略图，否则统一渐变空图。
- 文案全部走 `lib/languages.ts` 三语键（search.*），修复 P5-4。
- Quick Access：移除 Schedule 占位（P5-3），保留 Gallery/Projects/Profiles；标签复用现有 `nav.*` 三语键。
- 点击行为：统一消费结果 `href`；Gallery 在当前页内跳转时主动触发 hash 定位，页面监听 `hashchange` 并重置 tag 到 All，避免目标被当前筛选挡住。
- 请求竞态：每次输入变更使旧请求失效，只有最新请求可更新结果；新结果落地时重置键盘选中项，Enter 同时有首项兜底。
- 键盘导航（↑↓/Enter/Esc/Cmd+K）保留。

## 七、禁止事项（继承指令与 ADR-001）

- 无 DDL/迁移/索引/RLS 变更；无生产数据写入。
- 不伪造 catalog_id、标题、描述、日期、封面。
- draft_items 不进任何搜索查询。
- 不引入向量检索/外部搜索服务；第一版 = PostgREST ILIKE + 应用层打分。

## 八、验收测试映射（tests/phase5-search.test.ts）

| 契约条款 | 用例 |
|---|---|
| §二可见性 | route.ts 源断言：gallery 查询带 `.in('project_id', …)` 门禁 + fail-closed；projects 走 applyPublicProjectFilter |
| §三不变式 1-3 | 映射函数单测：editorial→/editorial、普通→/projects、id=uuid、无伪造字段 |
| §三不变式 4 | gallery href 恒为 `/gallery#<uuid>` |
| §五排序 | 精确>前缀>包含>元数据；同分类型优先级；同输入稳定序；无日期不补位 |
| §三兜底 | caption/catalog/tag 全空资产被排除；'Untitled' 不存在 |
| §六 | 前端无 schedule 类型残留；search.* 三语键齐备 |
