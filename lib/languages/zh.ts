// Chinese UI strings. Must cover every key in ./en.
import type { TranslationKey } from './en.ts';

export const zh: Record<TranslationKey, string> = {
    // Navigation
    'nav.home': '首页',
    'nav.chronicle': '编年史',
    'nav.exhibitions': '主题展',
    'nav.editorial': '杂志特辑',
    'nav.resonance': '共鸣',
    'nav.duality': '双生侧写',
    'nav.profiles': '成员资料',
    'nav.gallery': '相册',
    'nav.projects': '作品',
    'nav.copyright': '版权',
    'nav.about': '关于',
    'nav.schedule': '日程',
    'nav.toggleTheme': '切换主题',
    'nav.toggleMenu': '切换菜单',
    'nav.viewAll': '查看全部',
    'nav.lmsy': 'LMSY',
    'nav.lookmhee': 'Lookmhee',
    'nav.sonya': 'Sonya',

    // Hero
    'hero.lmsy': 'LMSY',
    'hero.subtitle': 'Lookmhee & Sonya',
    'hero.scroll': '滚动',
    'hero.lookmhee': 'LOOKMHEE',
    'hero.sonya': 'SONYA',
    'hero.besties': '属于 LMSY 和她们的 Besties 专属空间。',
    'splash.entering': '正在进入第一轨道',

    // Quote
    'quote.text': '"有些情感是无法隐藏的，无论你多么努力..."',
    'quote.source': '— AFFAIR 剧集',

    // Latest Updates
    'updates.title': '最新动态',
    'updates.photoshoot': '全新写真',
    'updates.season2': 'Affair 第二季',
    'updates.fanmeet': '粉丝见面会',
    'updates.gallery': '相册',
    'updates.series': '剧集',
    'updates.schedule': '日程',
    'updates.comingSoon': '即将推出',
    'updates.jan2025': '2025年1月',
    'updates.dec2024': '2024年12月',

    // CTA
    'cta.title': '探索她们的故事',
    'cta.description': '通过作品、相册和即将到来的活动，了解 Lookmhee 和 Sonya 的旅程。',
    'cta.meetDuo': '加入旅程吧，Besties',
    'cta.viewGallery': '查看相册',

    // Profiles
    'profiles.title': '成员资料',
    'profiles.description': '了解 Lookmhee 和 Sonya - Affair 剧集中才华横溢的双人组合。',
    'profiles.viewProfile': '查看资料',
    'profiles.back': '返回资料页',

    // Profile Detail
    'profile.biography': '个人简介',
    'profile.born': '出生日期',
    'profile.height': '身高',
    'profile.works': '作品',
    'profile.quote': '"感激每一个机会分享触动心灵的故事。"',
    'profile.yearsOld': '{age} 岁',
    'profile.lead': '主演',
    'profile.supporting': '配角',
    'profile.guest': '客串',

    // Gallery
    'gallery.title': '相册',
    'gallery.description': '一张张留下来的画面，记录着她们走过的时光。',
    'gallery.noImages': '此标签下暂无图片。',
    'gallery.tagAll': '全部',
    'gallery.tagMagazine': '杂志',
    'gallery.tagAdvertising': '广告',
    'gallery.tagStage': '舞台',
    'gallery.tagStill': '剧照',
    'gallery.tagUntagged': '未分类',
    'gallery.viewProject': '查看所属作品',
    'gallery.viewAllProjectImages': '查看此作品的全部图片',

    // Projects
    'projects.title': '作品',
    'projects.description': '作品都在这里慢慢汇集，时间替它们排好了顺序。',
    'projects.relatedTitle': '更多同类作品',
    'projects.filteredEmpty': '该分类下暂无作品。',

    // Schedule
    'schedule.title': '日程',
    'schedule.description': '关注即将到来的活动、露面和行程。',
    'schedule.upcoming': '即将举行的活动',
    'schedule.past': '过往活动',
    'schedule.noEvents': '暂无安排的活动。',
    'schedule.watchNow': '立即观看',

    // Construction Banner
    'banner.message': '欢迎来到这个尚未完工的爱的宇宙，亲爱的 Bestie。这里正在一点点变得完整。',
    'banner.status': '施工中',

    // Hero Section
    'hero.curator': 'Astra 策展',
    'hero.portalsTitle': '多维入口',
    'hero.portalsSubtitle': '走进她们故事的不同维度',

    // Portals
    'portal.drama': '戏剧与作品',
    'portal.dramaDesc': '她们从这里被看见。',
    'portal.live': '现场演出',
    'portal.liveDesc': '一起度过的那些时刻。',
    'portal.journey': '旅途',
    'portal.journeyDesc': '同行相伴的足迹',
    'portal.daily': '日常',
    'portal.dailyDesc': '美好的平凡岁月',
    'portal.commercial': '品牌合作',
    'portal.commercialDesc': '与世界更多面的共鸣',
    'portal.editorial': '杂志特辑',
    'portal.editorialDesc': '镜头前后。',
    'portal.appearance': '公开亮相',
    'portal.appearanceDesc': '每一次走进公众视野的身影。',

    // Longform

    // Micro-Chronicle
    'chronicle.title': '编年史',
    'chronicle.badge': '档案时间线',
    'chronicle.desc': '按时间探索站内的作品与图片——每一次发布、拍摄与重要时刻，汇成一条连续的记录。',
    'chronicle.hint': '作品卡直达作品页；图片卡打开灯箱，并可前往所属作品。',
    'chronicle.entries': '条目',
    'chronicle.type': '来源',
    'chronicle.sourceLabel': '作品与图片',
    'chronicle.view': '图片',
    'chronicle.yearFilter': '年份',
    'chronicle.clearYear': '查看全部年份',
    'chronicle.emptyAll': '暂无时间线记录。',
    'chronicle.emptyYear': '这一年的故事还没有在这里展开，等有新的发现，再慢慢补上。',
    'chronicle.eventProject': '作品',
    'chronicle.eventImages': '图片',
    'chronicle.viewProject': '查看所属作品',
    'chronicle.imageOne': '张',
    'chronicle.imageMany': '张',

    // Resonance (music section - not launched yet)
    'resonance.comingSoon': '即将上线',
    'resonance.comingSoonDesc': '音乐板块正在筹备中，目前尚未有任何正式发布——有真实内容时这里会第一时间点亮。',

    // Editorial empty state
    'editorial.emptyTitle': '暂无可展示的杂志特辑',
    'editorial.emptyDesc': '正式发布的杂志特辑会在这里出现。',

    // Search (phase 5)
    'search.placeholder': '搜索图片、作品…',
    'search.open': '打开搜索',
    'search.clear': '清空搜索',
    'search.noResults': '未找到相关结果',
    'search.noResultsHint': '换个关键词，或去画廊逛逛',
    'search.error': '搜索暂时不可用，请稍后再试。',
    'search.quickAccess': '快速访问',
    'search.typeProject': '作品',
    'search.typeGallery': '图片',
    'search.typeExhibition': '主题展',
    'search.footerNavigate': '方向键选择',
    'search.footerEnter': 'Enter 打开',
    'search.footerEsc': 'Esc 关闭',

    // Whispers (community message wall)
    'whispers.subtitle': '收集挚友们的共鸣',
    'whispers.empty': '正在寻找回声…',
    'whispers.notice': '所有信号在进入档案前都会经过审核',
    'whispers.formTitle': '发送你的信号',
    'whispers.formDesc': '你的低语在加入档案前会经过审核',
    'whispers.message': '你的留言',
    'whispers.messagePlaceholder': '在这片空间留下一束信号…',
    'whispers.authorPlaceholder': '你的名字',
    'whispers.authorLabel': '署名',
    'whispers.locationPlaceholder': '城市或星系',
    'whispers.locationLabel': '坐标（可选）',
    'whispers.energyLabel': '选择你的能量色彩',
    'whispers.errContent': '缺少必要的信号内容',
    'whispers.errAuthor': '缺少必要的身份信息',
    'whispers.solar': '日辉',
    'whispers.lunar': '月映',
    'whispers.success': '✓ 信号已发送，等待共鸣审核…',
    'whispers.submitting': '发送中…',
    'whispers.submit': '[ 发射信号 ]',
    'whispers.openForm': '[ 发送信号 ]',
    'whispers.failed': '留言提交失败',
    'whispers.networkError': '网络错误，请重试。',
    'whispers.gates': '低语之门',
    'vinyl.listen': '聆听共鸣',

    // 404 not-found
    'nf.title': '页面不存在',
    'nf.desc': '你要找的页面不存在或已被移动。',
    'nf.home': '回到首页',
    'nf.back': '返回上一页',

    // Route error boundary
    'err.label': '信号传输中断',
    'err.title': '出了点问题',
    'err.desc': '档案的这一部分暂时无法加载，请重试。',
    'err.retry': '重试',

    // Editorial
    'editorial.title': '杂志特辑',
    'editorial.subtitle': '杂志与出版物',
    'editorial.viewIssue': '查看本期',
    'editorial.photographer': '摄影师',
    'editorial.stylist': '造型师',
    'editorial.published': '出版日期',
    'editorial.backToGallery': '返回画廊',
    'editorial.noIssues': '暂无杂志内容。',
    'editorial.comingSoon': '更多内容即将推出...',

    // Exhibitions
    'exhibitions.title': '主题展',
    'exhibitions.subtitle': '精心策划的视觉故事集',

    // Footer
    'footer.tagline': '属于 LMSY 和她们的 Besties 专属空间。',
    'footer.quickLinks': '快速链接',
    'footer.followUs': '关注我们',
    'footer.copyright': '© {year} LMSY 粉丝网站。版权所有。',
    'footer.madeWith': '由一位 Bestie 用 💛 & 💙 为所有 Besties 打造',
    'footer.instagram': 'Instagram',
    'footer.twitter': 'Twitter',
    'footer.disclaimer': '版权声明：lmsy.space 是一个非营利性粉丝项目。所有媒体内容归各自所有者所有。',

    // Shared presentation (phase 6 batch 1)
    'common.viewDetails': '查看详情',
    'common.watch': '观看',
    'common.loadMore': '加载更多',
    'common.loading': '加载中…',
    'common.imagesOne': '张图片',
    'common.imagesMany': '张图片',
    'common.close': '关闭',
    'common.previous': '上一张',
    'common.next': '下一张',
    'common.source': '来源',
    'common.noImage': '图片暂不可用',
    'common.curatorNote': '策展手记',

    // Archive credit lines (editorial + project detail)
    'credit.officialTitle': '官方内容',
    'credit.official': '所有图像版权归原出版方所有，此处仅作欣赏与保存。',
    'credit.fanTitle': '粉丝拍摄内容',
    'credit.fan': '感谢每一位记录下这些瞬间的 Bestie。',

    // Work categories (single source shared by Projects, detail and Chronicle)
    'category.series': '剧集',
    'category.editorial': '杂志特辑',
    'category.appearance': '公开活动',
    'category.commercial': '商业合作',
    'category.journal': '记录',
    'category.daily': '日常',
    'category.travel': '旅行',
    'category.music': '音乐影像',
    'category.magazine': '杂志',
    'category.other': '其他',
    // Stable eight-category vocabulary (see lib/category-registry.ts)
    'category.dramaWork': '剧集作品',
    'category.liveEvent': '现场活动',
    'category.publicAppearance': '公开亮相',
    'door.talks': '访谈',
    'door.live': '直播',
    'category.interview': '访谈',
    'category.variety': '综艺',
    'category.radio': '电台',
    'talks.bilibili': 'B站视频',
    'talks.youtube': 'YouTube 视频',
    'talks.photos': '图片',
    'talks.transcript': '文字实录',
    'talks.watch': '观看视频',
    'talks.read': '阅读',
    'category.liveStream': '直播',
    'category.behindTheScenes': '幕后花絮',
    'category.personalTravel': '个人与旅行',
    'category.earlyArchive': '早期档案',

    // Navigation (phase 7: four entries + search)
    'nav.timeline': '时间线',
    'nav.people': '人物',

    // Homepage sections
    'home.collecting': '收录中',
    'home.featuredTitle': '灵魂共振',
    'home.featuredSubtitle': '她与她的默契',
    'home.talkDoor': '对话',
    'home.talkDoorHint': '问题由别人提出，也由别人剪好。',
    'home.liveDoor': '直播',
    'home.liveDoorHint': '没有剪辑，也没有提问的人。',
    'home.talkEntries': '{count} 条',
    'home.liveEntries': '{count} 场',
    'home.timelineTitle': '沿着时间，重新遇见',
    'home.timelineSubtitle': '有些记忆，值得再次重温',
    'home.peopleTitle': '她们与 besties',
    'home.peopleSubtitle': '因为喜欢她们，所以开始收藏；因为珍惜这些记忆，所以一直没有停下。',

    // /talks 与 /live - 灵魂共振的两个落地页
    'talks.title': '对话',
    'talks.description': '采访、综艺与电台。',
    'talks.tabAll': '全部',
    'talks.tabInterview': '访谈',
    'talks.tabVariety': '综艺',
    'talks.tabRadio': '电台',

    // /dramas - 一号门的落地页
    'dramas.title': '影视作品',
    'dramas.description': '剧集与相关影像。',
    'dramas.eventCount': '{count} 条',
    'dramas.viewSeries': '进入这一部',

    // Doors 2-5
    'door.description.liveEvents': '见面会、生日会与品牌活动。',
    'door.description.appearances': '颁奖礼、时装周与公司活动。',
    'door.description.commercial': '代言与广告。',
    'door.viewCategory': '进入这一类',
    'door.unfiled': '未归类',
    'door.video': '视频',
    'drama.footageCount': '{count} 张影像物料',
    'drama.back': '返回影视作品',
    'drama.eventImages': '{count} 张图片',
    'drama.noImages': '图片待补',
    'drama.backToEvent': '返回这一部',
    'drama.relatedImages': '相关图片',
    'drama.watchExternal': '前往原平台观看',
    'drama.watchNote': '这里只作介绍，观看请前往原平台。',
    'drama.linkPending': '观看链接待补',
    'subtype.affair': '爱情诡计',
    'subtype.harmony_secret': '和谐密语',
    'subtype.hometown_romance': '乡村恋人',
    'drama.group.seriesBody': '剧集本体',
    'drama.group.premiere': '首映礼',
    'drama.group.music': '音乐作品',
    'drama.group.novel': '原著小说',
    'drama.group.promo': '宣传节点',
    'drama.group.footage': '影像物料',
    'drama.group.award': '奖项',
    'drama.awardWon': '获奖',
    'drama.awardNominated': '提名',
    'live.title': '直播',
    'live.description': '双人直播与各自直播。',
    'live.tabAll': '全部',
    'live.tabDuo': '双人',

    // Timeline
    'timeline.title': '时间线',
    'timeline.description': '从一年的某一天，到另一个值得记住的日子。沿着时间，慢慢翻回去。',
    'timeline.emptyYear': '这一年的故事还没有在这里展开，等有新的发现，再慢慢补上。',
    'timeline.records': '{count} 条记录',
    'timeline.unknownDate': '日期未定',

    // People
    'people.title': '人物',
    'people.description': '这座档案馆从她们开始，也因她们而有了继续收集下去的意义。',
    'people.relatedProjects': '{count} 个条目',
    'people.noProjects': '与这位人物有关的作品，还在慢慢收集之中。',
    'people.birthday': '生日',

    // Project detail
    'project.tabAll': '全部',
    'project.tabStills': '剧照',
    'project.tabBts': '幕后',
    'project.tabPress': '媒体与活动',
    'project.watchNow': '立即观看',
    'project.emptyTitle': '该分类下暂无图片。',
    'project.emptyDesc': '新素材整理后会出现在这里。',
    'project.interview': '访谈',
    'project.watchInterview': '观看访谈视频',
    'project.cover': '封面',
    'project.featured': '精选',
    'project.unsorted': '未归类',
    'project.dateUnknown': '日期未知',
    'project.noteStillsTitle': '策展手记',
    'project.noteStills': '这些精选剧照保留了作品本身的质感，也呈现定义这个项目的视觉语言。',
    'project.noteBtsTitle': '幕后',
    'project.noteBts': '拍摄之间的片刻：过程、笑声，以及让故事成立的那份用心。',
    'project.notePressTitle': '媒体与活动',
    'project.notePress': '公开行程的记录：红毯、发布会，以及和粉丝、媒体共同分享的期待。',

    // Gallery states
    'gallery.emptyAll': '这里暂时还没有新的画面，Astra 会继续细心采集。',
    'gallery.emptyFiltered': '该筛选下暂无图片。',
    'gallery.resetFilter': '查看全部图片',

    // Projects list states
    'projects.emptyAll': '这一页还在慢慢填满，新的作品会陆续来到这里。',
    'projects.photoCount': '{count} 张图片',
    'projects.noImages': '暂无归档图片',
    'projects.kindTheme': '专题',

    // 分类内部的子类 Tab。只在 SUBTYPES_BY_CATEGORY 列出的门里出现，
    // 且至少两类有内容时才显示。
    'subtype.concert': '演唱会与巡演',
    'subtype.fanmeeting': '见面会',
    'subtype.fansign': '签售会',
    'subtype.brand_event': '品牌活动',
    'subtype.birthday': '生日会',
    'subtype.company': '公司活动',
    'subtype.awards': '颁奖礼',
    'subtype.fashion': '时装周',
    'subtype.brand_stage': '品牌站台',
    'subtype.charity': '公益',
    'subtype.industry': '行业活动',
    'subtype.duo': '双人',
    'subtype.lookmhee': 'Lookmhee',
    'subtype.sonya': 'Sonya',

    // Editorial meta
    'editorial.issueCount': '共 {count} 期特辑',
    'editorial.releaseDate': '发布日期',
    'editorial.artifacts': '件藏品',
    'editorial.curatorNote': '策展手记',
    'editorial.insideIssue': '本期内容',
    'editorial.pagesPreserved': '已保存 {count} 页',
    'editorial.pagesEmpty': '本期尚无数字化内页。',
    'editorial.pagesEmptyHint': '完成整理后，内页会出现在这里。',
    'editorial.noCover': '暂无封面',
    'editorial.dateTbd': '日期待确认',
    'editorial.loading': '加载中',

    'features.title': '特色专题',
    'features.subtitle': '主题特辑',
    'features.viewIssue': '查看专题',
    'features.artifacts': '件藏品',
    'features.noCover': '暂无封面',
    'features.emptyTitle': '暂无可展示的专题',
    'features.emptyDesc': '正式发布的专题会在这里出现。',
    'features.issueCount': '共 {count} 个专题',
    'features.dateTbd': '日期待确认',
    'features.releaseDate': '发布日期',
    'features.curatorNote': '策展手记',
    'features.pagesEmpty': '该专题尚无数字化图片。',
    'features.pagesEmptyHint': '完成整理后，图片会出现在这里。',
    'features.insideIssue': '专题内容',
    'features.pagesPreserved': '已保存 {count} 张',

    'live.allPhotos': '全部图片',
    'live.viewAll': '查看全部',

    // Chronicle empty state helper
    'chronicle.tryAnotherYear': '查看其他年份：',

    // Homepage CTAs
    'home.explore': '探索',
    'home.enterArchive': '进入档案',
    'home.storyContinues': '故事仍在继续',

    // Copyright Page
    'copyright.title': '版权政策',
    'copyright.subtitle': '尊重创作者，珍藏美好回忆',
    'copyright.intro': 'lmsy.space 是一个非营利性粉丝项目，致力于保存和分享 Lookmhee 与 Sonya 的美好瞬间，让全球粉丝共同见证她们的艺术之旅。',
    'copyright.disclaimerTitle': '版权声明',
    'copyright.disclaimerText': '本网站展示的所有媒体内容（图片、视频、文章等）归各自所有者所有，包括但不限于制作公司、杂志社、摄影师和官方渠道。我们不主张对任何受版权保护材料的所有权。',
    'copyright.fairUseTitle': '合理使用',
    'copyright.fairUseText': '内容分享用于教育和档案目的，旨在记录 Lookmhee 与 Sonya 的职业生涯和艺术旅程。我们认为这符合《版权法》第 107 条规定的合理使用原则。',
    'creditTitle': '致谢与归属',
    'creditText': '我们努力为所有内容提供适当的归属。在可能的情况下，我们会注明摄影师、出版商和来源。如果您发现任何缺失或不正确的归属，请联系我们。',
    'copyright.contactTitle': '版权侵权申诉',
    'copyright.contactText': '如果您是版权持有者，认为任何内容侵犯了您的权利，请联系我们并提供以下信息：',
    'copyright.contactItem1': '• 您的姓名和联系方式',
    'copyright.contactItem2': '• 受版权保护作品的描述',
    'copyright.contactItem3': '• 侵权内容的位置（网址）',
    'copyright.contactItem4': '• 善意信念声明',
    'copyright.contactEmail': '联系邮箱：',
    'copyright.responseTime': '我们将在 48 小时内回复有效申诉，并删除或适当归属相关内容。',
    'copyright.backHome': '返回首页',

    // 关于页
    'about.title': '关于',
    'about.whatTitle': '这个网站是什么',
    'about.whatText1':
      'LMSY Fan Archive 是关于泰国 GL 组合 LMSY（Lookmhee Punyapat Wangpongsathaporn 与 Sonya Saranphat Pedersen）的非官方粉丝档案站。',
    'about.whatText2':
      '这里做的是收集与整理：照片、杂志大片、活动与记录被编成可翻阅的档案，每一条都按日期和来源登记。',
    'about.disclaimerTitle': '非官方声明',
    'about.disclaimerText':
      '本网站由 Astra 维护，与 LMSY 本人、其经纪公司（CHANGE2561）以及任何官方粉丝团均无关联。',
    'about.contactTitle': '版权与联系方式',
    'about.contactText1':
      '所有照片与内容归各自的版权所有者所有。图片尽可能标注原始来源，在此仅作档案保存与欣赏之用。',
    'about.contactText2': '如果您是权利持有人，希望撤下某些内容或更改署名，请联系我们：',
    'about.seeAlso': '另见：',

    // Site-level copy (root layout metadata, loading state)
    'site.description': '欢迎来到泰国 GL 组合 LMSY（Lookmhee & Sonya）的粉丝档案馆——《Affair》系列主演。收录人物档案、图库、作品与日程更新。',
    'site.keywords': 'LMSY, Lookmhee, Sonya, Affair, 泰国GL, 百合, 泰剧, LMSY粉丝, Affair系列',
    'site.loading': '正在载入档案',
    // Door meta descriptions (SEO snippets) — see en.ts for the note.
    'meta.about': '关于 LMSY Fan Archive —— 一个由粉丝运营的非官方档案馆，记录泰国 GL 组合 LMSY（Lookmhee & Sonya）。',
    'meta.appearances': '颁奖礼、时装周、品牌活动、企业活动 —— 每一次 Lookmhee & Sonya 出门被看见。',
    'meta.commercial': 'Lookmhee & Sonya 拍过的广告、代言与品牌短片 —— 连同背后的照片一起留在这里。',
    'meta.copyright': 'lmsy.space 是 non-profit 的粉丝项目，致力于保存并与全世界粉丝分享 Lookmhee & Sonya 的美好瞬间。',
    'meta.dramas': 'Lookmhee & Sonya 讲过的每一个故事，收在一处 —— 剧集本身、其中的音乐、背后的原作小说，以及官宣与奖项。',
    'meta.editorial': 'Lookmhee & Sonya 出现过的每一本杂志与刊物，连同封面与内页一起留存。',
    'meta.features': '常规门类之外的特辑 —— 按主题编成的图集，连同封面与内页一起留存。',
    'meta.gallery': '馆内每一张照片 —— 杂志大片、广告、舞台与剧照 —— 可按标签浏览与筛选。',
    'meta.live': 'Lookmhee & Sonya 自己开的直播 —— 没有剪辑，没有主持人，最接近她们自己讲话的样子。',
    'meta.liveEvents': '粉丝见面会、品牌之夜与生日会 —— 她们站过的每一个现场，都以照片留存。',
    'meta.people': '这座档案馆围绕的两个人。',
    'meta.schedule': 'Lookmhee & Sonya 的日程，将到来的与过去的 —— 活动、播出与出席。',
    'meta.talks': '访谈、综艺与电台 —— 每一次别人去问她们，再把回答剪出来。',
    'meta.timeline': '馆内每一条带日期的记录，按它真正发生的顺序排列。',

};
