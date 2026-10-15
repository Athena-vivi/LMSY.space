# LMSY.space 生产收尾报告：数据安全、数据库迁移与线上验收

- **日期：** 2026-10-16
- **仓库：** `Athena-vivi/LMSY.space`　**分支：** `main`
- **执行前 HEAD：** `0b742e93…`（报告回填提交）
- **下一阶段基线：** `b2813ee`（第二阶段性能改动）
- **本次目标：** 关闭第一阶段遗留的生产安全缺口，补齐数据库迁移，核验部署与备份，并对第二阶段改动做生产验收。

> 说明：本机网络在此次执行期间对 `lmsy.space`、`*.vercel.app`、`api.telegram.org`
> 全部不可达（连接超时，HTTP `000`），而 Supabase REST、R2 S3、GitHub API、
> `cdn.lmsy.space` 可达。凡需要线上 HTTP 的项均已如实标记为**阻塞**，未用本地
> 结果冒充生产结果。

---

## A. 数据权限修复

### A.1 修复前的问题（本次实测，非引用旧报告）

2026-10-16 06:35 GMT+8，仅使用仓库中的**公开 anon key**（与浏览器访问完全相同的身份）
对生产 PostgREST 发起只读探测：

| 表 | HTTP | 返回行数 | 判定 |
|---|---|---|---|
| `draft_items` | **200** | **3** | **泄露** —— 返回真实未发布草稿 |
| `admin_users` | 200 | 0 | 表当前为空，但权限未收紧 |
| `gallery_assets` | 200 | 3 | 公开读取正常 |
| `projects` | 200 | 3 | 公开读取正常 |
| `site_content_blocks` | 200 | 3 | 公开读取正常 |
| `gallery` | 200 | 0 | 空表 |
| `chronicle_events` | 200 | 0 | 空表 |

`draft_items` 返回的字段包含 `source_url`、`source_platform`、`source_post_id`、
`r2_m…` 等。其中 `source_url` 为私有 Telegram 频道链接（`t.me/c/…` 形式）。
**按指令要求，本报告不复制该链接的完整值。** 这确认了问题**依然存在且可被任何人
利用**：拿到仓库里公开的 anon key 即可列出未发布草稿。

匿名写入不受影响（此前已确认）：对 5 张表的 INSERT 探测全部被拒（HTTP 404，
PostgREST 对无权限目标的响应），即 anon **没有任何写权限**。缺的只是读取加固。

### A.2 迁移执行结果

**状态：未执行 —— 被凭据阻塞。** 详见 B 节。执行通道已完全就绪，支持三种方式
（数据库密码 / 管理 API Token / 手工粘贴 SQL），一旦拿到任意一种即可完成。

#### 为什么项目 API Key 不够 —— 三类凭据的区别

这一点值得单独说清楚，因为「给个 API 就行」在这里不成立，取决于是哪一类 API：

| 凭据 | 作用面 | 能执行 DDL 吗 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` | **PostgREST**（项目数据面，`<ref>.supabase.co/rest/v1`） | **不能** |
| `SUPABASE_ACCESS_TOKEN`（`sbp_…` 个人访问令牌） | **Management API**（控制面，`api.supabase.com`） | **能** |
| `SUPABASE_DB_PASSWORD` / `DATABASE_URL` | **Postgres 直连**（连接池 5432/6543） | **能** |

前两个容易被混为一谈，但它们是两套完全不同的服务。PostgREST 只把表、视图和存储函数
映射成 HTTP 端点，能做的只有**增删改查行**和调用函数；`CREATE` / `ALTER` / `GRANT` /
`CREATE POLICY` / `CREATE INDEX` 一律不支持——这是设计使然，把 DDL 暴露到 HTTP 上是
灾难性的。我实测确认了生产只暴露三个 RPC（均非 SQL 执行器）：

```
/rpc/get_translation  /rpc/set_translation  /rpc/normalize_url
```

所以本报告的结论不变：**anon / service_role key 修复不了这个漏洞**。

需要的是后两者之一。已实测 `api.supabase.com` 在本机**可达**（未带令牌时返回
HTTP 401），`POST /v1/projects/{ref}/database/query` 通路已接通并用无效令牌验证过
会明确报 `HTTP 401: JWT could not be decoded`（失败得很大声，不会假装成功）。

**两条路线的取舍：**

- **Token（推荐）**：不用交出数据库密码；可创建**作用域受限**的令牌（仅本项目、
  仅 `database_write`、短有效期），用完在 Dashboard 撤销即可，爆炸半径可控。
  代价是账号级凭据，且该端点官方标注为 **Beta**。
- **数据库密码**：作用域仅限这一个数据库，语义更干净，且 `RAISE NOTICE` 能回传；
  但属于长期凭据，轮换更麻烦。

脚本现在自动选择：有 `SUPABASE_ACCESS_TOKEN` 就走 API，有 `DATABASE_URL` /
`SUPABASE_DB_PASSWORD` 就走直连，也可用 `--via=api` / `--via=pg` 强制。

### A.3 修复后的验证

尚未执行。已编写并在本地逐级验证过验证逻辑，凭据到位后将自动运行：

1. 库内验证：anon/authenticated 的写权限授权数、RLS 未启用表数、策略清单、
   两个唯一索引、`source_platform` CHECK 定义。
2. 行数前后比对（迁移不含 DELETE/UPDATE/TRUNCATE，任何变化即中止）。
3. **库外验证**：用同一把公开 anon key 重新请求 `draft_items` / `admin_users`，
   必须不再是「200 且有行」；同时确认 `gallery_assets` / `projects` /
   `site_content_blocks` 公开读取仍正常。若仍泄露，脚本以非零码退出并打印
   「MIGRATIONS APPLIED BUT THE LEAK IS STILL PRESENT」。

### A.4 普通用户与管理员

- **普通 authenticated 身份：** 迁移对 `anon, authenticated` **同时**收权，
  普通登录用户同样被排除。已由 `tests/migrations.test.ts` 断言保护。
- **管理员：** 迁移不触碰 `service_role`，后台照常绕过 RLS 工作；审核与发布流程
  未做任何改动。已添加断言：`REVOKE` 语句中不得出现 `service_role`。

### A.5 公开页面回归结果

**阻塞。** 站点不可达，无法做线上页面回归。库层面已确认三张公开表 anon 读取正常
（见 A.1 表），迁移后由 A.3 第 3 步复测。

---

## B. 三个数据库迁移

### B.1 执行前状态核验（不依赖旧报告）

生产 `lmsy_archive` 实际行数（service_role 只读统计，2026-10-16）：

| 表 | 行数 | 备注 |
|---|---|---|
| `gallery_assets` | 330 | 已是 30 列结构 |
| `projects` | 25 | |
| `draft_items` | 71 | |
| `admin_users` | 0 | |
| `site_content_blocks` | 4 | |
| `gallery` | 0 | |
| `chronicle_events` | 0 | |
| `schedule` | 不存在 | HTTP 404 |
| `members` | 不存在 | HTTP 404 —— 注意 `app/profiles/[id]` 仍在查询此表 |

PostgREST 暴露的 RPC 仅 `get_translation` / `set_translation` / `normalize_url`，
**没有任何可执行 DDL 的入口**。

约束前置条件（决定唯一索引能否创建）：

- `gallery_assets.catalog_id`：312 个非空值，**0 重复** → 可建唯一索引
- `draft_items.file_hash`：70 个非空值，**0 重复** → 可建唯一索引
- `draft_items.source_platform` 取值：`["telegram","twitter","weibo"]`
  → 已提交的 CHECK 不含 `telegram`，`data_integrity` 迁移正是补这个

### B.2 执行顺序调整及理由

指令建议按 baseline → integrity → hardening 执行，但要求「若执行顺序需要因依赖
关系调整，必须先检查三个文件的实际 SQL 及依赖，并记录调整理由」。

我逐行读过三个文件后的结论：**三者之间不存在依赖**。

- `rls_hardening` 只遍历 `pg_tables` 里 schema `lmsy_archive` 的表名，不读取任何
  由另两个迁移新增的列；
- `data_integrity` 只操作 `draft_items` / `gallery_assets`，二者在生产均已存在
  （71 / 330 行），且迁移角色不受 RLS 影响；
- `baseline` 全部是 `CREATE ... IF NOT EXISTS`。

因此**把安全加固提到第一位**（P0 优先），顺序改为：

1. `20261015_phase1_rls_hardening.sql` ← 关闭已确认的泄露
2. `20261015_phase1_baseline_gallery_assets.sql`
3. `20261015_phase1_data_integrity.sql`

该顺序已写入 `scripts/apply-phase1-migrations.mjs`，并由
`tests/migrations.test.ts` 断言固化，防止日后被无意改回。

### B.3 逐项执行状态

| 迁移 | 状态 | 结构核验 | 行数对比 |
|---|---|---|---|
| `20261015_phase1_rls_hardening.sql` | **未执行（阻塞）** | 待执行后核验 | 执行后自动比对 |
| `20261015_phase1_baseline_gallery_assets.sql` | **未执行（阻塞）** | 生产已是 30 列，迁移为 `IF NOT EXISTS`，不会重建或覆盖 | 执行后自动比对 |
| `20261015_phase1_data_integrity.sql` | **未执行（阻塞）** | 前置条件已核验（见 B.1） | 执行后自动比对 |

### B.4 迁移前保护（已落实）

- **最新逻辑备份：** `backups/db/2026-10-15T22-37-05-656`，9 表 / 432 行 /
  0.41MB，`manifest.ok = true`，逐表行数与期望值一致。执行脚本会检查该清单，
  `ok=false` 或超过 24 小时即拒绝运行。
- **内容复核：** 三个文件全部重读，并新增 15 条断言测试（见 D 节）。
- **兼容性：** 对不存在的 `schedule` / `members` 表，迁移按设计跳过而不报错。
- **异常恢复：** 每个迁移在独立事务中执行，失败即 `ROLLBACK`；行数漂移即中止。

---

## C. 环境变量与 Telegram

### C.1 Vercel Production 环境变量

**阻塞 —— 无法核验。** 本机无 Vercel 凭据（`~/.vercel/auth.json` 不存在，
项目内无 `.vercel/`），且 `lmsy.space` 与 `*.vercel.app` 均不可达，无法用行为
反推变量是否生效。

可确认的仅是**本地** `.env.local` 中存在以下变量名（**不记录任何值**）：

`ADMIN_EMAIL`、`NEXT_PUBLIC_ADMIN_EMAIL`、`CRON_SECRET`、`INGEST_API_KEY`、
`TELEGRAM_BOT_TOKEN`、`TELEGRAM_WEBHOOK_SECRET`、`NEXT_PUBLIC_SITE_URL`、
`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、
`SUPABASE_SERVICE_ROLE_KEY`、`R2_*`（5 项）。

本地存在 ≠ Vercel 已配置。需你在 Vercel Dashboard → Settings → Environment
Variables 逐项确认 `ADMIN_EMAIL`、`TELEGRAM_WEBHOOK_SECRET`、`CRON_SECRET`、
`INGEST_API_KEY`、`TELEGRAM_BOT_TOKEN` 均存在于 **Production** 环境。

按指令要求，`NEXT_PUBLIC_ADMIN_EMAIL` 兼容逻辑**已保留，未删除**。

### C.2 Telegram Webhook

**阻塞 —— 网络不可达。** `api.telegram.org` 返回 `000`（连接超时），
`scripts/setup-telegram-webhook.ts` 无法执行。本机执行结果不能作为「注册成功」的
证据，故本项标记为待完成。

顺序要求已记录：**必须先在 Vercel Production 配好 `TELEGRAM_WEBHOOK_SECRET`
与 `TELEGRAM_BOT_TOKEN`，再执行注册脚本**，否则 Telegram 会用旧/空 secret 签名，
导致采集中断。

业务流程未改动：采集仍先入草稿，由管理员审核后发布。

---

## D. 生产安全测试

### D.1 线上冒烟测试

**阻塞。** `node scripts/security-smoke-test.mjs --base https://lmsy.space`
无法执行：`lmsy.space` DNS 解析到 `216.198.79.1`（Vercel），TCP 443 连接超时；
代理通道同样超时。测试数量、通过数、失败数**无法给出**——不编造数字。

脚本已复查为非破坏性：所有管理类请求**期望被拒绝**，不写入生产数据。

### D.2 本地同代码冒烟测试（作为替代证据，明确标注非生产）

构建产出的同一份代码在本地监听 3000 端口运行（生产模式），冒烟测试
**51/51 通过**：管理 API 未认证拒绝、伪造 Bearer 拒绝、机器密钥缺失/错误拒绝、
Webhook secret 校验、登录限流（第 11 次 → 429）、公开 API 正常、会话不泄露身份、
敏感响应不被缓存、错误不泄露堆栈。
**这是对代码鉴权层的验证，不是对生产环境的验证。**

**过程中发现并如实记录的一件事：** 首轮跑出 50/51，
`POST /api/admin/drafts/seed` 返回 404 而测试期望 401/403。排查后确认这不是安全
回归——该路由在 `NODE_ENV === 'production'` 时**主动自我禁用并返回 404**
（临时开发用的播种端点），即生产环境下它根本没有进入鉴权分支，比「鉴权拒绝」更严格。
是测试期望值写窄了。已给冒烟脚本增加 `unauthorized-or-disabled` 期望并注明原因，
修复后 51/51。**未通过放宽判定来掩盖问题：404 与 401/403 同属"不可访问"，
且路由代码已逐行确认。**

### D.3 单元测试

`npm test` → **46/46 通过**（原 31 项 + 新增 15 项）。

新增 `tests/migrations.test.ts`，覆盖指令中「不要只检查 RLS 是否启用」的要求：

- `draft_items` / `admin_users` 确实在 deny 列表，且 `REVOKE SELECT` 存在；
- 写权限（INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER）确实被撤销；
- 每张表都 `ENABLE ROW LEVEL SECURITY`；
- `gallery_assets` / `projects` / `site_content_blocks` 保留公开只读；
- 策略为 `FOR SELECT ... USING (true)`，仅限只读；
- 不得对 `service_role` 收权；
- 三个迁移均不含 `DELETE FROM` / `TRUNCATE TABLE` / `DROP TABLE` /
  `DROP COLUMN` / `UPDATE lmsy_archive.`；
- `baseline` 为 `CREATE TABLE IF NOT EXISTS`，不会重建；
- 唯一索引仅在「重复数为 0」时创建，否则 NOTICE 跳过（断言共 2 处）；
- `source_platform` CHECK 为**扩大**而非收窄（保留 7 个旧值 + `telegram`）。

### D.4 真实管理员端到端验证

**阻塞**（站点不可达）。且真实凭证不写入脚本、报告或 Git，需你在可达环境手动完成：
登录 → 获取会话 → 访问受保护后台 → 退出 → 确认会话失效。

---

## E. 备份保障

### E.1 本次实际执行结果

| 命令 | 结果 | 证据 |
|---|---|---|
| `npm run backup:db` | **OK** | `2026-10-15T22-37-05-656`，9 表 / 432 行 / 0.41MB，逐表 `rows == expectedRows` |
| `npm run backup:r2` | **OK** | 408/408 对象，151.8MB，0 失败 |
| `npm run backup:r2:offsite` | **OK** | 源 408，目标 419（含 11 个 db-logical 文件），0 缺失，0 size 不符 |
| `npm run backup:db:offsite`（新增） | **OK** | 11 文件 / 518.3KB，**11/11 SHA-256 回读校验通过** |
| `npm run restore:drill` | **PASSED** | 9 表 432 行还原；`project_id` 全部可解析；无重复 catalog_id / file_hash；18 个 `draft/` 前缀已发布资产仍在；R2 引用 118 项 0 缺失 0 hash 不符 |

### E.2 数据库异地副本 —— 本次新建

此前只有本地副本。本次新增 `scripts/backup-db-offsite.mjs`：

- 上传到第二桶 `lmsy-archive-backup/db-logical/<timestamp>/`，与图片对象命名空间隔离；
- 先校验最新快照清单 `ok=true`，否则拒绝上传；
- 每个文件**下载回读比对 SHA-256**（仅比对大小不足以证明字节完好）；
- 保留策略列出候选但**绝不自动删除**；
- 两桶均已实测拒绝匿名访问（未认证列举返回 HTTP 400 `Authorization`），
  快照仅凭 R2 凭据可读。快照含未发布草稿，请勿泄露 R2 凭据。

### E.3 Supabase 平台备份 / PITR

**阻塞 —— 需 Dashboard 或 Management API token。** 本机两者都没有，无法核验
PITR、每日备份、保留期与最近恢复测试。文档 `docs/BACKUP_AND_RESTORE.md` 已留
待填行：`PITR: ___ | daily backups: ___ | retention: ___ | last restore test: ___`。

**明确说明：** `restore:drill` 的目标是**SQLite**，它证明导出完整、可读、可重放、
内部一致，**不等于** Supabase Postgres 原生备份可恢复。

### E.4 R2 版本控制与第三副本

- **版本控制：未启用**（2026-10-15 经 S3 `GetBucketVersioning` 确认）。本轮无法
  再次核验：本地 `CLOUDFLARE_API_TOKEN` 仅能通过 `/user/tokens/verify`，对桶级
  API 返回 `Authentication error`。启用需在 Cloudflare Dashboard 操作。
- **第二副本：** `lmsy-archive-backup`，408/408 已核验，与源桶**同一 Cloudflare
  账号**，不构成独立容灾边界。
- **第三副本决定：** 建议**暂不建设**。理由：跨账号/跨厂商复制会产生持续出口流量
  与存储成本，且目前已有「本地镜像 + 同账号第二桶 + 数据库逻辑备份上云」三层；
  真正的增量收益是**跨账号**，建议在做之前先确认 Supabase 平台备份已开启
  （E.3），因为那才是数据库的唯一原生恢复路径。此项列为**需要单独产品决策**。
- 未删除、未移动、未重命名任何 R2 对象。

---

## F. 第二阶段性能改动的生产验收

**阻塞 —— 站点不可达。** 缓存头、图片优化、分页、SEO 的**线上**实测全部无法执行，
不以下面任何本地结果冒充线上结果。

下表为**本地**已验证项（构建产物 + 本地服务器实测量），供你在可达环境对照复测：

| 检查项 | 本地结果 | 线上状态 |
|---|---|---|
| `/_next/static/**` immutable | `public, max-age=31536000, immutable` | 待测 |
| `/api/**` 禁止缓存 | `no-store` | 待测 |
| `/admin/**` 私有 | `no-store` + `X-Robots-Tag: noindex, nofollow` | 待测 |
| `/sw.js` | `public, max-age=0, must-revalidate` | 待测 |
| Service Worker 跳过 `/api/`、`/admin/` | 代码已改，`public/sw.js` fetch 处理已跳过 | 待测 |
| 图片优化器返回 AVIF/WebP | 本地实测 AVIF，体积约为 JPEG 一半 | 待测 |
| `/_next/image` 缓存头 | `public, max-age=2592000, must-revalidate`（来自 `minimumCacheTTL`） | 待测 |
| `/gallery` 分页 | 对**生产数据库**只读验证：3 页 180 条互异、0 重叠、排序稳定、末页 30 条 | 页面待测 |
| `/projects` 列表与详情 | 详情页 `revalidate = 300`，列表列投影已收窄 | 待测 |
| canonical / sitemap / robots | 代码已改（去掉全站指向首页的 canonical） | 待测 |
| 404 页面 | — | 待测 |

补充：上一轮已实测 `/_next/image` 的 `headers()` 规则**无效**（Next 内部路由自行
下发缓存头），该规则已移除，改由 `minimumCacheTTL` 控制——避免文档与事实不符。

图片优化用量与费用：**阻塞**，需 Vercel Dashboard 查看。

---

## G. Git 与部署

- **执行前 HEAD：** `0b742e93…`，工作区干净，`origin/main` 与本地一致。
- **Vercel Production 当前部署提交：** `0b742e93…`
  （GitHub deployments API：`environment = Production`，`state = success`，
  `description = "Deployment has completed"`，`created_at = 2026-10-15T14:40:10Z`）。
  注意指令中写的是 `b2813ee`，实际线上最新是随后那个仅改文档的 `0b742e9`。
- **本次改动：**

  | 文件 | 说明 |
  |---|---|
  | `scripts/apply-phase1-migrations.mjs` | 新增。备份校验 → 按「加固优先」顺序事务化执行三个迁移 → 库内结构核验 → 行数比对 → 用 anon key 库外复测；支持 `--dry-run` 与 `--emit-sql` |
  | `scripts/backup-db-offsite.mjs` | 新增。数据库逻辑备份上云 + SHA-256 回读校验 |
  | `tests/migrations.test.ts` | 新增。15 条迁移安全断言 |
  | `scripts/security-smoke-test.mjs` | 新增 `unauthorized-or-disabled` 期望：`/api/admin/drafts/seed` 在生产模式按设计返回 404（见 D.2） |
  | `package.json` / `package-lock.json` | 新增 `migrate:phase1`、`backup:db:offsite` 脚本与 `pg` 开发依赖 |
  | `docs/BACKUP_AND_RESTORE.md` | 记录数据库异地副本与保留策略 |

- **未提交任何密钥、备份或临时文件：** `backups/`、`temp/`、`reports/`、`.env*`
  均在 `.gitignore` 中，`git status` 确认仅上述源码文件入选。
- **推送与部署：** 代码提交 `9e75a21`（8 文件，+1282/−6）+ 文档回填 `5b0e8a4`，
  已推送 `main`（`0b742e9..9e75a21..5b0e8a4`）。Vercel Production 部署状态经 GitHub
  commit status API 核验：`state = success`，`description = "Deployment has completed"`，
  **`sha = 9e75a21`**（即线上代码已包含本次改动）。工作区干净，无未提交的用户改动。
- **注意：**「部署成功」只代表代码已上线，**不代表**生产数据库权限已修复或环境变量
  已配置——这两项仍需 H 节的人工操作。

---

## H. 未完成事项

### 已完成并验证

1. 生产草稿泄露**复测确认仍然存在**（有完整请求与状态码证据）。
2. 三个迁移的**前置条件全部核验通过**（表结构、行数、约束、重复值、RPC 清单）。
3. 迁移执行通道建成：脚本（含事务、NOTICE、行数保护、库外复测）+ SQL 包
   （16.5KB，加固在最前，0 条破坏性语句）+ 15 条断言测试。
4. 数据库异地副本建成并验证（11/11 SHA-256 回读通过）。
5. 全部备份与恢复演练重跑通过（见 E.1）。
6. `docs/BACKUP_AND_RESTORE.md` 已更新。
7. 类型检查、测试、构建通过：
   `npm run typecheck` → **0 错**；`npm test` → **46/46 通过**；
   `npm run build` → **✓ Compiled successfully，exit 0**（`/gallery` 等为静态路由）。

### 已执行但尚未验证

1. 迁移顺序改为「加固优先」—— 依赖分析已完成并有测试固化，但尚未在真实库上跑过。
2. `migrate:phase1` 的无凭据分支已验证（exit 2 + 明确指引），**有凭据分支未验证**。

### 需要人工操作

1. **给一条能执行 DDL 的凭据**（二选一，推荐第一个）→ 我立刻执行并复测：
   - `SUPABASE_ACCESS_TOKEN=sbp_...`：在
     https://supabase.com/dashboard/account/tokens 生成，**务必选作用域受限**：
     仅本项目 + `database_write` + 短有效期，用完撤销。
   - `SUPABASE_DB_PASSWORD=...` 或 `DATABASE_URL=postgres://...`：
     Dashboard → Project Settings → Database。

   命令：`SUPABASE_ACCESS_TOKEN=sbp_... npm run migrate:phase1`
2. 或自行在 Supabase SQL Editor 粘贴 `backups/phase1-pending-migrations.sql`
   （已生成，16.5KB，加固在最前，0 条破坏性语句），执行后告诉我，我立即用
   anon key 做外部复测。
2. Vercel Dashboard 核验 Production 环境变量（5 项），再执行
   `npx tsx scripts/setup-telegram-webhook.ts https://lmsy.space` **重新注册
   Webhook**（顺序不可颠倒）。
3. 在可达环境执行 `node scripts/security-smoke-test.mjs --base https://lmsy.space`。
4. 真实管理员端到端登录/登出验证。
5. Supabase Dashboard 核验 PITR / 每日备份 / 保留期，并填回文档。
6. 第二阶段性能与 SEO 的线上复测。
7. 关键业务回归（首页、图库、作品、档案、日程、编年史、灯箱、审核发布、上传）。

### 被权限、网络或平台条件阻塞

1. **数据库迁移执行** —— 本机无 Postgres 密码、无 Supabase Management token；
   PostgREST 无法执行 DDL（已确认无 `exec_sql` 类 RPC）。
   注：Supabase 连接池 TCP 可达，`api.supabase.com` 亦可达，凭据是唯一缺口。
2. **Vercel 环境变量核验** —— 无 Vercel 凭据。
3. **Telegram Webhook** —— `api.telegram.org` 不可达。
4. **全部线上 HTTP 验收** —— `lmsy.space` / `*.vercel.app` 不可达（DNS 可解析，
   TCP 443 超时；代理通道同样超时）。
5. **R2 版本控制状态** —— Cloudflare token 权限不足（仅能 token 自校验）。

### 需要单独产品决策

1. **跨账号 / 跨厂商第三副本** —— 建议暂缓，先确认 Supabase 平台备份（理由见 E.4）。
2. **`/gallery` 标签按钮与实际 tag 不匹配** —— 真实 tag 为
   `Magazine 237 / Advertising 54 / STAGE 12 / STILL 9 / Telegram 3 / null 15`，
   而按钮使用的是 `Fashion / BehindTheScene / Affair / Magazine`，**点选后无匹配
   结果**。属既有产品问题，改动会影响前端交互，需你确认预期行为。
3. **`/profiles/[id]` 查询不存在的 `members` 表** —— 生产该表不存在（HTTP 404），
   页面数据来自 `profiles`（2 行）。需确认是否要改数据源。
4. **`rotation` 全为 0、`category_tag` 全为 NULL、`blur_data` 全为空** —— 相关代码
   路径实际不生效，是否清理需决策。
