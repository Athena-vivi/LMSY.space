# LMSY.space

LMSY（Lookmhee & Sonya，泰剧《Affair》主演）粉丝站。线上：https://lmsy.space ，部署于 Vercel，代码仓库 `Athena-vivi/LMSY.space`（公开）。

> **想了解网站现状、局限与下一步？** 读 [`docs/FULL_AUDIT_REPORT_2026-10-16.md`](docs/FULL_AUDIT_REPORT_2026-10-16.md) —— 这是仓库中唯一保留的全量审计文档（现状 / 功能审计表 / P0-P3 问题清单 / 架构评估 / 分批整改计划 / 批量采集准备度 / 验证结果 / 结论），2026-10-16 基于生产只读复测。此前的初版审计与各阶段实施过程文档已按「只留现状与参考」原则清理，细节可在 Git 历史按需查阅。

## 技术栈

- **框架**: Next.js 16（App Router）+ React 19 + Tailwind CSS v4 + Framer Motion
- **数据库**: Supabase PostgreSQL（独立 schema `lmsy_archive`）+ Supabase Auth（管理员登录）
- **图片存储**: Cloudflare R2（公开 CDN `https://cdn.lmsy.space`）
- **内容**: MDX 专栏（`content/editorial/`）
- **部署**: Vercel（main 分支推送自动部署）
- **其他**: PWA、i18n（EN/ZH/TH）、暗色模式

## 系统架构与数据流

```
浏览器扩展 / Telegram 机器人 / 管理后台上传
        │
        ▼
  /api/ingest ──► 下载图片 ──► SHA-256 查重 ──► 上传 R2 ──► 写入 draft_items（草稿）
        │                                                      │
        │                                                      ▼
        │                                         管理后台人工审核（AI 翻译辅助）
        │                                                      │
        │                                                      ▼
        └────────────────────────────────────────── 发布 ──► gallery_assets ──► 前台展示
```

- **发布态数据**住在 `gallery_assets`；**未发布内容**住在 `draft_items`。两个表都只允许 `service_role`（服务端）访问，anon/authenticated 角色对 `draft_items`、`admin_users` 的读取已于 2026-10-16 关闭（此前存在未发布草稿外泄，已修复并复验）。
- 前台公开读取的 7 张表：`gallery_assets`、`projects`、`profiles`、`publications`、`chronicle_events`、`site_content_blocks`、`gallery`。
- 数据库迁移按文件名时间戳顺序执行，记录在 `supabase/migrations/`。

## 功能清单

- **前台**： masonry 图库（标签筛选 + 灯箱）、人物档案、作品时间线、日程、编年史、MDX 专栏、搜索 API
- **后台**（`/admin`）：登录/会话（限流 + HttpOnly Cookie）、草稿箱（含 Telegram 收件）、审核发布、图片上传（presigned 直传 R2 + 注册）、批量操作、人物/作品/日程/内容管理
- **采集**：Telegram 机器人 webhook（secret 头校验）、`/api/ingest`（机器密钥）、定时 cron
- **已知缺陷**（含严重度与修复计划）：见审计报告问题清单。最需要注意的三个「死功能」：`/profiles/[id]` 查不存在的表、`/schedule` 前台写死示例数据、`/gallery` 标签按钮与真实 tag 不匹配。

## 本地开发

```bash
npm install
cp .env.example .env.local   # 按注释填值；.env.local 永不入库
npm run dev                  # http://localhost:3000
```

环境变量说明见 `.env.example`（每个变量的来源都写在注释里）。生产环境变量在 Vercel Dashboard 配置。

### 质量门禁

```bash
npm run typecheck   # tsc --noEmit
npm test            # 48 个单测（node --test）
npm run lint
npm run build       # 生产构建
node scripts/security-smoke-test.mjs --base http://localhost:3000   # 安全冒烟（51 项）
```

> 注意：本机若配了代理，`next build` 拉取 Google Fonts 会被阻断，需 `env -u http_proxy -u https_proxy ... npm run build`（本机网络问题，与代码无关）。

## 常用脚本

| 命令 | 用途 |
|---|---|
| `npm run backup:db` / `backup:db:offsite` | 数据库逻辑导出 / 导出并上传异地桶 |
| `npm run backup:r2` / `backup:r2:offsite` | R2 全量镜像 / 异地第二副本 |
| `npm run restore:drill` | 恢复演练 |
| `npm run audit:r2` | R2 对象与数据库引用对账（只读） |
| `npm run migrate:phase1` | 应用 phase1 迁移（默认 dry-run，需凭据） |
| `npx tsx scripts/reset-admin-password.ts <email>` | 管理员密码重置（0600 文件交付） |
| `npx tsx scripts/setup-telegram-webhook.ts register https://lmsy.space` | 注册 Telegram webhook（子命令式；另支持 `status`/`delete`） |
| `npm run backfill:magazine` | 杂志孤儿图片回填（dry-run 先行，需人工确认） |

`scripts/` 里另有若干历史一次性脚本（`batch-feed-*`、`sync-r2-*`、`delete-fake-data` 等），**不要随手执行**，用前先读脚本头部注释。

## 文档索引

| 文档 | 内容 |
|---|---|
| `docs/FULL_AUDIT_REPORT_2026-10-16.md` | **全量审计报告（现状唯一入口，含遗留事项与待决策）** |
| `docs/REMEDIATION_PLAN.md` | **下一步整改方案（批次/依赖/验收/决策点，v1.1 已经独立评审）** |
| `docs/BACKUP_AND_RESTORE.md` | 备份/恢复体系与操作手册 |
| `docs/R2_SETUP.md` | R2 桶与 CDN 配置 |
| `docs/BATCH_UPLOAD_GUIDE.md` | 后台上传指南 |
| `docs/I18N_CONTENT_ARCHITECTURE.md` | 三语内容架构 |
| `MAGAZINE_WORKFLOW.md` | 杂志类内容工作流 |
| `CATALOG_ID_STANDARD.md` / `CATALOG_ID_OVERRIDE.md` | catalog_id 编号体系与例外 |
| `SUPABASE_SETUP.md` | Supabase 项目设置 |
| `supabase/setup.md` | 数据库 schema 与迁移说明 |

## 部署

推送 `main` → Vercel 自动构建部署。回滚 = Vercel Dashboard 选择上一个 Deployment Promote。数据库变更必须走 `supabase/migrations/` 新文件，不在 Dashboard 手改结构。

## 备份

代码（GitHub）/ 数据库（逻辑导出 + R2 异地副本）/ 图片（R2 全量镜像 + 第二桶）三层相互独立，操作与演练记录见 `docs/BACKUP_AND_RESTORE.md`。本地 `backups/` 目录（gitignored）存放数据快照与决策依据（如杂志孤儿图片映射表），不要提交。

## License

粉丝作品，非官方。LMSY 及《Affair》相关权利归各自所有者。
