# LMSY.space 字段字典

> 事实来源：`information_schema.columns`（2026-10-18 快照）。"覆盖"指有值行数/总行数。
> 状态：**已实施**（2026-10-18）。本文的"新增"字段全部已建列并回填，执行记录与实际覆盖数见 `20261018-migration-log.md`。
> 处置标记：**保留**（原样用）/ **改义**（沿用字段，收窄含义）/ **启用**（字段已有但没人用）/ **停用**（保留列不删，代码不再读）/ **新增**。

## 1. `projects`（26 行 / 25 列）

| # | 字段 | 类型 | 含义 | 可空 | 覆盖 | 前台用途 | 处置 |
|---|---|---|---|---|---|---|---|
| 1 | `id` | uuid PK | 项目标识 | 否 | 26/26 | 详情页 URL（现为 `/projects/{uuid}`） | 保留 |
| 2 | `title` | varchar | 主标题 | 否 | 26/26 | 卡片、详情 H1、搜索 | 保留 |
| 3 | `category` | varchar | 一级分类 | 是 | 26/26 | 首页入口、列表筛选、统计 | **改义**（新枚举见分类规范） |
| 4 | `release_date` | date | 原始发布/上线日 | 是 | 26/26 | 现被编年史当事件日用 | **改义**：只作发布日 |
| 5 | `description` | text | 项目简介 | 是 | 5/26 | 详情页正文 | 保留 |
| 6 | `cover_url` | text | 封面图 | 是 | 25/26 | 列表/详情/首页封面 | 保留 |
| 7 | `created_at` | timestamptz | 入库时间 | 是 | 26/26 | 排序兜底 | 保留（不得当事件日） |
| 8 | `watch_url` | text | 观看链接（剧集） | 是 | 0/26 | 剧集详情外链 | **启用**（仅 drama 有意义） |
| 9 | `catalog_id` | text | 项目级编号 | 是 | 0/26 | 无 | **停用**（从未分配，不显示） |
| 10 | `blur_data` | text | 封面模糊占位 | 是 | — | 图片加载占位 | 保留 |
| 11 | `tags` | text[] | 自由标签 | 是 | 0/26 | 无 | **停用**（分类已承载） |
| 12 | `start_date` | date | 持续期开始 | 是 | 7/26 | 无 | 保留，用于有档期项目 |
| 13 | `end_date` | date | 持续期结束 | 是 | 7/26 | 无 | 保留 |
| 14 | `is_ongoing` | boolean | 是否持续中 | 是 | — | 无 | **停用** |
| 15 | `portal_visible` | boolean | 前台可见开关 | 是 | 26/26 | 所有公开读取的闸门 | 保留（唯一可见性开关） |
| 16 | `portal_priority` | int | 首页排序权重 | 是 | — | 门户取图排序 | 保留 |
| 17 | `homepage_featured` | boolean | 首页精选 | 是 | 1/26 | Longform 精选区 | 保留（唯一索引限 editorial） |
| 18 | `homepage_excerpt` | text | 精选摘录 | 是 | 0/26 | 精选区引用框 | 保留 |
| 19 | `homepage_cover_url` | text | 精选区封面 | 是 | 1/26 | 精选区 | 保留 |
| 20 | `theme_statement` | text | 主题陈述 | 是 | 0/26 | 无 | 保留（策划字段） |
| 21 | `curation_status` | text | 审核状态 | 是 | 26/26 | 仅排除 `archived` | **改义**：需明确 draft 是否可见 |
| 22 | `title_i18n` | jsonb | 三语标题 | 是 | 2/26 | 标题本地化 | 保留 |
| 23 | `description_i18n` | jsonb | 三语简介 | 是 | 2/26 | 正文本地化 | 保留 |
| 24 | `theme_statement_i18n` | jsonb | 三语主题陈述 | 是 | — | 无 | 保留 |
| 25 | `homepage_excerpt_i18n` | jsonb | 三语摘录 | 是 | — | 精选区 | 保留 |

### projects 新增字段

| 字段 | 类型 | 可空 | 必填规则 | 用途 |
|---|---|---|---|---|
| `slug` | text | 是 | 发布时必填 | 稳定 URL `/projects/{slug}`，空则回退 UUID |
| `event_date` | date | 是 | 无（不确定留空） | 事件/拍摄实际发生日，编年史首选 |
| `source_published_at` | date | 是 | 无 | 原始发布日，编年史次选 |
| `location` | text | 是 | 无 | 地点 |
| `publisher_brand` | text | 是 | 无 | 出版方/品牌/主办方 |
| `search_aliases` | text[] | 是 | 无 | 别名、简称、泰文/中文名，进入搜索 |
| `is_container` | boolean | 否，默认 false | — | 采集容器标记，前台默认排除 |
| `updated_at` | timestamptz | 否，默认 now() | — | 最近修改时间 |

## 2. `gallery_assets`（330 行 / 33 列）

| # | 字段 | 类型 | 含义 | 可空 | 覆盖 | 前台用途 | 处置 |
|---|---|---|---|---|---|---|---|
| 1 | `id` | uuid PK | 图片标识 | 否 | 330/330 | 图库锚点 `#asset-{uuid}` | 保留 |
| 2 | `image_url` | text | 存储地址 | 否 | 330/330 | 所有图片渲染 | 保留 |
| 3 | `caption` | text | 图片说明 | 是 | 324/330 | 灯箱说明 | 保留（说明的唯一字段） |
| 4 | `tag` | text | 内容类型 | 是 | 324/330 | 图库筛选条 | **改义**：只留内容类型 |
| 5 | `is_featured` | boolean | 精选图 | 否 | 0/330 | 无 | **启用**或停用 |
| 6 | `catalog_id` | text UNIQUE | 图片编号 | 是 | 321/330 | 现常驻卡片角标 | **改义**：只在详情/管理显示 |
| 7 | `is_editorial` | boolean | 编辑类标记 | 否 | 0/330 | 无 | **停用**（分类已表达） |
| 8 | `curator_note` | text | 策展备注 | 是 | — | 无 | 保留（内部） |
| 9 | `title` | text | 单图标题 | 是 | 324/330 | 与 caption 同值 | **改义**：仅在需要命名单图时用 |
| 10 | `excerpt` | text | 摘要 | 是 | — | 无 | **停用** |
| 11 | `category` | varchar | 旧分类 | 是 | — | 无 | **停用** |
| 12 | `author` | varchar | 作者 | 是 | — | 无 | **停用**（用 `credits`） |
| 13 | `read_time` | varchar | 阅读时长 | 是 | — | 无 | **停用** |
| 14 | `blur_data` | text | 模糊占位 | 是 | — | 图片占位 | 保留 |
| 15 | `credits` | text | 版权/署名 | 是 | 0/330 | 无 | **启用**（灯箱角落） |
| 16 | `magazine_issue` | varchar | 杂志期号 | 是 | 0/330 | 无 | **启用**（editorial 类） |
| 17 | `project_id` | uuid FK | 所属项目 | 是 | 330/330 | 项目详情、图库反查 | 保留（改 `RESTRICT`） |
| 18 | `event_date` | date | 图片事件日 | 是 | 330/330 | 编年史图片组 | 保留（语义需标注精度） |
| 19 | `milestone_priority` | int | 里程碑排序 | 是 | — | 首页里程碑 | 保留 |
| 20 | `category_tag` | text | 内容子类 | 是 | 0/330 | 无 | **启用**（official_stills/bts/press_events） |
| 21 | `display_role` | text | 展示角色 | 是 | 330/330 | 无 | **启用**或停用 |
| 22 | `integrity_status` | text | 文件健康 | 是 | 330/330 | 无 | **启用**（后台巡检） |
| 23 | `is_cover` | boolean | 是否封面 | 否 | 18/330 | 项目封面候选 | **启用**（替代 `-000` 规则） |
| 24 | `is_portal_candidate` | boolean | 门户候选 | 否 | — | 无 | **启用**或停用 |
| 25 | `sequence` | int | 项目内顺序 | 是 | 323/330 | 详情页排序 | 保留 |
| 26 | `created_at` | timestamptz | 入库时间 | 否 | 330/330 | 排序兜底 | 保留 |
| 27 | `rotation` | int | 旋转角 | 否 | — | 图片方向 | 保留 |
| 28 | `title_i18n` | jsonb | 三语标题 | 是 | — | 无 | **启用**或停用 |
| 29 | `caption_i18n` | jsonb | 三语说明 | 是 | — | 无 | **启用**或停用 |
| 30 | `excerpt_i18n` | jsonb | 三语摘要 | 是 | — | 无 | **停用** |
| 31 | `source_url` | text | 原始来源 URL | 是 | **18/330** | 灯箱来源链接 | **启用（重点补写）** |
| 32 | `source_platform` | text | 来源平台 | 是 | 18/330 | 图库筛选/标注 | 同上 |
| 33 | `source_account` | text | 来源账号 | 是 | 0/330 | 标注 | 同上 |

### gallery_assets 新增字段

| 字段 | 类型 | 可空 | 用途 |
|---|---|---|---|
| `file_hash` | text | 是 | 去重；唯一索引 `where file_hash is not null` |
| `source_post_id` | text | 是 | 原帖 ID，与 source_url 配套 |

## 3. `profiles`（2 行 / 9 列）

| 字段 | 类型 | 含义 | 覆盖 | 处置 |
|---|---|---|---|---|
| `id` | uuid PK | 人物标识 | 2/2 | 保留 |
| `name` | varchar | 本名 | 2/2 | 保留 |
| `nickname` | varchar | 艺名 | 2/2 | 保留 |
| `birthday` | date | 生日 | 2/2 | 保留 |
| `bio` | text | 简介 | — | 保留（新增 `bio_i18n` 并存） |
| `avatar_url` | text | 头像 | 0/2 | **启用（补图）** |
| `ig_handle` | varchar | Instagram | 2/2 | 保留 |
| `x_handle` | varchar | X | 2/2 | 保留 |
| `created_at` | timestamptz | 创建时间 | 2/2 | 保留 |

新增：`slug`、`bio_i18n`、`role_label`。

## 4. 新建表字段

### `project_people`

| 字段 | 类型 | 说明 |
|---|---|---|
| `project_id` | uuid | FK → projects，级联删除 |
| `profile_id` | uuid | FK → profiles，级联删除 |
| `role` | text | `subject` / `photographer` / `host` / `guest` |

### `works`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid | 主键 |
| `title` | text | 作品名 |
| `title_i18n` | jsonb | 三语名 |
| `kind` | text | `series` / `film` / `stage_play` / `other` |
| `year` | int | 年份 |
| `external_url` | text | 官方页/观看页 |
| `created_at` / `updated_at` | timestamptz | 时间戳 |

## 5. 必填规则（发布门槛）

| 层级 | 规则 | 违反时 |
|---|---|---|
| 项目发布 | `title` 非空 | 不可发布 |
| 项目发布 | `category` 属于 8 值枚举 | 不可发布 |
| 项目发布 | 至少 1 张 `gallery_assets` | 不可标记为可浏览项目，保持容器态 |
| 项目发布 | `cover_url` 或存在 `is_cover` 图片 | 回退到首图，仍无则用渐变底 |
| 项目发布 | `slug` 唯一 | 由系统生成，冲突时加后缀 |
| 图片入库 | `image_url` 非空、`project_id` 非空 | 不可入库 |
| 图片入库 | `source_url` 缺失 | **允许**，标记 `source_missing`（不阻断，不伪造） |
| 日期 | `event_date` 不确定 | **留空**，禁止用 `created_at` 或当天日期填充 |

## 6. 明确禁止的填充方式

1. 用 `created_at::date` 或 `now()` 写 `event_date`。
2. 为缺失来源编造平台或账号。
3. 用 `catalog_id` 或 UUID 当卡片主标题。
4. 用 `curation_status='published'` 掩盖没有图片的项目。
