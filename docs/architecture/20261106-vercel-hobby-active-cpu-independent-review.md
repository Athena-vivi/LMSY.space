# 独立审计记录：Vercel Hobby Active CPU 整改方案

审计对象：`docs/architecture/20261106-vercel-hobby-active-cpu-remediation.md`
日期：2026-11-06
方式：两路只读审计，互不通气，分别以本地代码、平台官方一手资料为事实源

---

## 一、代码事实审计

### 未核实声明

以下均以本地代码文件为唯一依据，**未核实**：线上 402 响应、Vercel 面板全部读数（8h19m、358K、29,940 CPU-秒、83.6ms、61K ISR Writes 等）、Next.js 16 运行时行为、`revalidatePath`／`headers()` 对 Route Handler 的运行时生效情况、Vercel CDN 缓存与暂停规则、第八章外部链接内容。`app/(en)/editorial/page.tsx` 未逐行打开，仅依据其 `:13` 注释与全项目 grep 判断。审计全程只读，未修改/创建/删除任何文件，未执行 git 写操作。

### 【已核实一致】

| 项 | 复核结果 | 证据 |
|---|---|---|
| 52 个 `revalidate = 300` 页面 | 52 条导出，分布在 52 个 `page.tsx`；`(en)` 26 + `[lang]` 26。grep 共 53 条匹配，多的 1 条是注释 | `app/(en)/commercial/page.tsx:11`、`app/[lang]/dramas/page.tsx:16`；注释在 `app/(en)/admin/preview/[id]/page.tsx:54` |
| 3 个 `revalidate = 0` 路由 | 3 | `app/api/home/summary/route.ts:23`、`app/api/home/portals/route.ts:29`、`app/api/editorial/route.ts:20` |
| `revalidateContentSurfaces()` 调用点 | **22 处** | 23 行含该串，减 `lib/revalidate-content.ts:79` 定义行；含 `lib/asset-move.ts:375,499`、`app/api/admin/gallery/route.ts:184,240,443` |
| 单次作废 25 条路由 | 25 = 10 + 15 | `lib/revalidate-content.ts:29-40`、`46-62` |
| 3 次 summary + 1 次 portals 客户端 fetch | 数字本身正确（但见【事实错误】，这不是首页全部请求） | `soul-resonance-section.tsx:56`、`timeline-preview-section.tsx:35`、`people-section.tsx:42`、`portals-section.tsx:166` |
| 四个组件 fetch 行号 | 全部吻合 | 同上四处 |
| `useEffect` 依赖与去重 | 四处均为 `[]`，无共享状态、无请求去重、无 React `cache` / SWR | `soul-resonance-section.tsx:53-65`、`timeline-preview-section.tsx:32-44`、`people-section.tsx:39-51`、`portals-section.tsx:163-177` |
| 首页 `force-dynamic` 位置 | 两处 | `app/(en)/page.tsx:20`、`app/[lang]/page.tsx:16` |
| `getPublicArchiveCounts()` 查询数 | 最多 3 次：`listPublicProjectIds` + 2 次 `count:'exact'`，后两者并发 | `lib/data/archive-counts.ts:37,39-41,43-50,52`；`lib/data/projects.ts:673-679` |
| `/api/home/summary` 查询组 | **6 组**，`listHomeSummaryProjects` 行号 737-749 精确 | `app/api/home/summary/route.ts:68,84,169,202,246-250,252-255`；`lib/data/projects.ts:737-749`；`lib/data/gallery-assets.ts:514,565,586` |
| `/api/home/portals` 并发数 | 5 个分类并发（但查询数见下） | `app/api/home/portals/route.ts:106-111`；`lib/category-registry.ts:213-215`，`homeEntry: true` 恰 5 处（`:63,70,77,84,91`） |
| `/api/:path*` no-store 规则 | 存在且值一致 | `next.config.ts:117-124`，`NEVER` 定义于 `:29` |
| `images.unoptimized: true` 注释 | 注释确记录 2026-10-25 因 optimizer 返回 402 而 bypass | `next.config.ts:47-60` |
| cron 全 disabled | `RSS_SOURCES` 4 个全 `enabled: false`，循环 `continue` | `app/api/cron/fetch-updates/route.ts:38-65,383-387`；`vercel.json:5` |
| proxy matcher / 函数体位置 | `proxy.ts:60-64`、`:27-58`、`:52` | `proxy.ts` |
| 5.4「52 个页面」 | 与计数一致 | — |

### 【事实错误】

1. **「22 处，分布在 17 个文件」** → 实际 **15 个文件**（含 import 与调用的文件；加定义文件 `lib/revalidate-content.ts` 共 16）。15 个：`lib/asset-move.ts` + `app/api/admin/` 下 `gallery/transfer`、`gallery`、`editorial`、`projects/[id]/split`、`projects/[id]`、`projects/[id]/cover`、`projects`、`gallery/milestone`、`projects/[id]/merge`、`reconcile`、`gallery/batch-update`、`people/portrait`、`drafts/[id]/to-gallery`、`gallery/asset-group` 的 route.ts。应改为 15。

2. **4.3「三个接口使用 service role 读取公开数据」** → 仅 summary/portals 用 `getSupabaseAdmin()`（service role，`app/api/home/summary/route.ts:2,66`、`portals/route.ts:2,38`）；`/api/editorial` 用 `getSupabasePublic()`，即 anon key + RLS（`app/api/editorial/route.ts:2,57`；`lib/data/client.ts:44-68`）。应改为「summary/portals 为 service role，editorial 为 anon」。

3. **4.1「排除项只有静态资源与 4 个机器接口，所有公开页面与公开 API 均命中」** → `proxy.ts:62` 排除的 4 个 API 前缀中，`api/webhooks`、`api/ingest`、`api/cron` 是 `requireMachineKey`（`app/api/ingest/route.ts:87`、`webhooks/telegram/route.ts:228`、`cron/fetch-updates/route.ts:353`），但 **`api/search` 是公开 GET 接口**（`app/api/search/route.ts:29`，anon client），不是机器接口且被排除。故「所有公开 API 均命中」不成立。

4. **4.1「公开页面不存在会话依赖，这项开销对公开访客不产生任何功能结果」** → `SiteChrome` 把 `<AuthProvider>` 挂在两个根 layout 共享的 chrome 上（`components/site-chrome.tsx:31`，被 `app/(en)/layout.tsx:47` 与 `app/[lang]/layout.tsx:65` 渲染），覆盖**全部公开页面**；`AuthProvider` 挂载即 `supabase.auth.getSession()` + `fetch('/api/auth/session')`（`components/auth-provider.tsx:94,35`），`onAuthStateChange` 再次触发（`:122`）。服务端页面组件本身确实不读 cookie，但「公开页面不存在会话依赖」这个全称断言错误。

5. **4.3「约 6 次 Function Invocation」/ 5.3「四次客户端 API 请求」** → 首页客户端至少 **8 次** fetch：表格 4 次之外，还有 `components/sections/hero-section.tsx:32` 与 `components/loading/immersive-loading.tsx:58` 各一次 `/api/site-content?key=homepage_hero`（均 `cache:'no-store'`）、`components/museum-preface.tsx:166` 一次 `/api/site-content?key=homepage_preface`、`components/auth-provider.tsx:35` 一次 `/api/auth/session`。3.3 表格的 3 与 1 只针对那两个 URL，不能当作首页请求总数。

6. **4.3「`/api/home/portals` 每个分类最多 4 次资产查询」** → `app/api/home/portals/route.ts:71-99` 是 `for (const project of projects)` 循环，对每个 project 依次发 `getPortalCoverCandidate` 最多 3 次（`:76,84,92`），单分类上限 = `listPublicPortalProjects`(1) + `getPinnedPortalCover`(1) + 3×N，N 为该分类公开项目数，不是 4。5 分类并发单次至少 10 次查询。

7. **4.2「`next.config.ts:84` 的注释记录该站入站流量几乎只有首页」** → 关键句在 `:79-80`（"the site's only inbound traffic has ever been the homepage"），`:84` 是 "This also means no page may rely on being rescued by the edge"。行号错。

8. **5.2「把首页纳入 `revalidateContentSurfaces()` 的作废清单后，写路由成功即触发失效，该行为保持不变」+ 验收「后台更换 Hero 图后刷新首页立即显示新图」** → Hero 数据来自 `site_content_blocks.homepage_hero`（`lib/homepage-hero.ts:26`），写路由是 `PUT /api/admin/site-content`（`app/api/admin/site-content/route.ts:36-73`），该文件**无任何失效调用**；全项目唯一 `revalidatePath` 调用点在 `lib/revalidate-content.ts:66`，该写路由不在 22 个调用点内（写入路径见 `app/(en)/admin/settings/page.tsx:223`）。改成 `revalidate = 300` 后 SSR 首屏最长延迟 300 秒。

9. **5.3「纳入作废清单，使后台写入后立即失效，不依赖 TTL 自然过期」** → 与同节自设的 `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` 直接冲突：`revalidatePath` 只作用于 Next.js 内部缓存，**无法清除 Vercel CDN 边缘缓存**，CDN 仍按 s-maxage 返回旧副本最长 300 秒（stale 窗口再 600 秒）；验收「后台改一次封面后首页立即更新」不成立。

10. **5.3 把 `/api/editorial` 与「四次客户端 API 请求」并列** → 全项目 grep 无任何 `fetch('/api/editorial')`；`app/(en)/editorial/page.tsx:13` 注释说明列表已改为服务端读取。该接口不是首页请求链的一部分（且如上第 2 条，它用 anon 客户端）。

### 【依据不足 / 夸大】

- 一章「每次首页访问产生约 6 次无缓存 Function 调用，累计 358K 次、29,940 CPU-秒、平均 83.6 ms CPU/次」、二章全部面板读数：代码无法核实，属外部读数；七章末尾只标注了「Active CPU 降幅为估算」，但 4.3「6 次 Function Invocation、30 次以上 PostgREST 查询」以精确口吻给出推断，且漏算请求（见【事实错误】5）。
- 1/2 章「Image Transformations 超额不触发账号暂停」「本计费周期结束后归零」：平台规则，`next.config.ts:47-60` 注释里没有，正文未标注为外部依据。
- 4.1「Next.js 16 的 `proxy.ts` 仅在 Node.js runtime 运行、基于 Fluid compute 计费、在 CDN 缓存之前执行」「`Edge Middleware Invocations = 0` 与该结论一致」：运行时/面板推断，代码无证据。
- 4.4「面板 `ISR Writes` 61K 与该重渲染频率相符」：相关性推断，非可核实因果。
- 5.3「`next.config.ts` 的 `headers()` 对 Route Handler 生效」：代码只证明 `headers()` 存在（`next.config.ts:88-134`），不证明运行时生效；文档虽加了 `curl -I` 前置校验，但断言句本身未标为待验证。
- 唯一明确标注的推断是 4.5「bot 流量尚不能排除」。

### 【遗漏】

1. **整改范围漏掉 `/api/site-content`**：`hero-section.tsx:32`、`immersive-loading.tsx:58`、`museum-preface.tsx:166` 三处 `cache:'no-store'` 请求，以及 `auth-provider.tsx:35` 的 `/api/auth/session`。`/api/site-content` 同样被 `/api/:path*` 的 no-store 覆盖（`next.config.ts:119`）且是公开读（`app/api/site-content/route.ts:5-15`），4.3 论证「范围误设」时未列它，5.3 只改三条路径。这几类请求整改后仍无缓存，直接威胁七章「Function Invocations 降至 100K 以下」。
2. **5.1 漏 `/api/auth/session`**：`getAuthenticatedUser` 的 cookie adapter `set`/`remove` 是只读 no-op（`lib/supabase/server-auth.ts:37-46`），正是 `proxy.ts:7-11` 注释所述「API routes 无法持久化轮换 token」的场景；且它被所有公开页面的 AuthProvider 高频调用。文档只论证了 login/logout（二者自有可写 adapter：`app/api/auth/login/route.ts:91-108`、`logout/route.ts:29-43`），把 3 个 `/api/auth/*` 路由当成 2 个。
3. **全部需要会话/鉴权的 URL 前缀**（`(en)` 是路由组、不产生 URL 段，故 `/admin/:path*` 已能覆盖 `app/(en)/admin/**`，这部分 5.1 写法本身正确）：
   - `/admin/:path*`（`app/(en)/admin/**`：`admin/layout.tsx`、`admin/login`、`admin/settings`、`admin/preview/[id]` 等；`preview/[id]/page.tsx:75,101` 用 `getAdminFromCookies()`，`lib/security/api-auth.ts:99-129` 的 `cookies()` + no-op `set/remove`，同样依赖 proxy 轮换）
   - `/api/admin/:path*`（`requireAdmin`，`lib/security/api-auth.ts:54`）
   - `/api/auth/login`、`/api/auth/logout`、`/api/auth/session`（`app/api/auth/*`）
   - 不需会话、当前被 proxy 排除：`/api/webhooks/*`、`/api/ingest`、`/api/cron/*`（machine key）、`/api/search`（公开读）

   文档 5.1 的新 matcher `['/admin/:path*','/api/admin/:path*']` 覆盖前两类，**漏 `/api/auth/*`**；其「风险与回滚」把「登录后一小时失效」写成假设，实际有确定命中的路由。
4. **语言前缀是 4 个不是 1 个**：`ROUTE_LANGUAGES = ['zh','th','es','pt']`（`lib/i18n-path.ts:12`），`app/[lang]/layout.tsx:32-36` `generateStaticParams` + `dynamicParams=false` 预构建；5.2 风险只提 `/zh`。
5. **22 处调用点中有 2 处在 `lib/asset-move.ts:375,499`**（lib 函数，非「写路由」），4.4「22 个写路由调用点」表述不精确。
6. `revalidateOne` 对 DOOR_PAGES 不传 `type`、对 DOOR_PATTERNS 传 `'page'`（`lib/revalidate-content.ts:80-85`）。5.3 把 API 路径加进哪个列表、用哪种调用形式未说明；`revalidatePath` 对 Route Handler 生效的前提（handler 输出进入 Full Route Cache）代码无证据。加 3 条路径后 22 个调用点每次写操作额外 3 次调用，且 `revalidateOne` try/catch 吞异常（`:64-73`），文档未评估。
7. **5.2 的 re-export 判断**：`app/[lang]/page.tsx:27` 是 `export { default } from '../(en)/page'`，其 segment config 是本文件 `:16`。`revalidatePath` 按 URL 路径/pattern 失效，与组件是否 re-export 无关，因此补 `{ path: '/[lang]', type: 'page' }` 方向**可成立**；但 `revalidatePath('/')`（DOOR_PAGES 走 `:81` 不传 type）只作废 `/` 对应的 `app/(en)/page.tsx`，不会波及 4 个语言首页。文档未给出具体 pattern、漏 3 个语言，且配套的「写路由立即失效」错误（见【事实错误】8）。`revalidatePath('/[lang]', 'page')` 对 `generateStaticParams` 预构建页面是否生效，代码无法核实。

### 【总体判断】

**部分成立，但按文档原样实施达不到其验收指标。** 5.4（52 处数字替换）与 5.2 的两处 segment config 改动在代码层面可行；5.1 方向正确但会话前缀清单不全；5.2 的失效链路断在 Hero 写路由；5.3 存在 CDN 缓存语义冲突，且请求清单与「范围误设」论证都不完整。三件事必须在实施前澄清：

1. **5.3 的 `s-maxage=300`/`stale-while-revalidate=600` 与 `revalidatePath` 冲突**：「后台写入后立即失效」与 CDN 缓存不可兼得，需明确接受 5 分钟 TTL，还是改用按需 purge / cache tag；同时用 `curl -I` 验证 `headers()` 对 Route Handler 是否真的生效、同名 `Cache-Control` 是否被覆盖。
2. **5.1 收窄 matcher 前必须把 `/api/auth/session`（及 login/logout）与公开页面 AuthProvider 链路纳入验证**：确认一小时后 admin 不被登出；`(en)` 路由组不是问题，问题在 `/api/auth/*`。
3. **整改范围必须补上 `/api/site-content` 与 Hero 写路由**：三处 `cache:'no-store'` 客户端请求和 `PUT /api/admin/site-content` 的失效调用不补齐，5.2 验收与七章 Function Invocations 目标都不成立；同时确认 `/api/editorial` 是否还有实际消费者，再决定它是否该进 P0。

---

## 二、平台口径与方案可行性审计

本次仅只读（Read / WebFetch / WebSearch / Glob），未修改、创建、删除任何文件。第三方来源已单独标注。

### 【平台口径已确认】

**1. 第二章额度表：数值全部与官方一致，无一处不符。**
官方文档 `https://vercel.com/docs/plans/hobby`（Last updated September 14, 2026）原句：

> "Active CPU 4 CPU-hrs｜Provisioned Memory 360 GB-hrs｜Function Invocations First 1,000,000｜CDN Requests First 1,000,000｜Fast Origin Transfer First 10 GB｜Fast Data Transfer First 100 GB｜Image Transformations First 5,000｜Image Cache Reads First 300,000｜Image Cache Writes First 100,000｜Speed Insights Events 10,000 events over the last 30 days, shared across the team"

点名的四项：`Active CPU 4 CPU-hrs`、`Provisioned Memory 360 GB-hrs`、`Image Transformations 5,000`、`CDN Requests 1M` 均一致。`https://vercel.com/pricing` 亦为 "5K / month included"、"1M / month included"。表格不完整（官方另有 Global Config Reads 100K、Web Analytics 50K、Workflow Events 50K、Connect Token Requests 500 等），但不影响暂停判定。

**2. Image Transformations 超额不触发暂停，只让新请求 402。文档第 12、37 行正确。**
`https://vercel.com/docs/image-optimization/limits-and-pricing` 原句：

> "Once you exceed the limits: New images will fail to optimize and instead return a runtime error response with 402 status code. This will trigger the `onError` callback and show the `alt` text instead of the image / Previously optimized images have already been cached and will continue to work as expected, without error"
> "You will not be charged for exceeding the usage limits"

**3. Next.js 16 `proxy.ts` 的三点，逐条核实（决定 4.1 是否成立）：**

| 断言 | 官方依据 | 结论 |
|---|---|---|
| 仅 Node.js runtime | `https://nextjs.org/docs/app/api-reference/file-conventions/proxy`："Proxy defaults to using the Node.js runtime. The `runtime` config option is not available in Proxy files. Setting the `runtime` config option in Proxy will throw an error."；Version History "v16.0.0 Middleware is deprecated and renamed to Proxy. Proxy defaults to the Node.js runtime" | 实质成立。措辞应为「默认且不可改为 Edge」，非「仅」 |
| 按 Fluid compute 计 Active CPU | `https://vercel.com/kb/guide/optimize-active-cpu-on-fluid-compute`："Routing Middleware also uses Fluid compute, and Active CPU pricing, so disabling Fluid for regular Functions does not, by itself, remove every Active CPU source."；`https://vercel.com/docs/routing-middleware`："Routing Middleware is priced using the fluid compute model" | **成立** |
| 在 CDN 缓存之前执行 | `https://vercel.com/docs/routing-middleware`："Because it runs globally before the cache, Routing Middleware is an effective way of providing personalization to statically generated content."；Next.js proxy 文档执行顺序："1. `headers` from `next.config.js` 2. `redirects` 3. Proxy 4. `beforeFiles` 5. Filesystem routes" | **成立** |

→ 文档 4.1 主体成立；但「计入 Function Invocations」不成立，见口径错误 E2。

**4. `headers()` 对 Route Handler 生效。** `https://nextjs.org/docs/app/api-reference/config/next-config-js/headers`："However, you can set `Cache-Control` headers for other responses or data."；`https://vercel.com/docs/caching/cache-control-headers` 给出 `/api/about` 的 `next.config.js` 实例："For the function example, request `/api/about` instead."

**5. `revalidate` 语义。** `https://nextjs.org/docs/app/guides/caching-without-cache-components`：
- `0`："Ensure a layout or page is always dynamically rendered even if no Request-time APIs or uncached data fetches are discovered."
- `N`："Set the default revalidation time for a layout or page... This option does not override the `revalidate` value set by individual `fetch` requests."
- `https://nextjs.org/docs/app/api-reference/file-conventions/route`："`v15.0.0-RC` The default caching for `GET` handlers was changed from static to dynamic"，且该页 `Revalidating Cached Data` 示例正是 `export const revalidate = 60` 的 Route Handler。
- 已读 `next.config.ts`：项目**未启用** `cacheComponents`，故 `revalidate` 未被 v16 移除（`https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config`："v16.0.0 `dynamic`, `dynamicParams`, `revalidate`, and `fetchCache` removed when Cache Components is enabled"）。方案里 `revalidate = 300` 有效，但有效意味着它会把 GET Handler 变回可静态/ISR 输出，见 P0-3。

**6. 402 与 503 是两种不同状态。** `https://vercel.com/docs/errors/deployment_disabled`："402 DEPLOYMENT_DISABLED: Payment required"，troubleshoot："Check your usage... The fastest solution is to upgrade to the Pro plan"；`https://vercel.com/docs/errors/deployment_paused` / `https://vercel.com/kb/guide/why-is-my-account-deployment-blocked`："visitors see a `503 DEPLOYMENT_PAUSED` error"。现场 402 属前者。

**7. 暂停冻结新旧部署。** `https://vercel.com/docs/functions/usage-and-pricing/legacy-pricing`："When your Hobby team is set to paused, it remains in this state indefinitely unless you take action. This means all new and existing deployments will be paused."（注意：该页自述 "This page describes the legacy billing model and relates to functions which do not use Fluid Compute"）

**8. 缓存与计量的关系。** `https://vercel.com/docs/caching/cache-status`："`HIT` The response was served directly from the cache, with no function invocation or origin fetch needed."；`https://vercel.com/docs/manage-cdn-usage`："Static assets and functions all incur CDN Requests."；legacy-pricing："Caching your Vercel Function reduces the GB-hours of your functions but does not reduce the Edge Request usage that comes with executing it." → **CDN Requests 不会因缓存下降，文档第七章未把它列为目标，没说错。**

### 【文档的口径错误】

**E1｜「不设月度额度、不参与暂停判定的读数：ISR Reads 54K、ISR Writes 61K」**（第 39 行）
→ 官方 `https://vercel.com/pricing`："ISR Reads 1M / month included"、"ISR Writes 200k / month included"；`https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing`："ISR Reads and Writes are priced regionally"、"The total amount of Write Units used to durably store new ISR data, measured in 8 KB units"、"When revalidation runs and the content hasn't changed from the previous version, no ISR write units are incurred."
→ 应改成：Hobby 有 ISR Reads 1M / Writes 200K 月度包含额度；61K 是**8KB 写入单元数**而非重渲染次数，且只在内容变化时产生；`app/api/home/summary/route.ts:208` 含 `new Date().getFullYear()`，官方明确警告 "Check that you're not using `new Date()` in the ISR output"，这才是 61K 的疑似成因，文档未查。**ISR 超额是否直接触发账号暂停：未找到官方一手依据**（第三方旁证 dev.to / sabaoon.dev 称 Hobby 会暂停该 feature，需标明为旁证）。文档 4.4「ISR Writes 61K 与该重渲染频率相符」口径错误。

**E2｜「面板 Edge Middleware Invocations = 0 与该结论一致：proxy 未走 Edge 计费口径，其开销计入 Functions」**（第 92 行）
→ 官方 `https://vercel.com/kb/guide/optimize-function-invocations`："Middleware invocation counts appear in a separate Middleware observability tab rather than the Vercel Functions tab"。Active CPU 归属有依据（见已确认 3），但**Invocations 归属无依据**。
→ 应改成：proxy 按 Fluid compute 计 Active CPU / Provisioned Memory，其调用计数在独立 Middleware 面板；`Edge Middleware Invocations = 0` 只证明未走 Edge runtime，不能推出「计入 Function Invocations」。这直接影响第七章「Function Invocations 降到 100K 以下」的估算——P0-1 省的主要是 CPU，不一定省这个指标。

**E3｜「账号暂停中，全站 HTTP 402」**（第 6 行、3.1）
→ 官方见已确认 6。402 是 `DEPLOYMENT_DISABLED`，503 才是 `DEPLOYMENT_PAUSED`。
→ 应改成：「deployment disabled（402 / Payment required）」，不要与「paused（503）」混称；文档第八章用 `vercel-docs.vercel.sh` 镜像域名 + legacy 页作依据，应换成 `vercel.com/docs/errors/deployment_disabled` 与现行 KB。

**E4｜「2026-12-03 是 30 天额度窗口到期日」「需在 dashboard 逐项目执行 Resume Project」**（第 207 行）
→ 官方 `https://vercel.com/docs/plans/hobby`："In most cases, if you exceed your usage limits on the Hobby plan, you will have to wait until 30 days have passed before you can use the feature again."；Vercel Staff 在 `https://community.vercel.com/t/how-to-unpause-usage-after-deleting-a-massive-project/44020`（官方人员答复，非 docs/KB）："you need to wait until usage in the rolling 30 day window falls back below the limit. Please request that your account be un-paused at vercel.com/help"；KB FAQ："Paused projects resume one at a time, never automatically."
→ 应改成：**「额度恢复」= 滚动 30 天窗口内用量回落**（每天滑动，无「到期日重置」）；**「项目恢复」= 手动操作**，二者不同，文档标题「恢复不等于自动上线」方向正确。但「Hobby 团队级超额暂停可在 dashboard 逐项目 Resume」**未找到官方明确依据**：KB 那段 Resume 说明写在 "How to fix a deployment paused by Spend Management"（Pro）章节下，官方 Staff 口径是 vercel.com/help 请求解封或升级 Pro；社区用户报告 "The dashboard only offers 'Upgrade to Pro' and there is no resume option"（`https://community.vercel.com/t/request-to-unpause-hobby-team-jykim0048s-projects/51823`，第三方旁证）。

**E5｜「同名 Cache-Control 与 Route Handler 自行设置的响应头存在合并顺序问题」**（5.3 前置校验）
→ 不是「合并顺序」，是**优先级覆盖**。`https://vercel.com/docs/caching/cdn-cache`："if you return `Cache-Control` headers in a Vercel Function, it will override the headers defined for the same route in `vercel.json` or `next.config.js`"；`https://vercel.com/docs/caching/cache-control-headers`："Functions have priority over config files: `Cache-Control` headers returned from Vercel Functions take priority over `Cache-Control` headers from `next.config.js` or `vercel.json` files."；优先级链："`Vercel-CDN-Cache-Control` > `CDN-Cache-Control` > `Cache-Control`"。三者并存时：`export const revalidate` 属于框架派生层，Vercel 自动管理（ISR 文档："Vercel's CDN applies the right caching strategy based on your framework code. It manages `Cache-Control` headers automatically."），函数/框架派生头压过 `headers()`；`headers()` 数组内部同名才是 "Header Overriding Behavior: ... the last header key will override the first"（nextjs headers）。
→ 应改成：明确写出覆盖链；且**本地 `next start` 验证不了**——官方 `https://vercel.com/docs/caching/cache-control-headers`："After you deploy, check the response with `curl`. Vercel consumes `s-maxage`, so the browser receives `cache-control: public, max-age=0, must-revalidate` instead of your value. Request the page twice and check that `x-vercel-cache` changes from `MISS` to `HIT`"。

**E6｜「把三条接口路径纳入作废清单即可让后台写入后立即失效，不依赖 TTL 自然过期」**（5.3）
→ 官方 `https://nextjs.org/docs/app/api-reference/functions/revalidatePath`："Route Handlers: Marks the path for revalidation. The revalidation is done on the next visit to the specified path."；`https://vercel.com/docs/caching/cache-status`："`REVALIDATED`: The cached entry had been deleted, so Vercel regenerated the response from your origin in the foreground... An entry is deleted on demand through ... `revalidatePath()`"；`https://vercel.com/docs/incremental-static-regeneration` 对比表："On-demand purging & regeneration: ISR ✓ / Caching Headers **Limited**"，且 "With `Cache-Control` headers alone, Vercel doesn't know a path is cacheable until it receives the response, so these features [300ms global purges] aren't available"；`https://vercel.com/docs/caching/cdn-cache/purge`："Cache keys are not configurable. To purge the cache you must configure cache tags."
→ 应改成：`revalidatePath()` 对 ISR 框架缓存可删条目，但生效是「下次访问前台重生成」，不是「立即」；对**纯 `s-maxage` CDN 缓存**的按需清除是 "Limited"，需 `Vercel-Cache-Tag` + `invalidateByTag()` / purge API。断言不成立。

**E7｜「本计费周期结束后归零」「额度周期」**（第 37 行、4.5）
→ 官方 `https://vercel.com/docs/plans/hobby`："As the Hobby plan is a free tier there are **no billing cycles**." 计量是 rolling 30 天窗口。
→ 应改成「滚动 30 天窗口内该读数回落」，Hobby 无「计费周期」概念。

**E8｜「不存在月度 CPU 分钟配额」「Blob Data Storage 不设月度额度」**（第 39 行）
→ `https://vercel.com/pricing`："Blob Storage Size 1 GB / month included"、"Build minutes: Basic machines Included"；`https://vercel.com/docs/limits`："Hobby teams get a monthly allotment of each billable resource"、"The maximum duration of the Build Step is 45 minutes... The 45-minute limit is the **same on the Hobby, Pro, and Enterprise plans**"（`https://vercel.com/docs/builds`）。
→ 应改成：45 分钟是全计划通用 Build Step 上限，非 Hobby 特有；Blob 有 1GB 包含额度；Build CPU Minutes 的具体月度数值**未找到官方依据**（仅 "Included"）。

### 【方案可行性问题】

**P0-1 收窄 proxy matcher｜方向成立，但三处需改/需验**
- 依据成立：`https://vercel.com/docs/routing-middleware`："Without a matcher, your Routing Middleware runs on every request, including requests for static files. This adds latency and cost to each request."；`https://vercel.com/docs/manage-cdn-usage#middleware`："If using Middleware, it is possible to accrue Fast Origin Transfer twice for a single Function request. To prevent this, you want to only run Middleware when necessary."
- **依据引错**：第八章把 `https://vercel.com/docs/routing-middleware` 当作 Next.js 16 proxy 计费依据，该页明说 "You can't use `proxy` with frameworks that build their own routing middleware, such as Next.js... In Next.js 16 and later, add a `proxy.ts` file at your project root instead"，讲的是 vercel.json `proxy` 产品。应改引 `https://vercel.com/kb/guide/optimize-active-cpu-on-fluid-compute`。
- **会失败处**：Next.js 官方警告 `https://nextjs.org/docs/app/api-reference/file-conventions/proxy`："Server Functions are not separate routes in this chain... A matcher change or a refactor that moves a Server Function to a different route can **silently remove Proxy coverage**. Always verify authentication and authorization inside each Server Function"。收窄到 `/admin`、`/api/admin` 后，落在其他路径的 Server Function 会失去保护。
- **遗漏路径**：已读 `app/api/auth/{login,logout,session}/route.ts` 存在三者；文档只说 login/logout「不依赖 proxy」（核实：二者确实自建 `createServerClient` 并写 cookie，成立），但**未提 `/api/auth/session`**。而 `proxy.ts:8-11` 注释明确 "API routes cannot persist rotated tokens (their cookie adapter is read-only), so without this proxy the server-side session dies after the first hour"。验收只测「/admin 登录后一小时」不足，须补测 session 读取与 token 轮换。
- **指标口径**：P0-1 省的是 Active CPU，不必然降低 Function Invocations（E2）。

**P0-2 首页改 ISR｜方向成立，但作废链路不可靠**
- 依据成立：`https://vercel.com/docs/incremental-static-regeneration`："Next.js (App Router) Export `revalidate` from a route segment"；`https://vercel.com/kb/guide/optimize-active-cpu-on-fluid-compute`："Caching can reduce Active CPU when responses are safe to cache. Requests served from the CDN cache do not invoke the function."
- **会失败处 1**：已读 `app/(en)/page.tsx:20` 为 `force-dynamic`，服务端读 `getHomepageHeroMedia` / `getPublicArchiveCounts`（DB，非 fetch）。改 `revalidate = 300` 后在 classic model 下会被**预渲染**，build 期执行 Supabase 查询，首个响应是 build 快照；文档未评估 build 期凭据与数据。
- **会失败处 2（最严重）**：已读 `lib/revalidate-content.ts:22-25` 自带注释 "revalidatePath throws when called outside a static-generation context (\"Invariant: static generation store missing\")... every call is guarded and failures are logged, never thrown"，`DOOR_PAGES` 中没有 `'/'`，`DOOR_PATTERNS` 中无语言前缀首页 pattern。也就是说文档 5.2 / 5.3 依赖的「纳入作废清单即立即生效」前提，在现有代码里**可能大量静默失败**，且双语言两套路由（`app/(en)` 与 `app/[lang]`）用同一批字面量路径作废，官方 `https://nextjs.org/docs/app/api-reference/functions/revalidatePath`："revalidatePath operates on the route file structure, not the URL visible to users. Cache entries are tagged based on which route file renders them." 必须先验证 25 次调用真的生效。
- **验收写法**：静态预渲染返回 `PRERENDER` 而非必然 `HIT`（`https://vercel.com/docs/caching/cache-status`）；「刷新立即显示新图」应按 `REVALIDATED` 前台重生成来验，不是「立即失效」。

**P0-3 三个公开读接口恢复 CDN 缓存｜写法本身需要改，不是「前置校验」能解决**
- **混用了两套互斥机制**：同时设 `headers()` 的 `s-maxage=300` 与 route.ts 的 `export const revalidate = 300`。`https://vercel.com/docs/caching/cdn-cache/purge`："Don't set `Vercel-CDN-Cache-Control` on Next.js pages and routes that ISR already caches. Vercel derives the cache headers for those routes from your framework code... The header is still the right tool in a Next.js Route Handler or API route whose response you cache yourself." **必须二选一**：走 ISR 就删掉 `headers()` 那条；走纯 CDN `s-maxage` 就保留 `revalidate = 0` 并给 cache tag。现在两者并存，`stale-while-revalidate=600` 会被框架派生头覆盖，不生效。
- **`revalidate = 0 → 300` 的副作用**：把 GET Handler 从动态变回可静态/ISR，新增 build 期取数与 **ISR 持久化写入**，与第七章「ISR Writes < 10K」目标冲突；且 `app/api/home/summary/route.ts:208` 的 `new Date()` 会让每次重验证产生 write unit（官方 ISR pricing 明确警告）。
- **`Pragma` 未处理**：已读 `next.config.ts:119-124`，`/api/:path*` 除 `Cache-Control: NEVER` 外还设了 `Pragma: no-cache`。文档只说排除 `no-store` 规则。官方 `https://vercel.com/docs/caching/cache-control-headers`："When Vercel's CDN receives a request with `Pragma: no-cache`... it will revalidate any stale resource synchronously"。必须整条规则排除，而非只改 Cache-Control。
- **缓存可缓存条件**：`https://vercel.com/docs/caching/cdn-cache`："Response doesn't contain the `set-cookie` header"、"Request doesn't contain `Authorization` header"、"Response doesn't contain the `private`, `no-cache` or `no-store` directives"、"Response doesn't contain a `Vary` header naming a high-cardinality header, such as `Cookie`"。P0-1 后三条路径不再经 proxy（proxy 会写 cookie），有利；但需确认 admin client 不产生 Set-Cookie。
- **「函数仅在缓存过期时执行」错误**：`https://vercel.com/docs/caching/cache-status`："`STALE`: The cache served an existing response that's no longer fresh, then regenerated it in the background by **re-invoking your function** or origin." 设 `stale-while-revalidate=600` 后，SWR 窗口内每次请求仍触发后台函数执行，吃 Active CPU。
- **前置校验方法错误**：本地 `next build && next start` 无 Vercel CDN 层，验证不了覆盖/剥离/`x-vercel-cache`。官方要求部署后 curl 两次（见 E5）。

**P1-1 放大 ISR 周期｜方向对，收益估算不成立**
- 官方推荐成立：`https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing`："For content that rarely changes, set a longer time-based revalidation interval"、"If you have events that trigger data updates, use on-demand revalidation instead of short revalidation intervals"。
- **但 61K → 5K 不成立**：(a) ISR Writes 是 8KB 单元且内容不变不产生写入；(b) 22 个写调用点 × 单次 25 条 `revalidatePath` 的 on-demand 作废**不受 TTL 影响**，且 `https://vercel.com/docs/caching/cdn-cache/purge`："purging can temporarily increase related usage, such as **Active CPU**, Provisioned Memory, **Function Invocations**... and **ISR Writes**"；(c) P0-3 反而新增 3 条 ISR 路由写入；(d) 61K 未超 Hobby 200K 额度，列为整改目标无平台必要性。

### 【遗漏风险】

**1. ISR 后台/按需重验证吃 Active CPU（文档 4.4 完全没算）。** `https://vercel.com/kb/guide/optimize-function-invocations`："ISR reduces invocations by serving cached content, but the Function still runs during background or on-demand revalidation."；`https://vercel.com/docs/incremental-static-regeneration`："Function invocations: ISR functions run whenever they revalidate in the background or through on-demand revalidation"。52 页 × 5 分钟 + 22×25 作废是持续 CPU 来源。

**2. RSC / prefetch 请求放大。** `https://vercel.com/kb/guide/optimize-function-invocations`："Traffic volume can rise unexpectedly due to framework prefetching and React Server Component (RSC) requests: navigations and prefetches fetch server-rendered payloads for the destination route... setting `prefetch={false}` on a `<Link>` disables viewport and hover prefetching"；`https://nextjs.org/docs/app/api-reference/components/link`："Prefetching is only enabled in production"。文档 4.5 只提 bot，未提 prefetch；首页大量 `<Link>` 的 prefetch 在旧 matcher 下每个都触发 proxy 函数。P0-1 顺带解决，但文档未计入收益/风险。

**3. bot / 自动化流量。** 同上 KB："Automated clients can concentrate requests on dynamic routes"。文档 4.5 提到「尚不能排除」但未列 Firewall / Bot Management 措施。

**4. 冷启动与后台工作。** `https://vercel.com/kb/guide/optimize-active-cpu-on-fluid-compute`："Active CPU increased with errors or **cold starts** → Process errors or repeated initialization"、"If cold starts or Node.js process stops rise, inspect the startup and module-scope initialization"、"CPU-intensive background work still consumes Active CPU"（`after()` / `waitUntil()`）。**冷启动本身是否计费的明确一句原句：未找到官方依据**，仅上述间接表述。

**5. CDN Requests 不下降，且 Fast Origin Transfer 可能因 SWR 上升。** 已确认 8。文档未说错，但收益表应显式写明「354K CDN Requests 保持」，否则易被误读为所有指标同步下降。

**6. 公开数据被缓存进含用户态响应的风险。** 代码核查确认 `/api/home/summary` 用 service role、不读 cookie ✓，文档「不含用户态」当前成立。但这是**约定而非机制保护**：
- `https://vercel.com/docs/caching/cdn-cache`："CDN Cache isn't the right fit when: You need user-specific content without the `Vary` header"、"Responses include sensitive user data"；"Vercel's CDN doesn't cache a response whose `Vary` names one of these headers [`Cookie`]... serving a stored copy to a different visitor would return one visitor's content to another."
- `https://vercel.com/docs/caching/cache-status`："`Vary key denied`... `vary_key_denied:cookie`"。
- 一旦将来某接口读会话却未设 `Vary`（且无 Set-Cookie），CDN 会串号；若设 `Vary: Cookie` 则直接不缓存（`https://vercel.com/docs/caching/cache-control-headers`："For per-user responses use `private` instead, because a `Vary` on `Cookie` isn't cacheable"）。
- **`s-maxage` 与 `Vary` 注意点**：`https://vercel.com/docs/caching/cdn-cache`："The `Vary` header only has an effect when used in combination with `Cache-Control` headers that enable caching (such as `s-maxage`). Without a caching directive, the `Vary` header has no behavior."；"Vercel's CDN already includes the `Accept` and `Accept-Encoding` headers as part of the cache key by default"；"Set `Vary` on the routes that need it rather than globally in middleware or a proxy, so one header doesn't make every route uncacheable"。双语言站点若 API 内容随 `Accept-Language` 或语言 cookie 变化，必须设窄基数 Vary 或用 URL 区分。
- **实施时最危险一步**：`/api/:path*` 是通配 `no-store` 规则。若用「排除式」负面 lookahead 写错，`/api/admin/**`、`/api/auth/**` 会被放行成 `public, s-maxage`。应改为**白名单式**：仅给三条精确路径设 s-maxage，其余 `/api/:path*` 保持 `NEVER` + `Pragma`。文档 5.3 未给出具体 source 写法。

### 【总体判断】

**能否回到 4 CPU-hrs 以内：方向可能，但文档给出的收益数字在机制上站不住，不能作为验收承诺。**
- Active CPU 下降有官方机制依据（"Caching can reduce Active CPU when responses are safe to cache. Requests served from the CDN cache do not invoke the function." + "Routing Middleware also uses Fluid compute, and Active CPU pricing"），P0-1/2/3 命中了主要浪费点。但「1/5～1/10」是未做 route 级归因的猜测——官方两份 KB 都要求先 "Rank routes by route-level usage" 与 "Return route evidence and a baseline before recommending changes"，文档则是从「缓存链路断开」反推。剩余 CPU 来源（ISR 重验证、作废前台重生成、SWR 后台刷新、RSC/prefetch、bot、冷启动）全未计入。
- **Function Invocations < 100K 不必然**：proxy 调用在独立 Middleware 面板（E2），且 "Invocations: Counts regardless of request success or failure"（`https://vercel.com/docs/functions/usage-and-pricing`），402/MISS/STALE/REVALIDATED 都计数。
- **ISR Writes < 10K 机制上不成立**：P0-3 新增 ISR 写入、on-demand 作废不受 TTL 影响、61K 本身未超额。
- **CDN Requests 354K 不会下降**（文档没说错，但收益表需注明）。

**实施前最需要验证的三件事：**
1. **恢复后先做 route 级归因**：按 `https://vercel.com/kb/guide/optimize-active-cpu-on-fluid-compute` 与 `.../optimize-function-invocations` 把 8h19m 拆到 proxy / 首页 SSR / 三个 API / 52 页 ISR 重验证 / prefetch-RSC / bot，并确认 `cacheComponents` 未启用（已核实未启用）。特别不能用 `Edge Middleware Invocations = 0` 推断 proxy 计入 Functions。
2. **在真实 Vercel 部署上定死 P0-3 的缓存层**：二选一（ISR `revalidate=300` 删 `headers()` 规则，或纯动态 + `s-maxage` + `Vercel-Cache-Tag`），部署后 curl 两次核对 `x-vercel-cache` / `Cache-Control` / `Pragma` 是否整条排除、`s-maxage` 是否被函数派生头覆盖；并实测 `revalidatePath` 作废后是 `REVALIDATED` 回源而非旧数据、确认 `lib/revalidate-content.ts` 的 try/catch 没有静默吞掉 "static generation store missing"。
3. **验证 P0-1 不破坏鉴权、白名单不误伤**：按 Next.js 官方 "silently remove Proxy coverage" 警告逐项查 Server Functions、`/api/auth/session` 的 token 轮换（对照 `proxy.ts:8-11` 的 read-only cookie adapter 说明），并把 `headers()` 改成三条精确路径白名单，确保 admin/auth 响应仍是 `private, no-store`。

**未找到官方依据的条目（汇总）**：Hobby 团队级超额暂停可在 dashboard 逐项目 Resume；ISR Reads/Writes 超额是否直接触发账号暂停（仅第三方旁证）；冷启动计费的明确原句；Build CPU Minutes 的月度数值额度。
