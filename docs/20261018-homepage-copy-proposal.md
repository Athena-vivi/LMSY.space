# 首页情感表达与文案修正 —— 第一阶段：审计清单与文案草案

> 状态：**草案，未改任何前台代码。**
> 范围：首页五个区块 + 四个列表页引言 + 相关空状态。
> 不改：路由、分类值、数据结构、图片选择、版面结构、人物设定。

## 结论摘要

线上首页的**序言（MuseumPreface）其实已经是目标气质**——数据库里那段三段的文字正是「有些相遇会停留在热搜……」「愿你在这里重新遇见她们」的版本。

真正出问题的是**包在序言外面的那些区块**：`精选项目 / 值得先打开的那些。`、`选一个年份，按顺序走一遍档案。`、`人物与档案说明 / 两个人，以及这份档案是怎么被保存的。`。这三组是从「信息架构重建」时按功能写进去的，通篇是产品说明书语气，与序言的温度断开了。

所以本次不是重写，是**把区块外围的语言拉回序言的音高**，并让功能标签退回辅助位置。

---

## 一、审计清单（现有 → 问题 → 修正方向）

### A. Hero

| 位置 | 现有文案 | 问题 | 修正方向 |
|---|---|---|---|
| `hero.preface`（DB） | 有些相遇，早已写在星空中。 | 无 | **保留** |
| `hero.subtitle` | Lookmhee & Sonya | 人名，非文案 | **保留** |
| `hero` 大标题 | LMSY | 品牌名 | **保留** |
| `universeTitle`（DB） | 故事仍在展开 | 无 | **保留** |
| `universeSubtitle`（DB） | ……Astra 正在细心**采集**，这里正一点点变得璀璨。 | 「采集」是数据抓取的动作词，把策展写成了后台流程 | 换成「整理 / 亮起来」，保留 Astra 的第一人称 |
| `hero.scroll` | 滚动 | 功能性提示 | **保留** |

> Hero 结构不动。只改一句措辞。

### B. 序言（MuseumPreface）

| 位置 | 现状 | 问题 | 修正方向 |
|---|---|---|---|
| DB `homepage_preface` 全部字段 | 第一轨道 / 一座仍在生长的档案馆 / 三段正文 / 致所有 Besties / 策展署名 | 已是目标气质 | **保留，一字不改** |
| 代码兜底 `components/museum-preface.tsx` 内联 fallback | 仍是改版前那版 6 段长文（宇宙、流星雨、灯塔、黄与蓝） | 与线上内容不一致：接口一旦失败，首页序言会突然变成另一套语气 | 把 fallback 同步为线上这版三段文字（含 en / th） |

### C. 多维入口（Portals）

| 位置 | 现有文案 | 问题 | 修正方向 |
|---|---|---|---|
| `hero.portalsTitle` | 多维入口 | 已确立 | **保留** |
| `hero.portalsSubtitle` | 走进她们故事的不同维度 | 已确立 | **保留** |
| `portal.drama` | 戏剧 | 分类真名是 Drama & Works，卡片把「作品」丢了 | → 戏剧与作品 |
| `portal.dramaDesc` | 角色照进现实 | 口号，无信息 | → 从剧本里的角色，到她们留下的作品。 |
| `portal.editorial` | 杂志特辑 | 与分类一致 | **保留** |
| `portal.editorialDesc` | 封面、内页与写真书 | 物料清单 | → 封面、内页，和镜头前后更安静的那些时候。 |
| `portal.live` | 现场 | 指代不明（任何场合都叫现场） | → 现场演出 |
| `portal.liveDesc` | 时光共享的瞬间 | 空泛，且「瞬间」在序言已用过 | → 同一个晚上，一起待着的那几个小时。 |
| `portal.appearance` | 公开亮相 | 与分类一致 | **保留** |
| `portal.appearanceDesc` | 机场、红毯与公开行程 | 行程表语气 | → 机场、红毯，和镜头没准备好的时候。 |
| `portal.commercial` | 商务 | 内部说法 | → 品牌合作 |
| `portal.commercialDesc` | 品牌灵感的碰撞 | 广告语 | → 她们与品牌之间，短暂而准确的相遇。 |
| `home.explore`（卡片按钮） | 探索 | 目录动词 | → 走进去 |
| `home.collecting`（空格徽标） | 收录中 | 后台状态词 | → 还在整理 |

> 五个入口**一个都不隐藏**，空分类照旧显示，只换徽标措辞。

### D. Featured Projects

| 位置 | 现有文案 | 问题 | 修正方向 |
|---|---|---|---|
| `home.featuredTitle` | 精选项目 / Featured Projects | 用户明确点名不要的产品文案；在替读者做推荐 | → 她们走过的这几年 |
| `home.featuredSubtitle` | 值得先打开的那些。 | 同上，且是操作建议不是叙事 | → 作品、杂志、现场与品牌合作，从不同方向拼出同一条轨迹。 |
| 右侧链接 `nav.projects` | 作品 | 功能入口 | **保留** |
| 卡片内分类 / 日期 / 标题 | 来自数据 | 数据标记 | **保留，不与叙事混写** |

### E. Timeline

| 位置 | 现有文案 | 问题 | 修正方向 |
|---|---|---|---|
| `home.timelineTitle` | 时间线 | 页面名直接当区块标题，偏冷 | → 沿着时间往回走 |
| `home.timelineSubtitle` | 选一个年份，按顺序走一遍档案。 | 用户点名的说明书句 | → 每一年都还在原地，等你回去看一眼。 |
| `timeline.records` | {count} 条记录 | 数据标记 | **保留** |
| 年份格空态 | 收录中 | 同上 | → 还在整理 |
| 右侧链接 `nav.timeline` | 时间线 | 功能入口 | **保留** |

### F. People & Archive Story

| 位置 | 现有文案 | 问题 | 修正方向 |
|---|---|---|---|
| `home.peopleTitle` | 人物与档案说明 | 「说明」二字直接把它写成文档 | → 她们，与这座档案 |
| `home.peopleSubtitle` | 两个人，以及这份档案是怎么被保存的。 | 同上，用户点名 | → 两个人是起点；剩下的，是这些年一点点收进来的。 |
| `people.relatedProjects` | 相关项目：2 | 成了卡片上最抢眼的一行，把人写成了条目数 | → `{count} 个条目`，并降为等宽小字（代码里去掉冒号） |
| 人物名 / 角色标签 | 来自数据 | 数据 | **保留** |

### G. 各页引言（与首页共用同一套语气）

| 位置 | 现有文案 | 问题 |
|---|---|---|
| `projects.description` | 探索 Lookmhee 和 Sonya 的完整作品：剧集、杂志特辑、公开活动、日常与商业合作。 | 「探索 + 完整」是产品描述 |
| `gallery.description` | 一场视觉之旅，记录那些被时光捕捉的瞬间。 | 旅游宣传语，且「瞬间」重复 |
| `timeline.description` | 按实际发生时间排列的全部有日期记录。 | 数据字典定义 |
| `people.description` | 这份档案围绕的两个人。 | 平淡到没有语气 |
| 四个页面 title | 作品 / 相册 / 时间线 / 人物 | **保留**（导航一致性） |

### H. 空状态

| 位置 | 现有文案 | 问题 |
|---|---|---|
| `projects.emptyAll` | 暂无可展示的作品。 | 「暂无 + 可展示」是系统语气 |
| `gallery.emptyAll` | 档案中暂无图片。 | 同上 |
| `timeline.emptyYear` | 这一年还没有记录。 | 同上 |
| `people.noProjects` | 暂无已关联的项目。 | 「已关联」是数据模型术语 |

---

## 二、首页文案草案（完整）

### 1. Hero

**中文**
- 小字引句：有些相遇，早已写在星空中。（保留）
- 标题：LMSY ／ 副题：Lookmhee & Sonya
- 主句：故事仍在展开
- 正文：欢迎来到这片专属于她们的星空，亲爱的 Bestie。这里还在一点点整理，也在一点点亮起来。
- 滚动提示：滚动

**English**
- Preface: Some encounters are written in the stars.
- Title: LMSY / Lookmhee & Sonya
- Statement: The Story Keeps Unfolding
- Body: Welcome to this stretch of sky that belongs to them, dear Bestie. It is still being sorted, and still lighting up, a little at a time.
- Scroll: SCROLL

**ไทย**
- คำนำ: การพบกันบางครั้งถูกเขียนไว้บนดาว
- เรื่องราวยังคงคลี่คลายต่อไป
- ยินดีต้อนรับสู่ท้องฟ้าผืนนี้ที่เป็นของพวกเธอ Dear Bestie ที่นี่กำลังถูกจัดเรียง และค่อย ๆ สว่างขึ้นทีละนิด

### 2. 多维入口

**中文** — 标题：多维入口　副标题：走进她们故事的不同维度

| 分类 | 标题 | 辅助文案 | 按钮 |
|---|---|---|---|
| Drama & Works | 戏剧与作品 | 从剧本里的角色，到她们留下的作品。 | 走进去 |
| Editorial | 杂志特辑 | 封面、内页，和镜头前后更安静的那些时候。 | 走进去 |
| Live Events | 现场演出 | 同一个晚上，一起待着的那几个小时。 | 走进去 |
| Public Appearances | 公开亮相 | 机场、红毯，和镜头没准备好的时候。 | 走进去 |
| Commercial | 品牌合作 | 她们与品牌之间，短暂而准确的相遇。 | 走进去 |

空分类徽标：**还在整理**

**English** — Portals / Enter different dimensions of their story

| Category | Title | Line |
|---|---|---|
| Drama & Works | Drama & Works | From the roles on the page to the works they left behind. |
| Editorial | Editorial | Covers, spreads, and the quieter hours around the lens. |
| Live Events | Live Events | One evening, the same few hours, spent together. |
| Public Appearances | Public Appearances | Airports, red carpets, and the moments nobody scheduled. |
| Commercial | Commercial | Brief, precise meetings between them and a brand. |

Button: **Step inside**　Empty badge: **Still being gathered**

**ไทย** — ประตูหลายมิติ / ก้าวเข้าสู่มิติต่าง ๆ ในเรื่องราวของพวกเธอ

| หมวด | ชื่อ | คำอธิบาย |
|---|---|---|
| ละครและผลงาน | ละครและผลงาน | จากตัวละครในบท สู่ผลงานที่พวกเธอทิ้งไว้ |
| นิตยสาร | นิตยสาร | ปก ในเล่ม และชั่วโมงที่เงียบกว่านั้นรอบเลนส์ |
| อีเวนต์สด | อีเวนต์สด | คืนหนึ่ง ไม่กี่ชั่วโมงเดียวกัน ที่ได้อยู่ด้วยกัน |
| การปรากฏตัว | การปรากฏตัว | สนามบิน พรมแดง และช่วงเวลาที่กล้องยังไม่ทันตั้งตัว |
| แบรนด์ | แบรนด์ | การพบกันสั้น ๆ ที่แม่นยำระหว่างพวกเธอกับแบรนด์ |

ปุ่ม: **ก้าวเข้าไป**　ป้ายช่องว่าง: **กำลังรวบรวม**

### 3. Featured Projects

**中文**
- 标题：**她们走过的这几年**
- 副标题：作品、杂志、现场与品牌合作，从不同方向拼出同一条轨迹。
- 右上入口：作品 →

**English**
- Title: **The Years They've Walked**
- Subtitle: Works, editorials, stages and campaigns — different directions, one trajectory.
- Link: Projects →

**ไทย**
- **ปีที่พวกเธอเดินผ่าน**
- ผลงาน นิตยสาร เวที และงานแบรนด์ — คนละทิศ แต่เป็นเส้นทางเดียวกัน
- ผลงาน →

### 4. Timeline

**中文**
- 标题：**沿着时间往回走**
- 副标题：每一年都还在原地，等你回去看一眼。
- 年份格：2026 · 3 条记录 ／ 空年份显示「还在整理」
- 右上入口：时间线 →

**English**
- Title: **Back Through the Years**
- Subtitle: Every year is still where you left it.
- Tile: 3 records / Still being gathered
- Link: Timeline →

**ไทย**
- **ย้อนกลับไปตามปี**
- ทุกปียังอยู่ที่เดิม รอให้กลับไปมอง
- 3 รายการ / กำลังรวบรวม
- ไทม์ไลน์ →

### 5. People & Archive Story

**中文**
- 标题：**她们，与这座档案**
- 副标题：两个人是起点；剩下的，是这些年一点点收进来的。
- 卡片：Lookmhee ／ Sonya ＋ 角色标签 ＋ `12 个条目`（等宽小字，不再占主位）
- 入口：人物 →

**English**
- Title: **The Two, and This Archive**
- Subtitle: Two people started it. The rest came in slowly, year by year.
- Card: name + role + `12 entries`
- Link: People →

**ไทย**
- **สองคน กับคลังนี้**
- สองคนคือจุดเริ่มต้น ที่เหลือค่อย ๆ ถูกเก็บเข้ามาทีละปี
- 12 รายการ
- บุคคล →

### 6. 各页引言与空状态

| 键 | 中文 | English | ไทย |
|---|---|---|---|
| `projects.description` | 剧集、杂志特辑、公开活动与品牌合作，按年份留在这里，随时可以翻回去。 | Series, editorials, appearances and campaigns, kept by year. | ซีรีส์ นิตยสาร กิจกรรม และงานแบรนด์ เก็บไว้ตามปี |
| `gallery.description` | 留下来的画面，和跟着画面留下来的时间。 | The frames that were kept, and the time that came with them. | ภาพที่ถูกเก็บไว้ พร้อมเวลาที่ติดมากับภาพเหล่านั้น |
| `timeline.description` | 每一次发布、每一次亮相，都按发生的那一天排在这里。 | Every release and every appearance, in the order the days came. | ทุกการเปิดตัวและทุกการปรากฏตัว เรียงตามวันที่เกิดขึ้น |
| `people.description` | 这座档案的起点，是两个人。 | This archive began with two people. | คลังนี้เริ่มต้นจากสองคน |
| `projects.emptyAll` | 这一格还在整理，作品会陆续放进来。 | This shelf is still being sorted; works will come in. | ชั้นนี้ยังจัดเรียงอยู่ ผลงานจะค่อย ๆ ถูกวางลง |
| `gallery.emptyAll` | 这里还没有图片，正在一点点补上。 | Nothing here yet — images are being added a little at a time. | ที่นี่ยังไม่มีภาพ กำลังค่อย ๆ เพิ่มเข้าไป |
| `timeline.emptyYear` | 这一年还是空白，等以后再补上。 | This year is still blank. It will be filled in later. | ปีนี้ยังว่างอยู่ จะค่อย ๆ เติมเข้ามา |
| `people.noProjects` | 还没有把项目挂到这里。 | No projects linked here yet. | ยังไม่มีผลงานที่เชื่อมไว้ที่นี่ |

---

## 三、实施时会动的文件

| 文件 | 动作 |
|---|---|
| `lib/languages.ts` | 只改文案值（en / zh / th 三语同步），不增删键 |
| `components/sections/people-section.tsx` | 「相关项目：N」改为「N 个条目」，去掉冒号 |
| `components/museum-preface.tsx` | 内联 fallback 换成线上三段版本 |
| `tests/phase8-chrome.test.ts` | 现有断言不变；如需断言新文案，追加而非替换 |

**不会动**：`app/page.tsx` 区块顺序、`lib/category-registry.ts` 分类值、任何 API、任何数据库行、任何图片字段、路由与 redirect。

---

## 四、需要你拍板的三点

1. **Featured 区块标题**：草案用「她们走过的这几年」。若你更想要短的，可换「这几年」（配一个小的 `FEATURED` 等宽标签在标题上方作辅助）。
2. **入口名是否统一**：草案把「戏剧」改成「戏剧与作品」、「商务」改成「品牌合作」，与后台分类真名对齐。若你希望首页只保留短名（戏剧 / 商务），就维持现名，只换辅助文案。
3. **序言是否要动**：草案建议**一字不改**，只把代码兜底同步成 DB 版本。若你想在序言里补一句「致所有 Besties」之外的邀请，可以给一句方向，我写进草案再确认。

---

## 五、验收方式

- 文案层：首页五区块 + 四页引言 + 四个空状态，中英泰三语逐条对照本文件。
- 功能层：`npx tsc --noEmit`、`npm test`、eslint、`npm run build` 全绿；首页五个区块仍由 `/api/home/summary`、`/api/home/portals` 动态生成，分类入口仍为五张、空分类不隐藏。
- 展示层：桌面与手机两种宽度下检查标题换行与副标题长度（新文案普遍变长，`people.featured` 类标题需确认不折成三行）。
- 交付后**不自动 push / 不自动部署**，等你确认。
