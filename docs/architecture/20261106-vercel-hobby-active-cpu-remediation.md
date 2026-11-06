# Vercel Hobby 团队暂停事件：Active CPU 超额成因与整改方案

日期：2026-11-06
团队：`vivis-projects-3d43ea75`（Hobby）
项目：`lmsy.space` / `Athena-vivi/LMSY.space`
状态：账号暂停中，全站 HTTP 402；代码侧未做任何改动

---

## 一、结论

账号暂停由 `Fluid Active CPU` 超额触发，额度 4 CPU-hrs，实测 8h19m，占 208%（面板提示 210%）。`Image Optimization - Transformations` 同时超额约 112%，但该项按平台规则不触发账号暂停。

超额原因不是访问量增长。30 天内 `CDN Requests` 354K，仅为额度 1M 的 35%；`Fast Data Transfer` 7.9 GB，为额度 100 GB 的 8%。真正原因是缓存链路在四个位置断开，使每次首页访问产生约 6 次无缓存的 Vercel Function 调用，累计 358K 次调用、29,940 CPU-秒，平均 83.6 ms CPU/次。

整改方向为恢复缓存，不改动数据结构、不改动展示结构、不改动内容。P0 三项合计涉及 6 个文件，保守估算可将 Active CPU 降至当前值的 1/5～1/10。

---

## 二、额度核对

额度取自 Vercel Hobby Plan 官方文档（2026-09-14 版）。

| 资源 | 实测用量 | Hobby 额度 | 占比 | 判定 |
|---|---:|---:|---:|---|
| Fluid Active CPU | 8h19m | 4 CPU-hrs | 208% | 超额，触发暂停 |
| Image Transformations | 5.6K | 5,000 | 约 112% | 超额，不触发暂停 |
| Image Cache Writes | 37K | 100,000 | 37% | 正常 |
| Function Invocations | 358K | 1,000,000 | 36% | 正常 |
| CDN Requests | 354K | 1,000,000 | 35% | 正常 |
| Fast Origin Transfer | 2.9 GB | 10 GB | 29% | 正常 |
| Fluid Provisioned Memory | 76.3 GB-Hrs | 360 GB-Hrs | 21% | 正常 |
| Fast Data Transfer | 7.9 GB | 100 GB | 8% | 正常 |
| Image Cache Reads | 11K | 300,000 | 4% | 正常 |
| Speed Insights Events | 17 | 10,000 | 0.2% | 正常 |

`Image Transformations` 超额的后果：新图片优化请求返回 402 并显示 alt 文本，已缓存图片继续正常返回。该项已在 2026-10-25 通过 `next.config.ts` 的 `images.unoptimized: true` 关闭优化器，本计费周期结束后归零。

不设月度额度、不参与暂停判定的读数：`ISR Reads` 54K、`ISR Writes` 61K、`Build CPU Minutes` 17h34m、`Cron Job Invocations` 30、`CDN Request CPU Duration` 3m38s、`Function Duration` 0 GB-Hrs、`Blob Data Storage` 9.24 MB。Hobby 对构建的限制是每日 100 次部署、单次 45 分钟，不存在月度 CPU 分钟配额。

---

## 三、现场证据

### 3.1 线上验证

2026-11-06 对四个路由发起 HEAD 请求，全部返回 402：

```
$ for u in https://lmsy.space/ https://lmsy.space/gallery \
           https://lmsy.space/editorial https://lmsy.space/api/home/summary; do
    curl -sI -m 20 "$u" | grep -iE "^(HTTP/|cache-control|server)"
  done

HTTP/1.1 402 Payment Required
Cache-Control: public, max-age=0, must-revalidate
Content-Type: text/plain; charset=utf-8
Server: Vercel
```

四个路由响应一致，暂停作用于整个团队的全部部署，不限于触发超额的函数。

### 3.2 代码核查范围

`proxy.ts`、`next.config.ts`、`vercel.json`、`lib/revalidate-content.ts`、`lib/data/archive-counts.ts`、`lib/data/projects.ts`、首页两个 `page.tsx`、52 个含 `revalidate = 300` 的页面文件、3 个含 `revalidate = 0` 的公开读接口、4 个首页 section 组件、cron 路由、全部 `getSession` / `requireAdmin` 调用点。

### 3.3 关键计数

| 项 | 数值 |
|---|---:|
| `export const revalidate = 300` 页面文件 | 52 |
| `export const revalidate = 0` 路由 | 3 |
| `revalidateContentSurfaces()` 调用点 | 22 处，分布在 17 个文件 |
| `revalidateContentSurfaces()` 单次作废路由 | 25（10 个 DOOR_PAGES + 15 个 DOOR_PATTERNS） |
| 首页客户端 `fetch('/api/home/summary')` 调用点 | 3 |
| 首页客户端 `fetch('/api/home/portals')` 调用点 | 1 |

---

## 四、成因

### 4.1 proxy.ts 对全部公开请求执行一次 Node.js 函数

`proxy.ts:60-64` 的 matcher 为：

```ts
'/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/ingest|api/cron|api/search|.*\\.(?:svg|png|jpg|...)$).*)'
```

排除项只有静态资源与 4 个机器接口，所有公开页面与公开 API 均命中。函数体 `proxy.ts:27-58` 每次构造 `createServerClient` 并 `await supabase.auth.getUser()`，产生一次到 Supabase Auth 的网络往返与一次 cookie 读写。

Next.js 16 的 `proxy.ts` 仅在 Node.js runtime 运行，基于 Fluid compute 计费，且在 CDN 缓存之前执行。页面即使命中 ISR 缓存，proxy 仍会产生一次 Function Invocation 与 Active CPU 消耗。面板 `Edge Middleware Invocations = 0` 与该结论一致：proxy 未走 Edge 计费口径，其开销计入 Functions。

全项目 `getSession()` 与鉴权相关调用集中在 `app/(en)/admin/**` 与 `app/api/admin/**`，公开页面不存在会话依赖。这项开销对公开访客不产生任何功能结果。

### 4.2 首页强制动态渲染

`app/(en)/page.tsx:20` 与 `app/[lang]/page.tsx:16` 均为 `export const dynamic = 'force-dynamic'`。首页每次访问完整 SSR，并调用 `getPublicArchiveCounts()`（`lib/data/archive-counts.ts:31-62`），后者执行 `listPublicProjectIds` 加两次 `count: 'exact'` 查询。

`next.config.ts:84` 的注释记录了该站入站流量几乎只有首页。把全站唯一入口设为零缓存，使流量直接线性转换为 CPU 时间。

### 4.3 同一公开读接口被重复请求三次，且全链路禁止缓存

首页三个组件各自持有独立 `useEffect`，分别请求同一接口：

| 组件 | 行号 | 请求 |
|---|---:|---|
| `soul-resonance-section.tsx` | 56 | `/api/home/summary` |
| `timeline-preview-section.tsx` | 35 | `/api/home/summary` |
| `people-section.tsx` | 42 | `/api/home/summary` |
| `portals-section.tsx` | 166 | `/api/home/portals` |

四处 `fetch` 无共享状态、无请求去重。三个接口文件均为 `export const revalidate = 0`，`next.config.ts:119-124` 又对 `/api/:path*` 统一设置 `no-store, no-cache, must-revalidate, max-age=0`，浏览器与 CDN 均不缓存。

该 `no-store` 规则的适用范围是携带用户态、鉴权或写操作的接口。`/api/home/summary`、`/api/home/portals`、`/api/editorial` 使用 service role 读取公开数据，不读取请求 cookie、不含用户态，被同一条规则覆盖属于范围误设。

单次 `/api/home/summary` 的查询组：`listHomeSummaryProjects`（`lib/data/projects.ts:737-749`，全量公开 projects）、`listCoverCandidates`、`listPinnedInterviewCovers`、`listMilestoneCoverAssets`、`profiles`、`project_people`，随后在内存中完成排序、分组与年份归并。`/api/home/portals` 对 5 个 `HOME_CATEGORIES` 并发，每个分类最多 4 次资产查询。

一次首页访问的完整链路约为 6 次 Function Invocation、30 次以上 PostgREST 查询，全部无缓存。

### 4.4 52 个页面的 5 分钟 ISR 周期

`app/(en)/**` 与 `app/[lang]/**` 两套并行路由共 52 个页面设置 `revalidate = 300`。每个 URL 每 5 分钟最多触发一次后台重渲染，双语言使路由数翻倍。`lib/revalidate-content.ts:28-62` 的 `revalidateContentSurfaces()` 单次作废 25 条路由，22 个写路由调用点在每次后台保存时执行。面板 `ISR Writes` 61K 与该重渲染频率相符。

### 4.5 排除项

| 项 | 判定依据 |
|---|---|
| 图片优化转换 | `next.config.ts:47-60` 记录 2026-10-25 因 402 已设 `unoptimized: true`；5.6K 主要产生于此前的额度周期 |
| Cron | `vercel.json` 每日 02:00 一次，对应面板 30 次；`app/api/cron/fetch-updates/route.ts` 中全部 `RSS_SOURCES` 均为 `enabled: false`，无实际抓取 |
| 构建 | `Build CPU Minutes 17h34m` 无对应月度额度 |
| 流量异常 | CDN Requests 35%、流出流量 8%，均远离额度；bot 流量尚不能排除，需在服务恢复后按路径拆分核验 |

---

## 五、整改方案

### 5.1 P0-1 收窄 proxy matcher

目标：公开流量不再触发会话代理函数。

改动：`proxy.ts` 的 `config.matcher` 改为 `['/admin/:path*', '/api/admin/:path*']`。`/api/auth/login` 与 `/api/auth/logout` 在路由内自行构造 `createServerClient`，不依赖 proxy 的 cookie 轮换。

验收：公开页面响应不再产生 proxy 函数日志；`/admin` 登录后一小时以上仍可正常调用受保护接口，验证 token 轮换未被破坏。

风险与回滚：若存在未列出的会话依赖路由，表现为该路由登录后一小时失效；回滚只需还原 matcher，不涉及数据与展示。

### 5.2 P0-2 首页改为 ISR

目标：首页 SSR 从每次访问降为每 5 分钟最多一次。

改动：
- `app/(en)/page.tsx:20`、`app/[lang]/page.tsx:16`：`force-dynamic` 改为 `revalidate = 300`。
- `lib/revalidate-content.ts` 的 `DOOR_PAGES` 增加 `'/'`；语言前缀首页按 `DOOR_PATTERNS` 的既有方式补一条对应 pattern。

背景：`force-dynamic` 的原始目的是让后台更换 Hero 图后下次加载即可见。把首页纳入 `revalidateContentSurfaces()` 的作废清单后，写路由成功即触发失效，该行为保持不变。

验收：同一 URL 连续两次请求，`x-vercel-cache` 由 `MISS` 变为 `HIT`；后台更换 Hero 图后刷新首页立即显示新图。

风险与回滚：遗漏语言前缀路径会造成 `/zh` 首页最多延迟 5 分钟更新；补入作废清单即可修复。三处改动均为配置行，可独立回滚。

### 5.3 P0-3 三个公开读接口恢复 CDN 缓存

目标：四次客户端 API 请求由 CDN 承接，函数仅在缓存过期时执行。

改动：
- `next.config.ts`：为 `/api/home/summary`、`/api/home/portals`、`/api/editorial` 单列 `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`，并从 `/api/:path*` 的 `no-store` 规则中排除。
- 三个 `route.ts`：`export const revalidate = 0` 改为 `300`。
- `lib/revalidate-content.ts`：把三条接口路径纳入作废清单，使后台写入后立即失效，不依赖 TTL 自然过期。

实施前置校验：`next.config.ts` 的 `headers()` 对 Route Handler 生效，但同名 `Cache-Control` 与 Route Handler 自行设置的响应头存在合并顺序问题。上线前以 `next build && next start` 本地启动，用 `curl -I` 核对三条路径实际输出的 `Cache-Control`，确认 `no-store` 已被替换，再提交部署。

验收：第二次请求三条路径返回 `x-vercel-cache: HIT`；后台改一次封面后首页立即更新；Function Invocations 曲线在同等流量下显著下降。

风险与回滚：缓存 300 秒使公开数据最多延迟 5 分钟，与现有门页 `revalidate = 300` 一致，不构成降级。三条路径均为公开只读，不含用户态，无数据越权风险。回滚为还原三处 `revalidate` 与 `headers()` 规则。

### 5.4 P1-1 放大页面 ISR 周期

目标：`ISR Writes` 从 61K 降至约 5K。

改动：52 个页面文件的 `revalidate = 300` 统一改为 `3600`。写操作已有 `revalidateContentSurfaces()` 主动失效，TTL 不需要维持 5 分钟。

约束：涉及 52 个 `app/**/page.tsx` 文件，单独一个 commit，与 P0 分离。

验收：连续 7 天 `ISR Writes` 日均低于 200；后台保存后对应门页仍即时更新。

### 5.5 P1-2 首页取数合并

目标：消除四个组件的重复请求。

两种方式：客户端共享一次请求并分发结果；或在首页服务端组件直接取数、以 props 下传。后者顺带去掉三次客户端请求，收益更彻底。

约束：改动落在 `components/sections/**` 与首页 `page.tsx`，属于展示层。按项目约定，展示层结构的任何调整需先获得明确同意，不纳入 P0。P0 三项完成后本项收益相应缩小，可重新评估是否仍有实施价值。

### 5.6 不纳入本次整改

- 图片优化器：已关闭，无需再次改动。
- Cron：全部源已禁用，每日空转一次，收益极小；保留 `vercel.json` 现有配置。
- 数据结构、类目归属、展示层入口与卡片：全部保持原状。
- 部署配置、域名、重定向：全部保持原状，全站零重定向策略不变。

---

## 六、实施约束

1. **暂停期间部署冻结**。Vercel 文档记载 Hobby team 置为 paused 后状态持续到主动操作为止，期间所有新旧部署均被暂停。代码改动在恢复服务前无法生效，也无法通过线上验证。
2. **恢复不等于自动上线**。面板给出的 2026-12-03 是 30 天额度窗口到期日；另有资料记载到期后项目不会自动恢复，需在 dashboard 逐项目执行 Resume Project。另一条路径是升级 Pro（$20/月）立即恢复。
3. **恢复后的验证顺序**：先执行 Resume 并确认首页返回 200，再按 5.1 → 5.2 → 5.3 分批部署，每批核对 `x-vercel-cache`、`Function Invocations`、`Active CPU` 三项读数，最后到 Observability 按路径拆分 CPU，确认是否还有爬虫或其他来源。
4. **提交纪律**：使用显式路径 `git add <文件>`，不使用 `git add -A` 或 `git commit -a`；每次提交前核对 `git status`。P0 与 P1 分属不同 commit。

---

## 七、验收指标

| 指标 | 当前（30 天） | 目标 | 观测方式 |
|---|---:|---:|---|
| Fluid Active CPU | 8h19m | 低于 4 CPU-hrs，目标低于 2h | Usage 面板 |
| Function Invocations | 358K | 降至 100K 以下 | Usage 面板 |
| ISR Writes | 61K | 低于 10K（P1-1 完成后） | Usage 面板 |
| 首页 `x-vercel-cache` | 无缓存 | 第二次请求 HIT | `curl -I` |
| 三条公开读接口 `Cache-Control` | `no-store` | `s-maxage=300` | `curl -I` |
| 后台保存生效 | 立即 | 立即 | 后台更换封面后刷新核对 |

Active CPU 降幅为基于调用次数削减比例的估算，不作为承诺值；实际值受流量构成与 bot 请求影响，须以恢复后观测数据为准。

---

## 八、依据

代码位置：`proxy.ts`、`next.config.ts`、`vercel.json`、`lib/revalidate-content.ts`、`lib/data/archive-counts.ts`、`lib/data/projects.ts`、`app/(en)/page.tsx`、`app/[lang]/page.tsx`、`app/api/home/summary/route.ts`、`app/api/home/portals/route.ts`、`app/api/editorial/route.ts`、`components/sections/{soul-resonance,timeline-preview,people,portals}-section.tsx`、`app/api/cron/fetch-updates/route.ts`。

外部依据：
- Vercel Hobby Plan 额度表：https://vercel.com/docs/plans/hobby
- Vercel Image Optimization 超额行为：https://vercel.com/docs/image-optimization/limits-and-pricing
- Next.js 16 proxy 的 Node.js runtime 与 Fluid compute 计费：https://vercel.com/docs/routing-middleware
- Hobby 暂停期间部署冻结与恢复方式：https://vercel-docs.vercel.sh/docs/functions/usage-and-pricing/legacy-pricing
- CDN 缓存对 Function 调用次数的作用：同上，Managing function invocations 章节
