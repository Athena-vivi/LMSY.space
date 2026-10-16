# LMSY.space 项目状态盘点与第三阶段方案（图片数据批量更新）

- **日期：** 2026-10-16　**版本：** v1.1（按站长复核指令修订，修订记录见 §0）
- **性质：** 盘点 + 方案文档。两轮均为只读：未启动采集、未批量上传、未发布草稿、未修改任何生产数据。
- **证据约定：** 结论标注证据来源。本机网络无法到达 `lmsy.space` 与 `api.telegram.org`（实测 fetch failed，§1.5），所有「线上 HTTP」类验收列为待办，不用本地测试冒充生产验证。

## 0. v1.1 修订记录（对应站长复核指令六条要求）

| 指令要求 | 修订结果 | 主要依据 |
|---|---|---|
| §1 前两阶段收尾逐项列出权限/执行方式/验收证据 | 新 §1.6 收尾清单（四列表格） | git/探针/文档核对 |
| §2 来源丢失深度检查（字段映射/迁移/兼容/前台展示/回查） | 新 §3（替换原 §4.4 简述）：完整字段映射表 + 迁移方案 + 兼容性 + 测试方案 + 前台展示方案 | `to-gallery/route.ts` 全文、探针实测 18/330 可回查 |
| §3 日期/事件语义逐项核实 | 新 §4：九类语义字段对照表 + 系统性日期混用实证（30/30 电报草稿 event_date=采集日期） | webhook/ingest 代码 + 探针 |
| §4 历史回填范围核对 | 新 §5：**推翻 v1.0 记载——杂志回填已执行完毕**（312/312 已在库，0 缺失）；仅 2 组 20 张因无项目挂靠被有意跳过 | `backups/magazine-orphan-mapping-2026-10-15.json` 与生产库逐条比对 |
| §5 最小可行流程（自动/人工分工、批次追踪、幂等恢复） | 新 §7 | 现有管道代码 + 已验证的去重/幂等机制 |
| §6 交付要求（映射/生命周期/证据规则/兼容核对/分阶段验收/待批清单） | §3/§4/§5/§6/§7/§8/§9 对应覆盖 | — |

v1.0 中「X1 建议作为演练批先做」的建议**作废**（回填已执行，见 §5）。

---

## 1. 前两阶段收尾状态

### 1.1 版本与部署

| 项 | 状态 | 证据 |
|---|---|---|
| 分支 / 工作区 | `main`，工作区干净 | `git status --short --branch` |
| 最新提交 | `a5d6393`（v1.0 盘点文档）；`8a47a85`（扩展弃用裁定文档） | `git log --oneline -2` |
| 未推送 | 2 个纯文档提交未推送（GitHub 443 间歇不可达，本轮尝试推送返回 `Empty reply from server`） | `git rev-list origin/main..main --count` → 2；push 报错原文 |
| 生产代码版本 | `origin/main` = `8857e7d`（去重前移 + SSRF 黑名单）；`84c820e`/`b2813ee` 均为祖先（merge-base 验证通过） | git 祖先验证 |
| Vercel 部署 | 无法本机直验（网络+无凭据）；历史验收记录记载 `c797ff6`/`8857e7d` 已部署验证 | docs/FULL_AUDIT_REPORT_2026-10-16.md |

### 1.2 安全收尾（生产实证部分）

| 项 | 状态 | 证据 |
|---|---|---|
| RLS 生产生效 | ✅ 实测 | anon 读 `draft_items`/`admin_users` → HTTP 401；读公开表 → 200（探针） |
| 三个 phase1 迁移已应用 | ✅（间接功能证据） | telegram 草稿可入库（source_platform CHECK 含 telegram）；0 重复 catalog_id/file_hash/r2_media_url；列集与基线一致（OpenAPI）；`40c14be` 记录应用 |
| 采集链路在活 | ✅ 实测 | 最新 15 条草稿全 telegram 均带 R2 对象；10-15 20 秒批量入库 10 条；10 月累计 12 条 |
| 备份/异地/恢复演练 | ✅ 有产物 | `backups/db/`×4、`backups/r2/`×4、`restore-drill/`×4、offsite-report×2（最新 10-16 06:45/06:51） |
| R2 对账 | ✅ 实测 | 408 对象 / 383 引用 / 25 孤儿（与第二批验收持平，未增长）/ 0 悬空 |

### 1.3 性能优化（b2813ee）收尾结论

代码与本地验证完成（typecheck 0 / 单测 83/83 / 构建 exit 0 / 冒烟 51/51，历史记录）；`next.config.ts` 缓存头、图片尺寸预生成（`lib/image-dimensions.ts`）、sitemap 重写（`app/sitemap.ts`）均已入库。**缺口全部集中在「线上复测」**，归入 X2，无需新写代码。基线数字见 `docs/PHASE2_PERFORMANCE_REPORT.md`（424 行，含环境与方法说明），不作为线上体验结论。

### 1.4 已知未修问题

1. 动态详情页对不存在 id 渲染 not-found UI 但返回 HTTP 200（profiles/editorial/projects 同行为，审计已登记）。
2. `gallery` 灯箱不显示日期与来源（§3.4 详述）。

### 1.5 本机网络限制（影响验收方式）

`https://lmsy.space` 与 `https://api.telegram.org` 从本机均 fetch failed（本轮多次实测）。因此：生产 HTTP 行为、webhook 注册参数直查均列为待办。**这些项不得用本地测试替代**，网络可达后按下表逐项销项。

### 1.6 收尾清单（权限 / 执行方式 / 验收证据）

| # | 事项 | 需要的权限 | 执行方式 | 验收证据 |
|---|---|---|---|---|
| 1 | 补推 2 个文档提交 | 本机 git（已有） | 网络窗口内 `git push origin main` | `git rev-list origin/main..main --count` → 0 |
| 2 | U1 撤销 sbp_ 令牌 | Supabase Dashboard（站长） | Dashboard → Account → Access Tokens → Revoke | 站长确认；令牌失效后脚本无法再用其执行 SQL |
| 3 | U2 Vercel Production 环境变量核验 | Vercel Dashboard（站长） | 核对 `ADMIN_EMAIL`/`TELEGRAM_WEBHOOK_SECRET`/`CRON_SECRET`/`INGEST_API_KEY`/`TELEGRAM_BOT_TOKEN`/`OPENROUTER_API_KEY` 与 `.env.local` 同值 | 站长回填核对结果到本表 |
| 4 | U3 Telegram webhook 注册参数核验 | 可达 api.telegram.org 的网络 | `npx tsx scripts/setup-telegram-webhook.ts status`（只读子命令） | URL=`https://lmsy.space/api/webhooks/telegram`、last_error 为空、pending 正常；**功能已在活的强间接证据**：草稿持续到达 + secret 不匹配会全拒 |
| 5 | U4 Supabase 平台备份/PITR 核验 | Dashboard（站长） | Database → Backups 查看每日备份与 PITR 选项 | 把实际保留期/是否含 PITR 回填本文档 |
| 6 | X2 线上验收套件 | 可达 lmsy.space 的网络 | 跑既有冒烟脚本指向生产 + 手工回归清单 + 抓缓存头/sitemap/robots + 非法请求探测（webhook 无 secret→401/503、cron 无 secret→同、ingest 无 key→同） | 每项留 HTTP 状态码与输出记录；结果回写审计报告 |
| 7 | B3-T3 RSS 死通道注释 | 本机开发 | 一处代码注释（为什么禁、启用前必须产品化两个测试参数） | 提交 + 单测全绿 |
| 8 | B3-T1 webhook 持久错误记录 + chat 白名单 | 本机开发 | 代码 + 单测（建议并入第三阶段管道批，§9） | 失败记录可从持久位置查到；白名单未配置时行为不变 |
| 9 | 动态页 200/404 语义修正 | 本机开发 | 各详情页 notFound() 分支（低优先级） | 不存在 id 返回 404 状态码 |

---

## 2. 图片数据系统现状（只读盘点，2026-10-16 探针）

### 2.1 表与规模

| 表 | 行数 | 角色 |
|---|---|---|
| `gallery_assets` | 330 | 发布图库（前台唯一公开图源） |
| `projects` | 25 | 项目/图集/杂志期实体 |
| `draft_items` | 71（65 draft / 6 published） | 采集草稿（weibo 35 / telegram 30 / twitter 6） |
| `profiles` | 2 | 人物档案（与图片无外键关联） |
| `chronicle_events` | 0 | 编年史事件（结构闲置） |
| `site_content_blocks` | 4 | 站点文案块 |

### 2.2 数据卫生

- `gallery_assets`：event_date 缺失 **0**；caption_i18n 缺失 **318/330**；catalog_id 缺 18；title 缺 15；重复 image_url **0**。
- `draft_items`：source_url / event_date / title 缺失均为 **0**；重复 r2_media_url **0**。
- R2：408 对象，383 被引用，25 孤儿（稳定），0 悬空引用（`npm run audit:r2` 本轮实测）。

---

## 3. 发布后的来源丢失（深度检查结果）

### 3.1 转正流程实际复制的字段（`app/api/admin/drafts/[id]/to-gallery/route.ts` 全文核对）

草稿转正走 `to-gallery`（insert 进 `gallery_assets`，前置条件：必须已挂 `project_id`）。字段映射实测如下：

**已复制（draft_items → gallery_assets）：**

| 草稿字段 | 资产字段 | 说明 |
|---|---|---|
| `r2_media_url` | `image_url` | |
| `title` / `description` | `title`(+`title_i18n`) / `excerpt`(+`excerpt_i18n`) / `caption`(+`caption_i18n`) | pickLocalizedText 取 en→zh→th 首个非空 |
| `tags[0]` | `tag` | **语义有损**：telegram 草稿 tags=['Telegram', chatType, chatName]，转正后 tag 固定为 'Telegram'（生产 3 条 'Telegram' 标签图即此来源） |
| `is_featured` | `is_featured` | |
| `project_id` | `project_id` | |
| `event_date` | `event_date` | |
| —（常量） | `integrity_status='ok'`、`display_role='regular'` | |

**未复制且无处安放（丢失）：** `source_url`、`source_platform`、`source_post_id`、`raw_event_date`、`tags`（完整数组）、`file_hash`、`media_metadata`、`curator_note`、`chronicle_*`。其中 `source_url`/`source_platform` 是**表上根本没有对应列**，其余是有列但转正代码未带。

另一条发布路径 `publish`（status='published'）只改草稿状态，不产生 `gallery_assets` 行；而 `draft_items` 对匿名完全不可读（RLS 401 实测），所以 status=published 的 6 条草稿对公众不可见——**公开图库的唯一入口就是 to-gallery**，溯源断链发生在这一步。

### 3.2 已发布图片今天能否回查来源（探针实测）

- 按 `gallery_assets.image_url == draft_items.r2_media_url` 归一化匹配：**330 张中仅 18 张能回查到草稿及其 source_url**（即 18 个仍在 `draft/` 前缀的资产）。
- 其余 **312 张（全部为 `magazines/*` 杂志页，§5）完全无草稿踪迹**，原始出处目前无处可查——只有 catalog_id（如 `LMSY-AD-20240214-001`）隐含期号与日期。
- 结论：**现状追溯率 18/330 ≈ 5%**。这是第三阶段要解决的核心缺口。

### 3.3 迁移方案与兼容性分析（待批准，未执行）

**迁移文件：`supabase/migrations/20261016_add_source_provenance.sql`**（新建，进版本库，不在 Dashboard 手改）

```sql
-- 1) nullable new columns; existing rows untouched
ALTER TABLE lmsy_archive.gallery_assets ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE lmsy_archive.gallery_assets ADD COLUMN IF NOT EXISTS source_platform text;
ALTER TABLE lmsy_archive.gallery_assets ADD COLUMN IF NOT EXISTS source_account text;
COMMENT ON COLUMN lmsy_archive.gallery_assets.source_url IS 'Original public page URL this image came from; NULL = unknown/legacy';

-- 2) idempotent one-time backfill for rows whose provenance is still
--    recoverable via the draft queue (measured scope: 18 rows)
UPDATE lmsy_archive.gallery_assets ga
SET source_url = d.source_url,
    source_platform = d.source_platform
FROM lmsy_archive.draft_items d
WHERE d.r2_media_url = ga.image_url
  AND ga.source_url IS DISTINCT FROM d.source_url;
```

**兼容性分析：**
- 三列均可空、无默认值、无约束 → 不影响任何现有 INSERT/SELECT；前台与 admin 现有查询不受影响。
- RLS：新列随表的 `phase1_public_read` SELECT 策略自动生效，无需额外策略；写仍走 service_role。
- 语义：NULL = 「来源未知（历史数据）」，不是错误状态；前台对 null 隐藏来源区块（见 3.4）。
- 回填范围实测锁定为 18 行（§3.2），幂等（`IS DISTINCT FROM`），重复执行无副作用。

**待批改动 2（转正代码）：** `to-gallery` select 与 insert 各加 `source_url`、`source_platform`、`source_account`（草稿侧账号暂从 tags 提取或置 null，实施时定）；`publish`/`create-project`/`link-project` 路径如同样产出资产则同批对齐——实施时先核对调用图，本轮未改。

**测试方案：**
1. 单测：to-gallery 转正后资产含来源字段；无来源草稿（null）转正 → 列为 null 不报错。
2. 迁移后探针：列存在、18 行回填值与对应草稿一致、其余行 NULL、总行数不变（330）、audit:r2 结果不变。
3. 本地 `next start` 真实走一次 draft→to-gallery→前台可见来源链接。
4. 回滚：迁移纯增量（DROP COLUMN 即回滚）；代码单提交 revert。

### 3.4 前台展示原始出处的方案（待批准）

- **灯箱（`app/gallery/lightbox.tsx`）**：现展示 caption/tag/catalog_id（grep 实证，无日期无来源）。在 catalog_id 行下方加「来源」行：`source_url` 非空时渲染外链（新标签页打开原文）；`source_url` 为空时**整行不渲染**（历史图不显示空占位）。
- **项目详情页**：可选在图章信息里带同一来源链接（第二期，不阻塞）。
- 不新增任何接口；数据随现有 gallery 查询返回（三小列）。

### 3.5 后台/数据库回查来源的三层能力（方案）

1. 草稿阶段：`draft_items.source_url` 直接可查（现状已有）。
2. 发布阶段：迁移后 `gallery_assets.source_url` 可查。
3. 历史无来源的 312 张：无草稿、无来源列 → **只能靠 catalog_id/组号人工定位期号**（现状极限，明确标注为「来源未知」，不编造）。

---

## 4. 图片数据语义逐项核实（指令 §3）

### 4.1 九类语义 × 现有字段 × 现状

| 语义概念 | 现有承载 | 允许为空？ | 现状核实结果 |
|---|---|---|---|
| 事件名称/描述 | 无专列。靠 `projects.title/description`（项目=事件容器）+ `caption`；草稿有 `chronicle_title/excerpt` 但编年史实体 0 行闲置 | — | 事件=project 的模型成立（330 张图全部有 project_id，探针实证） |
| **事件实际发生日期** | `gallery_assets.event_date`、`draft_items.event_date`（schema 均为可空 `date`，无 NOT NULL） | ✅ 允许 | **数据 100% 有值，但证据链缺失**（见 4.2 系统性混用实证） |
| **原始内容发布日期** | `draft_items.raw_event_date`（仅草稿有；转正**不带走**，资产表无对应列） | ✅ | 30/30 电报草稿 raw=event 同值（webhook 代码把 message.date 同时写进两列） |
| **图片采集日期** | `draft_items.created_at`、`gallery_assets.created_at` | NOT NULL | 正确分离，无问题 |
| 来源链接 | `draft_items.source_url`（资产表无列，§3） | ✅ | 发布即丢（18/330 例外） |
| 来源平台 | `draft_items.source_platform`（有 CHECK 约束含 8 平台；资产表无列） | ✅ | 同上 |
| 发布账号 | **无任何专列**；仅散落在 `draft_items.tags` 数组尾部（telegram: chatName） | — | 结构性缺失；建议随 §3.3 迁移加 `source_account text` 可空列（待批） |
| 人物↔事件关联 | 无人物实体关联（profiles 2 行与图片无外键）；靠 project 隐含 | — | 维持「人物≈常量（LMSY）」模型，不建关联表 |
| 已核实 vs 推测 | `gallery_assets.integrity_status`（'ok'/'unchecked'）、`curator_note` 自由文本 | ✅ | 无结构化证据字段；推测信息无处规范标注，靠 curator_note 约定 |

### 4.2 日期证据现状（探针实测，问题量化）

- **30/30 条 telegram 草稿：`event_date` == 采集/发送日期**（webhook 代码 `event_date: new Date(message.date*1000)` —— message.date 是**发送到 Telegram 的时刻**，不是事件发生日）。前天批量 10 张全部被打上 2026-10-15，实际拍摄日期未知。
- 其余平台草稿 41 条中 40 条同样 event_date == created_at 日期。
- `raw_event_date` 与 `event_date` 0/30 不一致（同源同值，未起到分离作用）。
- `gallery_assets.event_date` 100% 有值但**无任何证据字段**可考；唯一例外是 312 张杂志页——日期来自期号（`LMSY-AD-20240214` → 2024-02-14，写于回填映射），属有依据的推定。

**结论：现有数据的 event_date 实质是「发布/采集日期冒充」。历史数据不回改（无证据可考，回改即编造），但管道必须改。**

### 4.3 日期与事件信息的证据规则（第三阶段起执行）

1. `event_date` 允许为空；**空=未知**。前台已兼容：项目详情按 event_date 分章的代码会 filter 掉空值（`project-detail-client.tsx:96` 实证）；灯箱对空值不渲染日期行。
2. **禁止**把网页发布日期、文件名、采集时间写入 `event_date`。三者各归各位：`raw_event_date`（原文日期串；仅当原文明确说「这是 X 月 X 日的活动」才据此填 event_date）、`created_at`（采集）、`source_url`（证据）。
3. Telegram 管道修正（待批改动 3）：webhook 不再把 `message.date` 写进 `event_date`——改为 `event_date: null`、`raw_event_date: <ISO(message.date)>`，caption 中有明确日期时由**人工审核**填 event_date。
4. 推测性信息一律写 `curator_note` 并带前缀「推测：」，与 `source_url`（证据）分离；无来源的图不得发布（§7 流程门禁）。
5. 历史数据：不回改、不删除；`source_url IS NULL` 即「来源未知」的明确标记。

---

## 5. 历史回填范围核对结果（指令 §4，**推翻 v1.0 记载**）

### 5.1 核对方法

以 `backups/magazine-orphan-mapping-2026-10-15.json`（generatedAt 2026-10-15T07:29Z，mode=apply）为基准，逐条与生产 `gallery_assets` 按 `image_url` 归一化比对（本轮探针，全表 330 行）。

### 5.2 映射文件实际内容

- 19 个组 / 332 页：AD×5、MAG×10、STAGE×1、STILL×1、TRV×2；`rowsToInsert` 312 条；`pendingGroups` 2 组（AD-20251216、TRV-20251216，即 332-312=**20 张**，生成时因无可挂靠项目被有意跳过）。
- 每条计划行含：image_url、title/caption（`<Project> - Page NNN`）、catalog_id（`LMSY-<TYPE>-<ISSUEDATE>-<SEQ>`）、project_id（目标项目）、event_date=期号日期、tag。

### 5.3 与生产数据比对结果

| 指标 | 结果 |
|---|---|
| 计划 312 条中已在 `gallery_assets` | **312/312（100%）**，且 project_id 全部就位 |
| 缺失待补 | **0** |
| 在库但无项目挂靠 | 0 |
| 当前 `magazine_issue` 有值但无 project 的孤儿 | 0 |

### 5.4 结论

1. **X1 杂志回填已经执行完毕**（312 张全部落库且按计划挂靠项目）。v1.0 与此前 REMEDIATION_PLAN 中「X1 待 D3 决策、脚本已就绪未跑」的记载**过时**，以本节为准。
2. **严禁重复执行回填**——脚本虽幂等（skippedAlreadyPresent 机制），重跑无意义且违反站长约束；本报告明确建议不重跑。
3. 真正剩余的未处理项只有 **2 组 20 张**（AD-20251216、TRV-20251216）：当年因「无项目可挂靠」被跳过。若要处理，需先为这两期**补建项目**再生成增量映射——列为待站长决策，不默认执行。
4. 「283 张」旧数字与实际不符：准确口径是 **312 张已处理 + 20 张待决策**。
5. 文档追溯：`PRODUCTION_DATA_CHANGES.md` **不存在**（根目录与 docs/ 均无）；曾有的 `PRODUCTION_CONFIG_CHANGES.md`（配置类，84c820e 添加）已在 3b51cc0 文档整合时归档删除。生产数据变更记录目前只散见于审计报告与 backups/ 产物——**建议第三阶段起每批生成 `reports/batch-<id>.json` 并建立 `docs/PRODUCTION_DATA_CHANGES.md` 台账**（待批改动 6）。

---

## 6. 当前数据模型 → 目标数据模型

| 概念 | 现状 | 目标 | 改动类型 |
|---|---|---|---|
| 图片资产 | `gallery_assets`（30 列） | 不变，+`source_url`、`source_platform`、`source_account`（三列均可空） | 迁移 1 |
| 草稿溯源 | `draft_items.source_url/source_platform/source_post_id` | 不变（已够用） | 无 |
| 批次追踪 | 无 | `draft_items.batch_id text` 可空（应用生成 `bYYYYMMDD-NN`） | 迁移 2（可后置） |
| 事件/项目 | `projects` 承载；图必挂 project（to-gallery 强制） | 不变；`chronicle_events` 继续闲置 | 无 |
| 人物 | 无关联（LMSY 常量模型） | 不建关联表 | 无 |
| 日期 | event_date（混用）/raw_event_date（同值）/created_at | event_date=事件日期（可空）、raw_event_date=原文日期、created_at=采集 | 管道代码修正（无迁移） |
| 证据/推测 | curator_note 自由文本 + integrity_status | 同左 + 「来源必有链接」门禁；推测写 note 带前缀 | 流程约定 |

**明确不建：** 人物关联表、编年史启用、批量采集工作台 UI、独立事件表。优先复用现有结构，缺口只剩三列 + 代码行为。

---

## 7. 批量更新最小可行流程（指令 §5）

```
发现来源 → [脚本] 提取图片+上下文(标题/原文日期/原文链接/账号)
  → [脚本] 逐张调 /api/ingest（带 batch_id 标记）
      下载 → file_hash 去重(唯一索引兜底) → R2 → draft_items（source_url 必填才入库）
  → [人工] 后台按批次审：核对来源链接可达、补 project_id、确认/修正 event_date
  → [人工] to-gallery 转正（迁移后自动带 source_url）
  → [自动] 前台展示 + 任意一张图可回查原始出处
```

**自动 vs 人工分工：**

| 步骤 | 方式 | 说明 |
|---|---|---|
| 页面抓取、图片提取、去重、下载、R2、写草稿、批次报告 | **自动** | 每源一个适配器脚本；hash 唯一索引兜底 |
| 来源链接可达性核对 | **人工**（点开即查） | 自动死链巡检登记为后续观察项，本期不做 |
| project_id（事件归组）、event_date 确认、人物归组 | **人工** | 审核台操作；无来源或事件背景完全空白的记录停草稿态不发布 |
| 转正、前台展示 | 自动（审核动作触发） | to-gallery 现有机制 |

**批次追踪与统计：** 每批一个 `batch_id`；脚本跑完输出 `reports/batch-<id>.json`：`{total, ingested, duplicate, failed[], missing_fields[]}`；后台按 `draft_items.batch_id` 过滤即可核对「这批进了多少、状态如何」。**不建新表**（batch_id 列 + 报告文件足够）。

**失败恢复与幂等：**
- 重跑同一批 = 逐张过完整管道，已入库的命中 file_hash 唯一索引/source_url 去重自动跳过 → **重复执行不产生重复记录**（机制已端到端实测：重灌既有 URL → duplicate，R2 对象数不变）。
- 单张失败不影响其余（ingest 逐条返回终态）；失败清单进批次报告，修复后单独重跑失败子集。
- 上传成功但写库失败：补偿删 R2 对象（webhook/ingest 均已实现，代码实证）。
- 批与批之间可停，人工审核是硬门禁，自动流程永不直接发布。

**小批量验证门禁：** 首批 ≤20 张、单来源；追溯率 100%（每张发布后有 source_url 且可点开）、事件日期错误 0（空可、错不可）、失败率 <10%、`audit:r2` 孤儿不增长 → 达标才扩到 50 张/批并加第二来源。

---

## 8. 需要站长批准的数据库迁移与功能改动清单

| # | 类型 | 内容 | 影响 | 状态 |
|---|---|---|---|---|
| 1 | **迁移** | `gallery_assets` 加 `source_url`、`source_platform`、`source_account` 三列（均可空）+ 幂等回填 18 行草稿来源 | 纯增量；旧行 NULL=来源未知；无破坏性 | 待批 |
| 2 | 代码 | `to-gallery` 转正携带上述来源字段（同批核对 create-project/link-project 路径） | 转正行为增强，向后兼容 | 待批 |
| 3 | 代码 | Telegram webhook 日期语义修正：`event_date=null`、`raw_event_date=message.date`，caption 明示日期才人工填 | 新草稿 event_date 变空（前台已兼容空值）；**更诚实** | 待批 |
| 4 | 代码 | 灯箱加「来源」外链行（null 不渲染）；日期空值处理 | 纯展示 | 待批 |
| 5 | 迁移（可后置） | `draft_items` 加 `batch_id text` 可空 | 纯增量 | 待批（可与 1 同批） |
| 6 | 文档 | 建立 `docs/PRODUCTION_DATA_CHANGES.md` 生产数据变更台账 + 批次报告约定 | 仅文档 | 待批 |
| 7 | 决策 | 2 组 20 张（AD/TRV-20251216）补建项目后回填，或维持跳过 | 涉及新建 2 个项目 | 待站长定 |
| 8 | 决策 | 首批试运行来源（具体站点/专题页 URL），或先用 Telegram 人工推 10 张零开发演练 | — | 待站长定 |

**明确不做：** 不重复执行杂志回填；不删除/覆盖历史图片与归档数据；不启用 chronicle_events；不建采集 UI；不抓登录墙/付费内容；不加自动重试/兜底机制（能用的不乱动）。

---

## 9. 实施顺序（批准后执行，批间可停）

1. **收尾包**：补推 2 个文档提交；B3-T3 注释；§8 批准后出迁移 1 + 改动 2/3/4（单提交，含单测）。
2. **验证**：迁移执行 → 探针复测（列存在/18 行回填/总行数不变/audit:r2 不变）→ 本地 draft→to-gallery→前台全链路一次。
3. **管道批**：batch_id 迁移 + ingest 携带 batch_id + 批次报告脚本；B3-T1 顺带。
4. **首采批**：≤20 张试运行 → 批次报告 → 人工审核 → 发布 → 验收四指标（追溯率/日期/失败率/孤儿数）。
5. **台账**：建立 PRODUCTION_DATA_CHANGES.md，回填本次核对结论。
6. **网络可达时**：X2 线上验收销项 + U3 status 核验。

---

## 10. 本轮结束状态自查（v1.1）

- 未启动采集 ✅｜未批量上传 ✅｜未发布草稿 ✅｜未修改生产数据、未执行任何迁移 ✅｜未重复执行历史回填 ✅
- 本轮变更：仅本文档（v1.0 → v1.1 修订）+ 只读探针脚本（`temp/`，不入库）
- 待站长：§8 的 8 项批准/决策；§1.6 的用户侧核验（U1/U2/U4）
