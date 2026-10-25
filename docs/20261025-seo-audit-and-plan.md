# LMSY.space SEO 全面体检 + 完整方案（v3 · 基于线上实测与代码核查）

> 日期：2026-10-25 ｜ 角色：SEO 专家「搜霸霸」
> 方法：逐页 curl 抓取线上 HTML + 代码核查，每条结论附实测证据；不拍脑袋。
> 站点事实：Next.js 16 + Vercel；图片存 Cloudflare R2（当前 2000+ 张，入库中，预计上万张）；元数据存 Supabase(`lmsy_archive`)。
> 语言决策（已定）：**英语保留为主站 SEO 语言 + 新增西班牙语**；越南语暂不做；泰语非 SEO 重点（受众不在泰国）。

---

# 第一部分 · 全面体检报告

## 体检总表（一眼看清）

| 维度 | 评级 | 一句话结论 |
|------|------|-----------|
| 爬取基础（robots/sitemap/HTTPS） | 🟢 通过 | robots 规范、sitemap 动态 202 条、全站 HTTPS |
| 渲染可索引性 | 🔴 重点 | 多数页是流式 SSR（内容进了 HTML）；但 gallery/talks/live/people 是纯客户端拉数据，图片不在 HTML |
| 多语言 / i18n SEO | 🔴 致命 | 语言靠 localStorage 客户端切换，**服务端永远只渲染英文**；全站 0 hreflang；zh/th/未来 es 都不被搜索引擎收录 |
| 页面元数据 | 🟠 中 | ~~33 页缺 metadata~~（v3.1 修正：大多数页面早已通过 `pageMetadata()` 带齐 title+description+canonical）；真实缺口：timeline/people 写死旧品牌缺 canonical、copyright 完全没有、people/[slug] 与 timeline/[year] 无 metadata |
| 结构化数据 | 🔴 致命 | 全站 0 个 JSON-LD（ImageObject/Person/Article/Breadcrumb 全缺） |
| 图片 SEO | 🟠 中 | alt 基本有、命名规范且语言中性（优点）；但无图片站地图；原图体积爆炸（最大 12MB） |
| 性能 / CWV | 🟠 中 | HTML/JS 不重（27–68KB）；风险全在图片体积；CLS 因有 width/height 尚可 |
| 内容 / E-E-A-T | 🟡 待补 | 缺 About 页；captions 需填充；内容仍在补档 |
| 规模化（上万张） | 🟠 中 | sitemap 单一文件架构撑不住；需 index 分片 + 爬取预算管理 |

---

## 1. 技术基础（已通过，保留即可）
- **robots.txt** ✅：线上 200；`Disallow: /admin`、`/api/`；正确声明 `Sitemap`。
- **XML Sitemap** ✅：线上 202 条，按数据库动态生成。分布：live-events 63 / appearances 55 / dramas 47 / editorial 17 / talks 6 / commercial 5 / live 4 / 静态 11。
- **HTTPS、metadataBase、自引用 canonical（多数页）、viewport、manifest、favicon** ✅ 均正常。
- **图片格式与 CDN** ✅：WebP/AVIF + Cloudflare R2 + Next/Image 懒加载已在。

## 2. 渲染可索引性（核心，已逐页实测）
对每个栏目抽样抓线上 HTML，统计"服务端到底渲染了几张 `<img>`"：

| 页面样本 | SSR 图片数 | 说明 |
|----------|-----------|------|
| /editorial/kazz-2025-02 | 10 | ✅ 流式 SSR，内容进 HTML |
| /timeline | 125 | ✅ 内容极丰富 |
| /commercial/sweet | 11 | ✅ |
| /live-events/concert | 8 | ✅ |
| /appearances/awards | 8 | ✅ |
| /dramas/harmony-secret | 4 | ✅（首屏批） |
| **/gallery** | **1** | 🔴 仅站标，纯客户端拉数据 |
| **/talks/interview** | **1** | 🔴 空壳 |
| **/live** | **1** | 🔴 空壳 |
| **/people** | **3** | 🔴 极少 |

**结论（修正前两版说法）**：不是"全站 CSR"。除 gallery/talks/live/people 外，**其余详情页是流式 SSR，内容确实在服务端生成、能被索引**。真正的"空壳"只有这 4 个客户端拉数据的页面——其中 **gallery（图库中枢）只有 1 张图最致命**。
**策略因此更精准**：gallery 等 4 页改成"服务端渲染首屏（gallery 本就 `PAGE_SIZE=60` 分页）"即可；其余页首屏已 OK，**长尾图片交给分片图片站地图**，不必全站大改渲染架构。

## 3. 多语言 / i18n SEO（致命，但前两版误判过）
实测 + 代码核查（`components/language-provider.tsx`、`lib/languages.ts`）：
- 语言完全靠 `localStorage.getItem('lmsy-language')` 在**客户端**切换；**服务端永远渲染 `defaultLanguage = 'en'`**。
- 全站 **0 个 `hreflang`**（逐页 grep 确认）。
- 代码里**只定义了 `en | zh | th`，没有西班牙语**。
- **推论（关键）**：Googlebot 不带 localStorage → 永远只看到英文版。**已做的 zh/th 版、以及打算加的 es 版，目前都不会被搜索引擎收录**——不是"缺 hreflang"那么轻，是架构根本没法把非英文喂给爬虫。

**受众数据（GSC）**：墨西哥 19% / 英国 12% / 美国 10% / 越南 6% / 澳洲 5%，泰国不在前 5 → **泰语不是 SEO 重点**（撤销 v1 说法）。

**关于"加西语不难"的精确区分**：你说得对——内容主体是语言中性的规范化图片（`LMSY-MAG-KAZZ2502-20250201-001.webp`），加西语主要是补 UI 串 + caption/title 的 `es` 字段，**内容侧成本确实低**。但**要让西语被 Google 收录，必须改 i18n 架构**（服务端按语言渲染 + hreflang），否则加了也搜不到。两件事分开算账。

## 4. 页面元数据与品牌（中；v3.1 已核实缩小范围）
- **v3.1 修正**：站点有 `lib/seo.ts` 的 `pageMetadata()` helper（title+description+自引用 canonical 三合一），绝大多数公开页面都在用——v3 的"33 页缺 metadata"统计有误（把用了 helper 的静态 metadata 页也算进去了）。真实缺口只有 5 处：
  - `app/timeline/page.tsx`、`app/people/page.tsx`：绕过 helper 写死 `"… | LMSY Archive"` 旧品牌 → **缺 canonical + 品牌不一致**（✅ 已修复，见执行进度）；
  - `app/copyright/page.tsx`：`'use client'` 无法导出 metadata → title/desc 全套根默认、无 canonical（✅ 已补 layout，见执行进度）；
  - `app/people/[slug]/page.tsx`、`app/timeline/[year]/page.tsx`：完全无 metadata（person/年份详情页拿根默认标题）→ 待做；
  - `resonance`/`whispers`：client 占位页、不在 sitemap，低优先级。
- 详情页标题做得好（如 "KAZZ 206 · 2025 年 2 月号 · Editorial"）。
- **"Official Fan Site" 自称官方** → 粉丝站建议改 "Fan Archive"，去 Official（待做）。
- **无 About 页**（grep 确认）→ E-E-A-T 短板（待做）。

## 5. 结构化数据（致命）
全站 **0 个 `application/ld+json`**（逐页确认）。缺：`ImageObject`、`Person`(Lookmhee/Sonya)、`Article`、`BreadcrumbList`、`WebSite`+`SearchAction`。白白放弃富结果展示位与实体识别。

## 6. 图片 SEO（中，优缺点并存）
**优点**：命名规范且语言中性（`LMSY-MAG-KAZZ2502-20250201-001.webp`）；alt 基本都填（实测详情页 10/10，alt=caption 已支持 i18n）；图片带 width/height（9/10）→ CLS 风险低。

**缺点**：
- **无图片站点地图**（sitemap-images/image-sitemap 等全部 404）→ 图片站最划算的曝光手段缺失。
- **原图体积爆炸**：实测 R2 原图 `KAZZ217…webp` = **1.77MB**，`PERLA…webp` = **11.99MB**。虽经 Next/Image 优化交付，但原图大会拖慢 LCP、浪费源站带宽。**建议入库质量降到 ~80，或对大图生成多档衍生图**。

## 7. 性能 / 核心网页指标（中）
HTML 27–68KB、脚本 31–35 个 → **HTML/JS 不是瓶颈**；风险全在图片体积（见 6）。CLS 因 width/height 尚可。真实 LCP/INP/CLS 待 GSC 接入后看实测。

## 8. 内容 / E-E-A-T（待补）
- 缺 About 页；已有 `/copyright`（保留并与图片来源打通——粉丝站重托管艺人照，版权是红线）。
- **captions 填充**：alt 依赖 caption，空 caption 退化为 "Gallery image" → 补档时确保每图有描述。
- 内容补档中 → 稀疏页难排名，但基础项不依赖内容完整性。

## 9. 规模化：上万张图（结构性）
- 单 sitemap 上限 5 万 URL/50MB → **必须升级为 sitemap index**，按门拆子表（drama/magazine/live/appearance/talk…），每表分页。**现在就搭架构**，避免后期返工。
- **爬取预算**：只把"策展公开"内容进 sitemap（复用 `portal_visible && curation_status!=='archived'`）；优先深抓"事件/项目详情页"（承载图片+文字的 SEO 目标页），而非无限滚动图库裸页。

## 10. 内链与架构（待内容级验证）
nav 是客户端组件 → 内链需渲染后验证；门→货架→事件三层结构本身利于内链，补档时确保每图链所属事件页、各门互链。

## 11. 受众与关键词机会
受众（GSC）：西 19% / 英 27%合计 / 越 6%，泰国不在前 5。非品牌词机会：`Lookmhee` / `Sonya` / 剧名 / `"Thai GL"` / `"LMSY photoshoot"`；西语对应词（如 `"Lookmhee Sonya fotos"`）是新增蓝海。

---

# 第二部分 · 完整方案（v3）

## 阶段 0 · 立即可做（低风险、高回报）
| # | 动作 | 难度 | 状态 |
|---|------|------|------|
| 0.1 | 给缺 metadata 的页面补齐（v3.1 核实后真实范围：`people/[slug]`、`timeline/[year]` 两处 `generateMetadata`；resonance/whispers 低优先） | 低 | 待做 |
| 0.2 | 统一品牌：去 "Official"，全站统一 "LMSY Archive"（timeline/people 两处已随 0.3 顺带修掉） | 低 | 部分 |
| 0.3 | 补自引用 canonical：`/timeline`、`/people`、`/copyright` 改用/接入 `pageMetadata()` | 低 | ✅ 已完成 |
| 0.4 | 加 About 页（谁运营、是否粉丝站、图片来源/致谢） | 低 | 待做 |
| 0.5 | 注册验证 **Google Search Console + Bing Webmaster**，提交 sitemap | 低 | 待做 |
| 0.6 | 加 JSON-LD：Organization / WebSite(+SearchAction) / Person(Lookmhee,Sonya) / BreadcrumbList | 低-中 | 待做 |
| 0.7 | **搭 sitemap index 架构**（按门拆子表 + 预留图片站地图分片），先用公开数据跑通 | 中 | 待做 |

## 执行进度（一项一推送）
- ✅ **#1（0.3 canonical + 顺带品牌修正）**：`timeline`/`people` 改用 `pageMetadata()`（title 去掉写死的 "| LMSY Archive"，description 原文保留）；新增 `app/copyright/layout.tsx`（复用页内既有英文文案 `copyright.title`/`copyright.intro`，无新造文案）。typecheck 通过。

## 阶段 1 · 核心修复（决定排不排得上）
| # | 动作 | 难度 |
|---|------|------|
| 1.1 | **gallery/talks/live/people 改"服务端渲染首屏"**（gallery 本就 60/页分页），长尾靠图片站地图 | 中-高 |
| 1.2 | **i18n SEO 架构**：服务端按语言渲染 + hreflang，让英文（默认）与西语可收录；不再只靠 localStorage | 高 |
| 1.3 | **图片站地图落地**：分片 `<image:image>`，只含策展公开图，喂 Google Images | 中 |
| 1.4 | **图片体积治理**：入库质量 ~80 / 大图多档衍生，消除 12MB 级原图 | 中 |

## 阶段 2 · 西班牙语落地（分两端，与你的判断一致：内容侧不难）
| # | 动作 | 难度 |
|---|------|------|
| 2.1 | **内容侧（轻）**：`lib/languages.ts` 加 `'es'`；补西语 UI 串；caption/title 填 `es` 字段（图片文件名不动） | 低-中 |
| 2.2 | **索引侧（重，依赖 1.2）**：西语经架构改造后被服务端渲染 + hreflang 收录，才真的搜得到 | 高（已含在 1.2） |
| 2.3 | 越南语暂不处理（他们看英语即可） | — |

## 阶段 3 · 内容与权威（长期，与补档同步）
| # | 动作 |
|---|------|
| 3.1 | 补档时每事件/项目写描述性文字 + 确保 caption 非空（alt 才有意义） |
| 3.2 | 内链：每图链所属事件页；各门互链；时间线/人物互链 |
| 3.3 | E-E-A-T：About + 图片来源致谢打通 /copyright |

## 阶段 4 · 监测与迭代（持续）
GSC 看索引覆盖率、搜索词曝光/点击、核心网页指标真实值；每周盯排名（分品牌/非品牌词）；关注算法更新，内容质量优先于技巧。

---

## 白帽纪律
不买外链、不堆关键词、不隐藏文字。**版权是红线**：`/copyright` 要清晰并与图片出处打通，直接影响 Google 信任度与 DMCA 风险。

---

## 本版（v3）相对前两版修正了什么
1. **撤销"泰语 SEO 金矿"**（v1 误判）：受众数据证明泰国不在前 5。
2. **修正"全站 CSR"**（v2 粗略）：实测多数页是流式 SSR（内容进 HTML），真正空壳只有 gallery/talks/live/people 4 页。
3. **修正"加西语高成本"**（v2 误判）：内容侧确实轻（图片语言中性）；真正成本在 i18n 架构改造（让西语可收录），已拆成"内容侧轻 + 索引侧重"两件事。
4. **本轮新增实测发现**：3 页缺 canonical、品牌不统一（people/timeline 写死 "LMSY Archive"）、无 About 页、原图最大 12MB、无图片站地图、zh/th 同样不被收录。

## 需要你拍板
- **i18n 架构（1.2）走哪条**：路径式（`/en/`、`/es/`）最规范但改路由多；还是 Accept-Language/服务端判定（改动小些）？
- **起步范围**：先动手做**阶段 0 全 7 项**（明确、低风险、可立即上线），还是连阶段 1 的"gallery 改 SSR + i18n 架构方案"一起细化给你看？
