# LMSY.space 统一入库数据契约（阶段 3 交付物 2）

- 日期：2026-10-17
- 上位文档：ADR-001（内容模型基准）。本文把 ADR 落到「字段如何进库」的可执行规则，所有入库入口（E1-E9，见阶段 3 审计报告）必须遵守。
- 原则：以现有 schema 为准，不新增必填、不改枚举、不发明语义。

## 1. 正式图片（gallery_assets）字段契约

| 字段 | 必填 | 取值来源 | 允许空 | 由谁维护 | 写入前验证 | 缺失处理 |
|---|---|---|---|---|---|---|
| `image_url` | **必填**（NOT NULL） | R2 公开 URL（上传结果或既有对象 URL） | 否 | 写入入口 | 非空；作为唯一去重键做等值预检查 | 拒绝请求 400 |
| `catalog_id` | 条件必填 | 共享分配器 `allocateNextCatalogId()`；仅「调用方显式指定」时可旁路（格式校验 `LMSY-[A-Z]+-\d{8}-\d{3}`） | 是（历史 NULL 合法，不回填） | 写入入口；DB 唯一索引为最终权威 | 自动生成路径：无（分配器保证格式）；显式路径：格式正则 | 分配失败即失败，**不得**用数组索引/临时计算值充当正式编号 |
| `project_id` | 条件必填 | 表单/草稿携带 | 是（无归属资产合法） | 写入入口 | **显式查询 projects 表验证存在**（to-gallery 已做；admin/gallery POST 本阶段补齐）；不存在→404，禁止自动造项目兜底 | 晋升路径：无归属→400 拒绝（草稿留原地）；API 路径：允许 NULL |
| `event_date` | 否 | 表单/草稿/编号日期段 | 是 | 写入入口 | 格式 `YYYY-MM-DD`；晋升路径回退当日（现状保留） | NULL 允许 |
| `title` / `title_i18n` | 否 | 表单或草稿 title（本地化回退链 en→zh→th） | 是 | 写入入口 | 空串归一为 NULL | NULL |
| `caption` / `caption_i18n` | 否 | 同上（现状：晋升时 caption=title‖description 非空兜底） | 是 | 写入入口 | 空串归一 | NULL / '' |
| `excerpt` / `excerpt_i18n` | 否 | 草稿 chronicle_excerpt/描述 | 是 | 写入入口 | normalizeLocalizedText | NULL |
| `tag` | 否 | **仅人工显式指定**；枚举未定（ADR D3）前晋升路径恒 NULL | 是 | 站长 | 枚举拍板前不写自动值 | NULL；**严禁**从 draft.tags、来源平台名搬运 |
| `category_tag` | 否 | 人工指定 | 是 | 站长 | CHECK：official_stills/bts/press_events 或 NULL | NULL |
| `source_url` / `source_platform` / `source_account` | 否 | 草稿 provenance（buildProvenanceFields：trim、空→NULL） | 是 | 采集→审核→晋升链路 | 空值归一为 NULL；unknown 保持 NULL，不伪造 | NULL |
| `blur_data` | 否 | generateBlurData | 是 | 写入入口 | 生成失败→NULL（不阻断） | NULL |
| `is_featured` / `is_cover` / `is_editorial` | 否 | 表单/草稿 | 否（NOT NULL，默认 false） | 写入入口 | 布尔归一 | 默认值 |
| `milestone_priority` | 否 | 仅 milestone 管理 API | 是 | milestone API | — | NULL |
| `integrity_status` / `display_role` | 否 | 晋升写常量 'ok'/'regular'（现状保留） | 否 | 写入入口 | CHECK 约束 | 默认值 |
| `rotation` | 否 | curate UI | 否 | curate API | CHECK 0/90/180/270 | 0 |
| `magazine_issue` | 否 | **未启用**（ADR D7），任何入口不得写入 | 是 | — | — | NULL |

**语义四分（ADR D3，红线）**：作品类别=projects.category；图片分类=gallery_assets.tag；图片用途=category_tag；来源=source_*。互相代用即为缺陷。

## 2. 项目关联规则（所有正式写入路径）

1. 凡写入 `project_id` 的路径，必须先 `projects` 表存在性校验；失败返回明确 404/400，不得静默置 NULL 或造临时项目掩盖。
2. `portal_visible=false` 的项目**仍可接收资产**（后台可编辑性 ≠ 前台可见性，ADR D1/D4）；不得以可见性为由拒绝入库。
3. 采集阶段无法判定归属的素材保留在草稿（project_id NULL），晋升时才强制要求归属——晋升是归属确认点。

## 3. 持久编号规则（ADR D5）

- 唯一实现：`lib/catalog-id.ts` 的 `allocateNextCatalogId()` + `CATEGORY_TO_CATALOG_PREFIX`（series→STILL、editorial→MAG、appearance→STAGE、daily→DAILY、travel→TRV、commercial→AD、无项目→G）。手动上传（E2）与晋升（E6）已共用；新入口一律复用，禁止再写内联实现。
- 非原子性由 DB 兜底：`gallery_assets_catalog_id_key`（UNIQUE，本轮实证存在）→ 23505 → `isCatalogIdConflict()` 识别 → 重分配重试（≤`CATALOG_ID_MAX_ATTEMPTS`=5）。
- 只有 23505 可重试；其他 DB 错误直接失败上报，不得吞掉当作编号冲突。
- 手动指定编号（isCatalogLocked 场景）：格式正则校验；冲突不重试（尊重人工命名意图），直接报错。
- 禁止：数组索引式编号、按列表位置计算、展示层自造编号。
- 历史 18 条 NULL 不回填（禁止事项）。

## 4. 草稿（draft_items）字段契约

| 字段 | 规则 |
|---|---|
| `source_url` / `source_platform` | CHECK `draft_items_source_platform_required`：两者同有或同无。采集路径两者必填（ingest 400 校验）；**manual 上传路径两者皆 NULL**，'manual' 标记写 `tags[0]` |
| `file_hash` | 采集路径必存；partial UNIQUE 索引兜底；重复→幂等返回已有草稿（ingestion_stage='duplicate' 仅在响应体，不入库） |
| `event_date` / `raw_event_date` | 采集事件：发送/发布时间只入 raw_event_date（证据），event_date 待人工确认（telegram 已实施）；RSS cron 的 pubDate 两者都写（现状保留，源休眠） |
| `tags` | 渠道词/原始 hashtag 存放区（ADR D3）；**不是**正式分类 |
| `status` | CHECK 5 值；写入点：ingest='draft'、publish/batch-publish='published'、unpublish='draft'；**晋升当前不改 status**（P1-3，待决策） |
| `ingestion_stage` | pending→translating→ready（失败：failed；download_failed/db_write_failed 仅在响应） |
| `chronicle_*` | 编年史展示专用，入库流程不写（禁止事项：不动 Chronicle） |

## 5. 去重与幂等规则

1. **采集层**（draft_items）：`file_hash` 判重——先查后传（download→dedupe→upload），唯一索引兜底，R2 补偿删除。
2. **正式层**（gallery_assets）：`image_url` 等值判重为约定标准（无 URL 规范化；来源仅 R2 公开 URL，前缀一致）。串行幂等 = 预检查命中返回已有记录（`created:false`）；并发窗口依赖预检查存在竞态（P1-2），根治需 image_url 唯一索引（DDL 候选）。
3. **编号层**：catalog_id 唯一索引为最终权威，23505 重试。
4. 已有资产被识别为重复时，响应 `{success:true, created:false, data:<已有记录>}`（to-gallery 现状模式，供调用方区分）。

## 6. 失败与恢复（任务 E 基线）

- 无事务支持：**多步写入不假设整体回滚**。现状补偿模式：R2 成功 + DB 失败 → 删除刚上传的 R2 对象（upload、ingest、telegram、register 已实施）。
- 资产成功 + 草稿更新失败：to-gallery 无草稿更新步骤（P1-3 相关，见审计报告）。
- 部分成功：批量入口必须逐项报告（magazine 现状有 per-item 计数；batch-update 逐条 Promise 结果汇总）。
- 错误上报：一律 `apiServerError()`（服务端日志含定位标签，响应体不泄内部细节）。
