# i18n 路径式改造方案（/en/ /zh/ /th/ /es/ /pt/）

日期：2026-10-26 · 状态：**待拍板，未动手**
前置：阶段 0 全部完成（canonical/品牌/About/JSON-LD/sitemap index）；gallery 已 SSR；图片站地图已上线。

---

## 0. 目标（一句话）

让 zh / th / es / pt 四个语言版本**作为独立 URL 被 Google 收录**（现在服务端永远只渲染英文，其它语言搜索引擎完全看不见），并给全站挂 hreflang 互链。英文保持现状 URL 不动。

## 1. 架构决策与理由

### 1.1 英文不加前缀，root 即英文（已定）

- 现有 URL（`/editorial`、`/gallery`…）一行不变，已收录的页面零迁移、零 308；
- 新增 `app/[lang]/` 只接受 `zh` / `th` / `es` / `pt`，其它值 404；
- 结果形态：`/editorial`=英文，`/zh/editorial`=中文，`/th/editorial`=泰文，`/es/editorial`=西语，`/pt/editorial`=葡语（巴西）。

### 1.2 语言真相源：从 URL 派生（替换 localStorage 主源）

- `LanguageProvider` 已支持 `defaultLang` 参数——`app/[lang]/layout.tsx` 直接用路由段种子化；
- 客户端组件（37 个 `useLanguage` 消费者）在 SSR 时跟着 provider 走 → **`/zh/...` 的 SSR HTML 直接是中文**，这是本次改造解决收录的核心机制；
- localStorage 降级为辅助（记住偏好、根路径跳转用），不再是语言真相源；
- 根布局的内联防闪烁脚本改为"先读 URL 前缀、再读 localStorage"。

### 1.3 [lang] 薄壳复用，不引第三方库（next-intl 不采纳）

- 数据获取逻辑已全部在 lib 层（`lib/door-data.ts`、`lib/timeline.ts`、`lib/data/*`），[lang] 壳页调用同一批函数、渲染同一批组件，只多传一个 `lang`；
- 拒绝 middleware rewrite + `headers()` 方案：读 header 会把全部页面踢出 ISR 变成动态渲染，代价大于收益；
- 拒绝全站迁入 `app/[lang]/` 再把 en rewrite 回 root：迁移面更大且影响已收录 URL。

### 1.4 内容（DB i18n 字段）：按路由语言取，缺语种回退英文

- `getLocalizedText(text, lang)` 消费点（28 处）从"固定英文"改为传当前路由语言；
- zh/th 的 DB 内容已有大量积累（title_i18n 等一直在填）；**es 的 DB 内容为空，先全量回退英文，逐步补**——不阻塞上线；
- UI 词条（`lib/languages.ts`）：es 由我产出初翻（约 480 键），zh/th 已齐全。

## 2. SEO 配套（跟代码一起落）

| 项 | 做法 |
|----|------|
| hreflang | `pageMetadata()` 扩展 `alternates.languages`：en→`/x`、zh→`/zh/x`、th→`/th/x`、es→`/es/x`、pt→`/pt/x`、`x-default`→`/x`；五种语言版本两两互链 |
| canonical | 每种语言 self-canonical（`/zh/editorial` 的 canonical 是它自己）——语言互为翻译是 hreflang 的正常用法，不构成重复内容 |
| meta 文案 | `generateMetadata` 同样按路由语言出 title/description（标题模板后缀也按语言给：`\| LMSY Fan Archive` / 中文 / 泰文 / 西语 / 葡语版） |
| sitemap | 先不动（入口不变）。语言版本 URL 稳定收录后（预计 4-8 周）再评估是否把各语 URL 加进子表 |
| admin | 排除在 [lang] 外，单语不动 |

## 3. 施工步骤（一步一推送，每步可单独验证）

| # | 内容 | 量级 |
|---|------|------|
| 1 | `lib/languages.ts` 加 es 词条（UI 层初翻，zh/th 不动） | 文本量大、零风险 |
| 2 | [lang] 基建：`app/[lang]/layout.tsx`（校验+Provider 种子化）+ 防闪烁脚本改 URL 优先 + 3 个示范页（/editorial /gallery /people）本地验证"SSR HTML 真的是中文/西语" | 中 |
| 3 | 其余 ~21 个公开页薄壳铺开（同模式复制） | 量大但机械 |
| 4 | hreflang + canonical + localized meta（改 `lib/seo.ts` 一处 + 各 generateMetadata） | 小 |
| 5 | 语言切换器从 localStorage 切换改为 `<Link>` 前缀跳转 | 小 |
| 6 | 收尾：DB 文本消费点穿 lang、详情页 metadata localized | 中 |

## 4. 风险与不做的事

- **展示层零改动**：门的入口、卡片结构、空态、过滤规则全部原样——只动"文字从哪来"，不动"长什么样"；
- **es 内容缺口不造假**：DB 没有的西语文本回退英文展示，绝不机翻入库；UI 词条初翻我先出、你看效果；
- **流量小是优势**：迁移期间没有真实用户被 404 的风险窗口，Google 重抓期间新旧版本并存无害（root 英文始终在线）；
- 每步推送后我会在本地实测 SSR HTML 的语言真实性再推。

## 5. 你需要拍板的

1. **方案本身**是否 OK（尤其 1.1 root=英文不加前缀、1.3 不引 next-intl 这两条架构决策）；
2. **es 词条初翻**由我直接产出（约 480 条 UI 短句，泰语/中文不动）——要不要先抽 10 条给你看风格再全量出；
3. 开工顺序按第 3 节 1→6，还是你想调整。
