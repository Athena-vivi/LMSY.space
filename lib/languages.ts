export type Language = 'en' | 'zh' | 'th';

export const languages: Record<Language, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  zh: { name: 'Chinese', nativeName: '中文' },
  th: { name: 'Thai', nativeName: 'ไทย' },
};

export const defaultLanguage: Language = 'en';

export type TranslationKey = keyof typeof translations.en;

export const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.chronicle': 'Chronicle',
    'nav.exhibitions': 'Exhibitions',
    'nav.editorial': 'Editorial',
    'nav.resonance': 'Resonance',
    'nav.duality': 'Duality',
    'nav.profiles': 'Profiles',
    'nav.gallery': 'Gallery',
    'nav.projects': 'Projects',
    'nav.copyright': 'Copyright',
    'nav.schedule': 'Schedule',
    'nav.toggleTheme': 'Toggle theme',
    'nav.toggleMenu': 'Toggle menu',
    'nav.viewAll': 'View All',
    'nav.lmsy': 'LMSY',
    'nav.lookmhee': 'Lookmhee',
    'nav.sonya': 'Sonya',

    // Hero
    'hero.lmsy': 'LMSY',
    'hero.subtitle': 'Lookmhee & Sonya',
    'hero.scroll': 'SCROLL',
    'hero.lookmhee': 'LOOKMHEE',
    'hero.sonya': 'SONYA',
    'hero.besties': 'A dedicated space for LMSY and their Besties.',

    // Quote
    'quote.text': '"Some feelings are impossible to hide, no matter how hard you try..."',
    'quote.source': '— AFFAIR SERIES',

    // Latest Updates
    'updates.title': 'Latest Updates',
    'updates.photoshoot': 'New Photoshoot',
    'updates.season2': 'Affair Season 2',
    'updates.fanmeet': 'Fan Meet Event',
    'updates.gallery': 'Gallery',
    'updates.series': 'Series',
    'updates.schedule': 'Schedule',
    'updates.comingSoon': 'Coming Soon',
    'updates.jan2025': 'Jan 2025',
    'updates.dec2024': 'Dec 2024',

    // CTA
    'cta.title': 'Explore Their Story',
    'cta.description': 'Discover the journey of Lookmhee and Sonya through their projects, gallery, and upcoming events.',
    'cta.meetDuo': 'Join the Journey, Besties',
    'cta.viewGallery': 'View Gallery',

    // Profiles
    'profiles.title': 'Profiles',
    'profiles.description': 'Get to know Lookmhee and Sonya - the talented duo behind the Affair series.',
    'profiles.viewProfile': 'View Profile',
    'profiles.back': 'Back to Profiles',

    // Profile Detail
    'profile.biography': 'BIOGRAPHY',
    'profile.born': 'BORN',
    'profile.height': 'HEIGHT',
    'profile.works': 'WORKS',
    'profile.quote': '"Grateful for every opportunity to share stories that touch hearts."',
    'profile.yearsOld': '{age} years old',
    'profile.lead': 'Lead',
    'profile.supporting': 'Supporting',
    'profile.guest': 'Guest',

    // Gallery
    'gallery.title': 'Gallery',
    'gallery.description': "Frame by frame, the images preserve the time they've passed through.",
    'gallery.noImages': 'No images found for this tag.',
    'gallery.tagAll': 'All',
    'gallery.tagMagazine': 'Magazine',
    'gallery.tagAdvertising': 'Advertising',
    'gallery.tagStage': 'Stage',
    'gallery.tagStill': 'Still',
    'gallery.tagUntagged': 'Untagged',
    'gallery.viewProject': 'View Project',
    'gallery.viewAllProjectImages': 'View all images from this project',

    // Projects
    'projects.title': 'Projects',
    'projects.description': 'The works are all here. Time has already put them in order.',
    'projects.relatedTitle': 'More in this category',
    'projects.filteredEmpty': 'No projects in this category.',

    // Schedule
    'schedule.title': 'Schedule',
    'schedule.description': 'Stay updated with upcoming events, appearances, and activities.',
    'schedule.upcoming': 'Upcoming Events',
    'schedule.past': 'Past Events',
    'schedule.noEvents': 'No upcoming events scheduled.',
    'schedule.watchNow': 'Watch Now',

    // Construction Banner
    'banner.message': 'Welcome to this unfinished universe of love, dear Bestie. This place is becoming complete, little by little.',
    'banner.status': 'UNDER CONSTRUCTION',

    // Hero Section
    'hero.curator': 'Curated by Astra',
    'hero.portalsTitle': 'Portals',
    'hero.portalsSubtitle': 'Step into the different dimensions of their story.',

    // Portals
    'portal.drama': 'Drama & Works',
    'portal.dramaDesc': 'This is where they were first seen.',
    'portal.live': 'Live Events',
    'portal.liveDesc': 'The moments spent together.',
    'portal.journey': 'Journey',
    'portal.journeyDesc': 'Paths walked together',
    'portal.daily': 'Daily',
    'portal.dailyDesc': 'Beautiful ordinary days',
    'portal.commercial': 'Commercial',
    'portal.commercialDesc': 'More sides of resonance with the world.',
    'portal.editorial': 'Editorial',
    'portal.editorialDesc': 'Before and behind the lens.',
    'portal.appearance': 'Public Appearances',
    'portal.appearanceDesc': 'Every time they step into view.',

    // Longform

    // Micro-Chronicle
    'chronicle.title': 'Chronicle',
    'chronicle.badge': 'Archive Timeline',
    'chronicle.desc': 'A chronological view of the works and images on this site - every release, shoot and moment in one continuous record.',
    'chronicle.hint': 'Project cards open the work; image cards open a lightbox with a link to the project.',
    'chronicle.entries': 'Entries',
    'chronicle.type': 'Source',
    'chronicle.sourceLabel': 'Works & Images',
    'chronicle.view': 'Images',
    'chronicle.yearFilter': 'Year',
    'chronicle.clearYear': 'View all years',
    'chronicle.emptyAll': 'No events recorded yet.',
    'chronicle.emptyYear': "This year's story has yet to unfold here. New discoveries will be added in time.",
    'chronicle.eventProject': 'Project',
    'chronicle.eventImages': 'Images',
    'chronicle.viewProject': 'View Project',
    'chronicle.imageOne': 'image',
    'chronicle.imageMany': 'images',

    // Resonance (music section - not launched yet)
    'resonance.comingSoon': 'Coming Soon',
    'resonance.comingSoonDesc': 'The music section is being prepared. Nothing has been announced yet - this page will light up when there is something real to play.',

    // Editorial empty state
    'editorial.emptyTitle': 'No editorials available yet',
    'editorial.emptyDesc': 'Curated magazine features will appear here once published.',

    // Search (phase 5)
    'search.placeholder': 'Search photos, projects…',
    'search.open': 'Open search',
    'search.clear': 'Clear search',
    'search.noResults': 'No results found',
    'search.noResultsHint': 'Try different keywords or browse the gallery',
    'search.error': 'Search is temporarily unavailable. Please try again later.',
    'search.quickAccess': 'Quick Access',
    'search.typeProject': 'Project',
    'search.typeGallery': 'Photo',
    'search.typeExhibition': 'Collection',
    'search.footerNavigate': 'Use arrows to navigate',
    'search.footerEnter': 'Enter to open',
    'search.footerEsc': 'Esc to close',

    // Whispers (community message wall)
    'whispers.subtitle': 'Collecting the Resonance of Besties',
    'whispers.empty': 'Searching for Echoes...',
    'whispers.notice': 'All signals are reviewed before entering the archive',
    'whispers.formTitle': 'Transmit Your Signal',
    'whispers.formDesc': 'Your whisper will be reviewed before joining the archive',
    'whispers.message': 'Your Message',
    'whispers.messagePlaceholder': 'Leave a signal in this space...',
    'whispers.authorPlaceholder': 'Your name',
    'whispers.authorLabel': 'Signature',
    'whispers.locationPlaceholder': 'City or Galaxy',
    'whispers.locationLabel': 'Coordinates (Optional)',
    'whispers.energyLabel': 'Choose Your Energy Color',
    'whispers.errContent': 'REQUIRED_SIGNAL_MISSING',
    'whispers.errAuthor': 'REQUIRED_IDENTITY_MISSING',
    'whispers.solar': 'Solar',
    'whispers.lunar': 'Lunar',
    'whispers.success': 'Signal transmitted. Awaiting resonance approval...',
    'whispers.submitting': 'Transmitting...',
    'whispers.submit': '[ EMIT_SIGNAL ]',
    'whispers.openForm': '[ TRANSMIT_SIGNAL ]',
    'whispers.failed': 'Failed to submit message',
    'whispers.networkError': 'Network error. Please try again.',
    'whispers.gates': 'The Whispering Gates',
    'vinyl.listen': 'Listen To The Resonance',

    // 404 not-found
    'nf.title': 'Page Not Found',
    'nf.desc': 'The page you are looking for does not exist or has been moved.',
    'nf.home': 'Go Home',
    'nf.back': 'Go Back',

    // Route error boundary
    'err.label': 'Transmission interrupted',
    'err.title': 'Something went wrong',
    'err.desc': 'This part of the archive could not be loaded. Please try again.',
    'err.retry': 'Try again',

    // Editorial
    'editorial.title': 'Editorial',
    'editorial.subtitle': 'Magazine & Publications',
    'editorial.viewIssue': 'View Issue',
    'editorial.photographer': 'Photographer',
    'editorial.stylist': 'Stylist',
    'editorial.published': 'Published',
    'editorial.backToGallery': 'Back to Gallery',
    'editorial.noIssues': 'No issues available yet.',
    'editorial.comingSoon': 'More issues coming soon...',

    // Exhibitions
    'exhibitions.title': 'Exhibitions',
    'exhibitions.subtitle': 'Curated collections of visual stories',

    // Footer
    'footer.tagline': 'A dedicated space for LMSY and their Besties.',
    'footer.quickLinks': 'Quick Links',
    'footer.followUs': 'Follow Us',
    'footer.copyright': '© {year} LMSY Fan Site. All rights reserved.',
    'footer.madeWith': 'Crafted with 💛 & 💙 by a Bestie, for all Besties',
    'footer.instagram': 'Instagram',
    'footer.twitter': 'Twitter',
    'footer.disclaimer': 'Copyright Disclaimer: lmsy.space is a non-profit fan project. All media belongs to their respective owners.',

    // Shared presentation (phase 6 batch 1)
    'common.viewDetails': 'View Details',
    'common.watch': 'Watch',
    'common.loadMore': 'Load more',
    'common.loading': 'Loading…',
    'common.imagesOne': 'image',
    'common.imagesMany': 'images',
    'common.close': 'Close',
    'common.previous': 'Previous',
    'common.next': 'Next',
    'common.source': 'Source',
    'common.noImage': 'Image not available',
    'common.curatorNote': 'Curator\u2019s Note',

    // Archive credit lines (editorial + project detail)
    'credit.officialTitle': 'Official Content',
    'credit.official': 'All media assets belong to the original publishers. Preserved for appreciation.',
    'credit.fanTitle': 'Fan-Captured Content',
    'credit.fan': 'Special thanks to the Besties who captured these fleeting moments.',

    // Work categories (single source shared by Projects, detail and Chronicle)
    'category.series': 'Series',
    'category.editorial': 'Editorial',
    'category.appearance': 'Appearance',
    'category.commercial': 'Commercial',
    'category.journal': 'Journal',
    'category.daily': 'Daily',
    'category.travel': 'Travel',
    'category.music': 'Music Video',
    'category.magazine': 'Magazine',
    'category.other': 'Other',
    // Stable eight-category vocabulary (see lib/category-registry.ts)
    'category.dramaWork': 'Drama & Works',
    'category.liveEvent': 'Live Events',
    'category.publicAppearance': 'Public Appearances',
    'category.interview': 'Interviews',
    'category.variety': 'Variety',
    'category.radio': 'Radio',
    'category.liveStream': 'Live Streams',
    'category.behindTheScenes': 'Behind the Scenes',
    'category.personalTravel': 'Personal & Travel',
    'category.earlyArchive': 'Early Archive',

    // Navigation (phase 7: four entries + search)
    'nav.timeline': 'Timeline',
    'nav.people': 'People',

    // Homepage sections
    'home.collecting': 'Collecting',
    'home.featuredTitle': 'Soul Resonance',
    'home.featuredSubtitle': 'The tacit understanding between her and her',
    'home.talkDoor': 'Conversations',
    'home.talkDoorHint': 'Somebody else asked, and then cut it.',
    'home.liveDoor': 'Live',
    'home.liveDoorHint': 'No cuts, and nobody asking.',
    'home.talkEntries': '{count} entries',
    'home.liveEntries': '{count} streams',
    'home.timelineTitle': 'Finding Them Again Through Time',
    'home.timelineSubtitle': 'Some memories are worth revisiting',
    'home.peopleTitle': 'Them and the Besties',
    'home.peopleSubtitle': 'It began with loving their work. It continues because the memories are worth keeping.',

    // /talks and /live - the two soul-resonance landing pages
    'talks.title': 'Conversations',
    'talks.description': 'Interviews, variety and radio.',
    'talks.tabAll': 'All',
    'talks.tabInterview': 'Interviews',
    'talks.tabVariety': 'Variety',
    'talks.tabRadio': 'Radio',

    // /dramas - the door for everything they acted in
    'dramas.title': 'Series',
    'dramas.description': 'Series and related footage.',
    'dramas.eventCount': '{count} entries',
    'dramas.viewSeries': 'Open the series',

    // Doors 2-5 (homepage entries with a page of their own)
    'door.description.liveEvents': 'Fan meetings, birthday parties and brand events.',
    'door.description.appearances': 'Award shows, fashion weeks and premieres.',
    'door.description.commercial': 'Endorsements and ads.',
    'door.viewCategory': 'Open the shelf',
    'door.unfiled': 'Not filed yet',
    'door.video': 'Video',
    'drama.footageCount': '{count} stills and clips',
    'drama.back': 'Back to Series',
    'drama.eventImages': '{count} images',
    'drama.noImages': 'Images coming',
    'drama.backToEvent': 'Back to the series',
    'drama.relatedImages': 'Related images',
    'drama.watchExternal': 'Watch on the platform',
    'drama.watchNote': 'This page is the introduction. Watching happens on the original platform.',
    'drama.linkPending': 'Watch link being confirmed',
    'subtype.affair': 'Affair',
    'subtype.harmony_secret': 'Harmony Secret',
    'subtype.hometown_romance': 'Hometown Romance',
    'drama.group.seriesBody': 'The Series',
    'drama.group.music': 'Music',
    'drama.group.novel': 'The Novel',
    'drama.group.promo': 'Announcements',
    'drama.group.footage': 'Footage',
    'drama.group.award': 'Awards',
    'drama.awardWon': 'Won',
    'drama.awardNominated': 'Nominated',
    'live.title': 'Live',
    'live.description': 'Duo streams and individual streams.',
    'live.tabAll': 'All',
    'live.tabDuo': 'Both',

    // Timeline
    'timeline.title': 'Timeline',
    'timeline.description': 'From one day to another worth remembering, follow the years back through time.',
    'timeline.emptyYear': "This year's story has yet to unfold here. New discoveries will be added in time.",
    'timeline.records': '{count} records',
    'timeline.unknownDate': 'Undated',

    // People
    'people.title': 'People',
    'people.description': 'This archive began with them, and they remain the reason to keep gathering.',
    'people.relatedProjects': '{count} entries',
    'people.noProjects': 'Works connected to this person are still being gathered.',
    'people.birthday': 'Birthday',

    // Project detail
    'project.tabAll': 'All',
    'project.tabStills': 'Stills',
    'project.tabBts': 'Behind the scenes',
    'project.tabPress': 'Press & events',
    'project.watchNow': 'Watch now',
    'project.emptyTitle': 'No images in this category yet.',
    'project.emptyDesc': 'New material appears here once it has been curated.',
    'project.interview': 'Interview',
    'project.watchInterview': 'Watch the interview',
    'project.cover': 'Cover',
    'project.featured': 'Featured',
    'project.unsorted': 'Unsorted',
    'project.dateUnknown': 'Date unknown',
    'project.noteStillsTitle': 'Curator\u2019s Note',
    'project.noteStills':
      'These selected stills preserve the texture of the work and the visual language that defines this project.',
    'project.noteBtsTitle': 'Behind the Scenes',
    'project.noteBts':
      'Moments between takes - the process, the laughter and the craft that bring a story to life.',
    'project.notePressTitle': 'Press & Events',
    'project.notePress':
      'The public journey: red carpets, press events and the excitement shared with fans and media.',

    // Gallery states
    'gallery.emptyAll': 'There are no images here just yet. Astra will keep gathering them with care.',
    'gallery.emptyFiltered': 'No images match this filter.',
    'gallery.resetFilter': 'View all images',

    // Projects list states
    'projects.emptyAll': 'This page is still taking shape. More works will find their way here.',
    'projects.photoCount': '{count} images',
    'projects.noImages': 'No archive images yet',
    'projects.kindTheme': 'Themes',

    // Sub-class tabs inside a hall. Only halls listed in
    // SUBTYPES_BY_CATEGORY render these, and only when two or more have rows.
    'subtype.fanmeeting': 'Fan Meetings',
    'subtype.brand_event': 'Brand Events',
    'subtype.birthday': 'Birthdays',
    'subtype.premiere': 'Premieres',
    'subtype.awards': 'Awards',
    'subtype.fashion': 'Fashion Weeks',
    'subtype.brand_stage': 'Brand Appearances',
    'subtype.charity': 'Charity',
    'subtype.industry': 'Industry',
    'subtype.duo': 'Both of Them',
    // One name, one shelf: a stream by one of them is hers, not "solo".
    'subtype.lookmhee': 'Lookmhee',
    'subtype.sonya': 'Sonya',

    // Editorial meta
    'editorial.issueCount': '{count} issues curated',
    'editorial.releaseDate': 'Release date',
    'editorial.artifacts': 'Artifacts',
    'editorial.curatorNote': 'Curator\u2019s note',
    'editorial.insideIssue': 'Inside this issue',
    'editorial.pagesPreserved': '{count} pages preserved',
    'editorial.pagesEmpty': 'This issue has no digitized pages yet.',
    'editorial.pagesEmptyHint': 'Pages appear here once they have been curated.',
    'editorial.noCover': 'No cover',
    'editorial.dateTbd': 'Date to be confirmed',
    'editorial.loading': 'Loading',

    // Features door (/features) - special topics rack
    'features.title': 'Features',
    'features.subtitle': 'Special Topics',
    'features.viewIssue': 'View Topic',
    'features.artifacts': 'Artifacts',
    'features.noCover': 'No cover',
    'features.emptyTitle': 'No topics available yet',
    'features.emptyDesc': 'Curated special topics will appear here once published.',
    'features.issueCount': '{count} topics curated',
    'features.dateTbd': 'Date to be confirmed',
    'features.releaseDate': 'Release date',
    'features.curatorNote': 'Curator\u2019s note',
    'features.pagesEmpty': 'This topic has no digitized images yet.',
    'features.pagesEmptyHint': 'Images appear here once they have been curated.',
    'features.insideIssue': 'Inside this topic',
    'features.pagesPreserved': '{count} images preserved',

    // Chronicle empty state helper
    'chronicle.tryAnotherYear': 'Try another year:',

    // Homepage CTAs
    'home.explore': 'Explore',
    'home.enterArchive': 'Enter archive',
    'home.storyContinues': 'Story continues',

    // Copyright Page
    'copyright.title': 'Copyright Policy',
    'copyright.subtitle': 'Respecting creators, preserving memories',
    'copyright.intro': 'lmsy.space is a non-profit fan project dedicated to preserving and sharing the beautiful moments of Lookmhee & Sonya with their fans worldwide.',
    'copyright.disclaimerTitle': 'Copyright Disclaimer',
    'copyright.disclaimerText': 'All media content (images, videos, articles, etc.) displayed on this website belongs to their respective owners, including but not limited to production companies, magazines, photographers, and official channels. We do not claim ownership of any copyrighted material.',
    'copyright.fairUseTitle': 'Fair Use',
    'copyright.fairUseText': 'Content is shared for educational and archival purposes, to document the career and artistic journey of Lookmhee & Sonya. We believe this constitutes fair use under Section 107 of the Copyright Act.',
    'creditTitle': 'Credits & Attribution',
    'creditText': 'We strive to provide proper attribution for all content. Whenever possible, we credit photographers, publications, and sources. If you notice any missing or incorrect credits, please contact us.',
    'copyright.contactTitle': 'Copyright Infringement Claims',
    'copyright.contactText': 'If you are a copyright holder and believe any content infringes on your rights, please contact us with the following information:',
    'copyright.contactItem1': '• Your name and contact information',
    'copyright.contactItem2': '• Description of the copyrighted work',
    'copyright.contactItem3': '• Location of the infringing content (URL)',
    'copyright.contactItem4': '• Statement of good faith belief',
    'copyright.contactEmail': 'Contact Email:',
    'copyright.responseTime': 'We will respond to valid claims within 48 hours and remove or properly attribute the content.',
  },
  zh: {
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
    'category.interview': '访谈',
    'category.variety': '综艺',
    'category.radio': '电台',
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
    'door.description.appearances': '颁奖礼、时装周与首映。',
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
    'subtype.fanmeeting': '见面会',
    'subtype.brand_event': '品牌活动',
    'subtype.birthday': '生日会',
    'subtype.premiere': '首映',
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
  },
  th: {
    // Navigation
    'nav.home': 'หน้าแรก',
    'nav.chronicle': 'บันทึก',
    'nav.exhibitions': 'นิทรรศการ',
    'nav.editorial': 'นิตยสาร',
    'nav.resonance': 'เสียงสะท้อน',
    'nav.duality': 'ความคู่',
    'nav.profiles': 'โปรไฟล์',
    'nav.gallery': 'แกลเลอรี่',
    'nav.projects': 'ผลงาน',
    'nav.copyright': 'ลิขสิทธิ์',
    'nav.schedule': 'กำหนดการ',
    'nav.toggleTheme': 'สลับธีม',
    'nav.toggleMenu': 'สลับเมนู',
    'nav.viewAll': 'ดูทั้งหมด',
    'nav.lmsy': 'LMSY',
    'nav.lookmhee': 'Lookmhee',
    'nav.sonya': 'Sonya',

    // Hero
    'hero.lmsy': 'LMSY',
    'hero.subtitle': 'Lookmhee & Sonya',
    'hero.scroll': 'เลื่อน',
    'hero.lookmhee': 'LOOKMHEE',
    'hero.sonya': 'SONYA',
    'hero.besties': 'พื้นที่พิเศษสำหรับ LMSY และ Besties ของพวกเธอ',

    // Quote
    'quote.text': '"บางความรู้สึกไม่อาจซ่อนไว้ได้ ไม่ว่าคุณจะพยายามเพียงใด..."',
    'quote.source': '— AFFAIR SERIES',

    // Latest Updates
    'updates.title': 'อัปเดตล่าสุด',
    'updates.photoshoot': 'ถ่ายแบบใหม่',
    'updates.season2': 'Affair ซีซัน 2',
    'updates.fanmeet': 'งานพบแฟนคลับ',
    'updates.gallery': 'แกลเลอรี่',
    'updates.series': 'ซีรีส์',
    'updates.schedule': 'กำหนดการ',
    'updates.comingSoon': 'เร็วๆ นี้',
    'updates.jan2025': 'ม.ค. 2025',
    'updates.dec2024': 'ธ.ค. 2024',

    // CTA
    'cta.title': 'สำรวจเรื่องราวของพวกเธอ',
    'cta.description': 'ค้นพบการเดินทางของ Lookmhee และ Sonya ผ่านผลงาน แกลเลอรี่ และกิจกรรมที่กำลังจะเกิดขึ้น',
    'cta.meetDuo': 'ร่วมการเดินทางด้วยกันนะ Besties',
    'cta.viewGallery': 'ดูแกลเลอรี่',

    // Profiles
    'profiles.title': 'โปรไฟล์',
    'profiles.description': 'รู้จัก Lookmhee และ Sonya - คู่หูพรสวรรค์เบื้องหลังซีรีส์ Affair',
    'profiles.viewProfile': 'ดูโปรไฟล์',
    'profiles.back': 'กลับสู่หน้าโปรไฟล์',

    // Profile Detail
    'profile.biography': 'ประวัติ',
    'profile.born': 'วันเกิด',
    'profile.height': 'ส่วนสูง',
    'profile.works': 'ผลงาน',
    'profile.quote': '"ขอบคุณทุกโอกาสที่ได้แบ่งปันเรื่องราวที่สัมผัสหัวใจ"',
    'profile.yearsOld': '{age} ปี',
    'profile.lead': 'นักแสดงนำ',
    'profile.supporting': 'นักแสดงสนับสนุน',
    'profile.guest': 'แขกรับเชิญ',

    // Gallery
    'gallery.title': 'แกลเลอรี่',
    'gallery.description': 'ภาพแต่ละภาพที่ถูกเก็บไว้ บันทึกช่วงเวลาที่พวกเธอได้เดินผ่านมา',
    'gallery.noImages': 'ไม่พบรูปภาพสำหรับแท็กนี้',
    'gallery.tagAll': 'ทั้งหมด',
    'gallery.tagMagazine': 'นิตยสาร',
    'gallery.tagAdvertising': 'โฆษณา',
    'gallery.tagStage': 'เวที',
    'gallery.tagStill': 'ภาพนิ่ง',
    'gallery.tagUntagged': 'ไม่มีหมวดหมู่',
    'gallery.viewProject': 'ดูผลงาน',
    'gallery.viewAllProjectImages': 'ดูรูปภาพทั้งหมดจากผลงานนี้',

    // Projects
    'projects.title': 'ผลงาน',
    'projects.description': 'ผลงานทั้งหมดค่อย ๆ รวมอยู่ที่นี่ และเวลาได้จัดลำดับให้แล้ว',
    'projects.relatedTitle': 'ผลงานประเภทเดียวกันเพิ่มเติม',
    'projects.filteredEmpty': 'ไม่มีผลงานในหมวดหมู่นี้',

    // Schedule
    'schedule.title': 'กำหนดการ',
    'schedule.description': 'ติดตามกิจกรรมและกำหนดการที่กำลังจะเกิดขึ้น',
    'schedule.upcoming': 'กิจกรรมที่กำลังจะเกิดขึ้น',
    'schedule.past': 'กิจกรรมที่ผ่านมา',
    'schedule.noEvents': 'ไม่มีกิจกรรมที่กำหนดไว้',
    'schedule.watchNow': 'รับชมเลย',

    // Construction Banner
    'banner.message': 'ยินดีต้อนรับสู่จักรวาลแห่งความรักที่ยังสร้างไม่เสร็จ เบสตี้ที่รัก ที่นี่กำลังค่อยๆ สมบูรณ์ขึ้น',
    'banner.status': 'กำลังก่อสร้าง',

    // Hero Section
    'hero.curator': 'จัดทำโดย Astra',
    'hero.portalsTitle': 'ประตูหลายมิติ',
    'hero.portalsSubtitle': 'ก้าวเข้าสู่มิติต่าง ๆ ในเรื่องราวของพวกเธอ',

    // Portals
    'portal.drama': 'ละครและผลงาน',
    'portal.dramaDesc': 'ที่นี่คือที่ที่พวกเธอถูกมองเห็น',
    'portal.live': 'อีเวนต์สด',
    'portal.liveDesc': 'ช่วงเวลาที่ได้อยู่ร่วมกัน',
    'portal.journey': 'การเดินทาง',
    'portal.journeyDesc': 'เส้นทางที่เดินตามร่วมกัน',
    'portal.daily': 'ชีวิตประจำวัน',
    'portal.dailyDesc': 'วันธรรมดาที่งดงาม',
    'portal.commercial': 'งานแบรนด์',
    'portal.commercialDesc': 'ความสอดคล้องกับโลกในอีกหลายมุม',
    'portal.editorial': 'นิตยสาร',
    'portal.editorialDesc': 'ทั้งหน้ากล้องและหลังกล้อง',
    'portal.appearance': 'การปรากฏตัวต่อสาธารณะ',
    'portal.appearanceDesc': 'ทุกครั้งที่พวกเธอก้าวเข้าสู่สายตาผู้คน',

    // Longform

    // Micro-Chronicle
    'chronicle.title': 'ลำดับเวลา',
    'chronicle.badge': 'เส้นเวลาคลัง',
    'chronicle.desc': 'สำรวจผลงานและภาพถ่ายในเว็บไซต์ตามลำดับเวลา ทุกการเปิดตัว การถ่ายภาพ และช่วงเวลาสำคัญ รวมเป็นบันทึกต่อเนื่องหนึ่งเดียว',
    'chronicle.hint': 'การ์ดผลงานเปิดเข้าสู่หน้าผลงาน การ์ดภาพเปิดไลต์บ็อกซ์พร้อมลิงก์ไปยังผลงาน',
    'chronicle.entries': 'รายการ',
    'chronicle.type': 'แหล่งข้อมูล',
    'chronicle.sourceLabel': 'ผลงานและภาพ',
    'chronicle.view': 'ภาพ',
    'chronicle.yearFilter': 'ปี',
    'chronicle.clearYear': 'ดูทุกปี',
    'chronicle.emptyAll': 'ยังไม่มีรายการในเส้นเวลา',
    'chronicle.emptyYear': 'เรื่องราวของปีนี้ยังไม่ได้ปรากฏที่นี่ เมื่อมีสิ่งใหม่ ๆ ค้นพบ เราจะค่อย ๆ เติมเข้ามา',
    'chronicle.eventProject': 'ผลงาน',
    'chronicle.eventImages': 'ภาพถ่าย',
    'chronicle.viewProject': 'ดูผลงานนี้',
    'chronicle.imageOne': 'ภาพ',
    'chronicle.imageMany': 'ภาพ',

    // Resonance (music section - not launched yet)
    'resonance.comingSoon': 'เร็วๆ นี้',
    'resonance.comingSoonDesc': 'ส่วนเพลงกำลังเตรียมอยู่ ยังไม่มีผลงานที่ประกาศอย่างเป็นทางการ - หน้านี้จะเปิดให้ชมทันทีที่มีเนื้อหาจริง',

    // Editorial empty state
    'editorial.emptyTitle': 'ยังไม่มีนิตยสารพิเศษที่แสดงได้',
    'editorial.emptyDesc': 'นิตยสารพิเศษจะปรากฏที่นี่เมื่อเผยแพร่อย่างเป็นทางการ',

    // Search (phase 5)
    'search.placeholder': 'ค้นหารูปภาพ ผลงาน…',
    'search.open': 'เปิดการค้นหา',
    'search.clear': 'ล้างคำค้นหา',
    'search.noResults': 'ไม่พบผลลัพธ์',
    'search.noResultsHint': 'ลองใช้คำค้นหาอื่น หรือเลือกดูหอศิลป์',
    'search.error': 'ขณะนี้ค้นหาไม่ได้ กรุณาลองใหม่ภายหลัง',
    'search.quickAccess': 'ทางลัด',
    'search.typeProject': 'ผลงาน',
    'search.typeGallery': 'รูปภาพ',
    'search.typeExhibition': 'คอลเลกชัน',
    'search.footerNavigate': 'ใช้ลูกศรเพื่อเลือก',
    'search.footerEnter': 'กด Enter เพื่อเปิด',
    'search.footerEsc': 'กด Esc เพื่อปิด',

    // Whispers (community message wall)
    'whispers.subtitle': 'สะสมเสียงสะท้อนของเบสตี้',
    'whispers.empty': 'กำลังค้นหาเสียงสะท้อน…',
    'whispers.notice': 'ทุกสัญญาณต้องผ่านการตรวจสอบก่อนเข้าคลัง',
    'whispers.formTitle': 'ส่งสัญญาณของคุณ',
    'whispers.formDesc': 'เสียงกระซิบของคุณต้องผ่านการตรวจสอบก่อนเข้าร่วมคลัง',
    'whispers.message': 'ข้อความของคุณ',
    'whispers.messagePlaceholder': 'ทิ้งสัญญาณไว้ในพื้นที่นี้…',
    'whispers.authorPlaceholder': 'ชื่อของคุณ',
    'whispers.authorLabel': 'ลายเซ็น',
    'whispers.locationPlaceholder': 'เมืองหรือดวงจันทร์',
    'whispers.locationLabel': 'พิกัด (ไม่บังคับ)',
    'whispers.energyLabel': 'เลือกสีพลังงานของคุณ',
    'whispers.errContent': 'ขาดเนื้อสัญญาณที่จำเป็น',
    'whispers.errAuthor': 'ขาดข้อมูลประจำตัวที่จำเป็น',
    'whispers.solar': 'สุริยคราส',
    'whispers.lunar': 'จันทรคราส',
    'whispers.success': '✓ ส่งสัญญาณแล้ว รอการอนุมัติเสียงสะท้อน…',
    'whispers.submitting': 'กำลังส่ง…',
    'whispers.submit': '[ ปล่อยสัญญาณ ]',
    'whispers.openForm': '[ ส่งสัญญาณ ]',
    'whispers.failed': 'ส่งข้อความไม่สำเร็จ',
    'whispers.networkError': 'เครือข่ายผิดพลาด กรุณาลองใหม่',
    'whispers.gates': 'ประตูเสียงกระซิบ',
    'vinyl.listen': 'ฟังเสียงสะท้อน',

    // 404 not-found
    'nf.title': 'ไม่พบหน้าเว็บ',
    'nf.desc': 'หน้าที่คุณค้นหาไม่มีอยู่หรือถูกย้ายไปแล้ว',
    'nf.home': 'กลับหน้าแรก',
    'nf.back': 'ย้อนกลับ',

    // Route error boundary
    'err.label': 'การส่งสัญญาณถูกขัดจังหวะ',
    'err.title': 'เกิดข้อผิดพลาด',
    'err.desc': 'ส่วนนี้ของคลังโหลดไม่ได้ กรุณาลองอีกครั้ง',
    'err.retry': 'ลองอีกครั้ง',

    // Editorial
    'editorial.title': 'นิตยสาร',
    'editorial.subtitle': 'นิตยสารและผลงานพิมพ์',
    'editorial.viewIssue': 'ดูฉบับ',
    'editorial.photographer': 'ช่างภาพ',
    'editorial.stylist': 'สไตลิสต์',
    'editorial.published': 'วันที่เผยแพร่',
    'editorial.backToGallery': 'กลับสู่แกลเลอรี่',
    'editorial.noIssues': 'ยังไม่มีนิตยสาร',
    'editorial.comingSoon': 'นิตยสารเพิ่มเติมจะมาเร็วๆ นี้...',

    // Exhibitions
    'exhibitions.title': 'นิทรรศการ',
    'exhibitions.subtitle': 'งานสะสมเรื่องราวภาพที่จัดแสดงอย่างประณีต',

    // Footer
    'footer.tagline': 'พื้นที่พิเศษสำหรับ LMSY และ Besties ของพวกเธอ',
    'footer.quickLinks': 'ลิงก์ด่วน',
    'footer.followUs': 'ติดตามเรา',
    'footer.copyright': '© {year} LMSY Fan Site. สงวนลิขสิทธิ์',
    'footer.madeWith': 'สร้างสรรค์ด้วย 💛 & 💙 โดย Bestie คนหนึ่ง สำหรับ Besties ทุกคน',
    'footer.instagram': 'Instagram',
    'footer.twitter': 'Twitter',
    'footer.disclaimer': 'ข้อจำกัดความรับผิดชอบลิขสิทธิ์: lmsy.space เป็นโปรเจกต์แฟนคลับไม่แสวงหากำไร สื่อทั้งหมดเป็นของเจ้าของตามกฎหมาย',

    // Shared presentation (phase 6 batch 1)
    'common.viewDetails': 'ดูรายละเอียด',
    'common.watch': 'รับชม',
    'common.loadMore': 'โหลดเพิ่มเติม',
    'common.loading': 'กำลังโหลด…',
    'common.imagesOne': 'รูปภาพ',
    'common.imagesMany': 'รูปภาพ',
    'common.close': 'ปิด',
    'common.previous': 'ก่อนหน้า',
    'common.next': 'ถัดไป',
    'common.source': 'ที่มา',
    'common.noImage': 'ไม่สามารถแสดงรูปภาพได้',
    'common.curatorNote': 'บันทึกภัณฑารักษ์',

    // Archive credit lines (editorial + project detail)
    'credit.officialTitle': 'เนื้อหาทางการ',
    'credit.official': 'สื่อทั้งหมดเป็นลิขสิทธิ์ของผู้จัดพิมพ์ต้นฉบับ จัดเก็บไว้เพื่อการชื่นชมเท่านั้น',
    'credit.fanTitle': 'ภาพจากแฟนคลับ',
    'credit.fan': 'ขอบคุณ Bestie ทุกคนที่บันทึกช่วงเวลาเหล่านี้ไว้',

    // Work categories (single source shared by Projects, detail and Chronicle)
    'category.series': 'ซีรีส์',
    'category.editorial': 'นิตยสารพิเศษ',
    'category.appearance': 'อีเวนต์',
    'category.commercial': 'โฆษณา',
    'category.journal': 'บันทึก',
    'category.daily': 'ชีวิตประจำวัน',
    'category.travel': 'ท่องเที่ยว',
    'category.music': 'มิวสิกวิดีโอ',
    'category.magazine': 'นิตยสาร',
    'category.other': 'อื่น ๆ',
    // Stable category vocabulary (see lib/category-registry.ts)
    'category.dramaWork': 'ละครและผลงาน',
    'category.liveEvent': 'อีเวนต์สด',
    'category.publicAppearance': 'การปรากฏตัวต่อสาธารณะ',
    'category.interview': 'บทสัมภาษณ์',
    'category.variety': 'รายการวาไรตี้',
    'category.radio': 'วิทยุ',
    'category.liveStream': 'ไลฟ์สด',
    'category.behindTheScenes': 'เบื้องหลัง',
    'category.personalTravel': 'ชีวิตส่วนตัวและการเดินทาง',
    'category.earlyArchive': 'คลังภาพยุคแรก',

    // Navigation (phase 7: four entries + search)
    'nav.timeline': 'ไทม์ไลน์',
    'nav.people': 'บุคคล',

    // Homepage sections
    'home.collecting': 'กำลังรวบรวม',
    'home.featuredTitle': 'เสียงสะท้อนของหัวใจ',
    'home.featuredSubtitle': 'ความเข้าใจกันระหว่างเธอกับเธอ',
    'home.talkDoor': 'บทสนทนา',
    'home.talkDoorHint': 'คนอื่นถาม แล้วคนอื่นตัดต่อ',
    'home.liveDoor': 'ไลฟ์',
    'home.liveDoorHint': 'ไม่มีการตัดต่อ ไม่มีคนถาม',
    'home.talkEntries': '{count} รายการ',
    'home.liveEntries': '{count} ครั้ง',
    'home.timelineTitle': 'กลับไปพบพวกเธออีกครั้งผ่านกาลเวลา',
    'home.timelineSubtitle': 'บางความทรงจำคุ้มค่าที่จะย้อนกลับมา',
    'home.peopleTitle': 'พวกเธอกับ Besties',
    'home.peopleSubtitle': 'ทุกอย่างเริ่มต้นจากความชื่นชอบในตัวพวกเธอ และดำเนินต่อไปเพราะความทรงจำเหล่านี้มีคุณค่าที่ควรเก็บรักษาไว้',

    // /talks และ /live - หน้าปลายทางของสองประตู
    'talks.title': 'บทสนทนา',
    'talks.description': 'บทสัมภาษณ์ วาไรตี้ และวิทยุ',
    'talks.tabAll': 'ทั้งหมด',
    'talks.tabInterview': 'บทสัมภาษณ์',
    'talks.tabVariety': 'วาไรตี้',
    'talks.tabRadio': 'วิทยุ',

    // /dramas - ประตูแรกของคลัง
    'dramas.title': 'ซีรีส์',
    'dramas.description': 'ซีรีส์และภาพที่เกี่ยวข้อง',
    'dramas.eventCount': '{count} รายการ',
    'dramas.viewSeries': 'เปิดซีรีส์',

    // Doors 2-5
    'door.description.liveEvents': 'งานแฟนมีตติ้ง วันเกิด และกิจกรรมของแบรนด์',
    'door.description.appearances': 'งานประกาศรางวัล สัปดาห์แฟชั่น และรอบปฐมทัศน์',
    'door.description.commercial': 'งานพรีเซ็นเตอร์และโฆษณา',
    'door.viewCategory': 'เปิดหมวดนี้',
    'door.unfiled': 'ยังไม่จัดหมวด',
    'door.video': 'วิดีโอ',
    'drama.footageCount': '{count} ชิ้น',
    'drama.back': 'กลับไปซีรีส์',
    'drama.eventImages': '{count} รูป',
    'drama.noImages': 'รอรูป',
    'drama.backToEvent': 'กลับไปซีรีส์',
    'drama.relatedImages': 'รูปที่เกี่ยวข้อง',
    'drama.watchExternal': 'รับชมบนแพลตฟอร์มต้นทาง',
    'drama.watchNote': 'หน้านี้เป็นเพียงบทนำ การรับชมอยู่บนแพลตฟอร์มต้นทาง',
    'drama.linkPending': 'อยู่ระหว่างยืนยันลิงก์รับชม',
    'subtype.affair': 'รักเล่นกล',
    'subtype.harmony_secret': 'ดีลลับฉบับเล่นเล่ห์',
    'subtype.hometown_romance': 'สามีบ้านนอก',
    'drama.group.seriesBody': 'ซีรีส์',
    'drama.group.music': 'เพลง',
    'drama.group.novel': 'นวนยาย',
    'drama.group.promo': 'ประกาศ',
    'drama.group.footage': 'ฟุตเทจ',
    'drama.group.award': 'รางวัล',
    'drama.awardWon': 'ได้รางวัล',
    'drama.awardNominated': 'เข้าชิง',
    'live.title': 'ไลฟ์',
    'live.description': 'ไลฟ์คู่และไลฟ์เดี่ยว',
    'live.tabAll': 'ทั้งหมด',
    'live.tabDuo': 'คู่',

    // Timeline
    'timeline.title': 'ไทม์ไลน์',
    'timeline.description': 'จากวันหนึ่งในปี สู่วันสำคัญอีกวัน ค่อย ๆ ย้อนกลับไปตามเส้นทางของเวลา',
    'timeline.emptyYear': 'เรื่องราวของปีนี้ยังไม่ได้ปรากฏที่นี่ เมื่อมีสิ่งใหม่ ๆ ค้นพบ เราจะค่อย ๆ เติมเข้ามา',
    'timeline.records': '{count} รายการ',
    'timeline.unknownDate': 'ไม่ทราบวันที่',

    // People
    'people.title': 'บุคคล',
    'people.description': 'คลังแห่งนี้เริ่มต้นจากพวกเธอ และพวกเธอยังคงเป็นเหตุผลที่ทำให้เราเก็บรวบรวมเรื่องราวต่อไป',
    'people.relatedProjects': '{count} รายการ',
    'people.noProjects': 'ผลงานที่เกี่ยวข้องกับบุคคลนี้กำลังอยู่ระหว่างการรวบรวม',
    'people.birthday': 'วันเกิด',

    // Project detail
    'project.tabAll': 'ทั้งหมด',
    'project.tabStills': 'ภาพนิ่ง',
    'project.tabBts': 'เบื้องหลัง',
    'project.tabPress': 'สื่อและอีเวนต์',
    'project.watchNow': 'รับชมเลย',
    'project.emptyTitle': 'ยังไม่มีรูปภาพในหมวดนี้',
    'project.emptyDesc': 'เนื้อหาใหม่จะปรากฏที่นี่เมื่อได้รับการคัดสรร',
    'project.interview': 'บทสัมภาษณ์',
    'project.watchInterview': 'ชมวิดีโอบทสัมภาษณ์',
    'project.cover': 'ปก',
    'project.featured': 'แนะนำ',
    'project.unsorted': 'ยังไม่จัดกลุ่ม',
    'project.dateUnknown': 'ไม่ทราบวันที่',
    'project.noteStillsTitle': 'บันทึกภัณฑารักษ์',
    'project.noteStills':
      'ภาพนิ่งที่คัดสรรเหล่านี้เก็บรายละเอียดของผลงานและภาษาภาพที่นิยามโปรเจกต์นี้',
    'project.noteBtsTitle': 'เบื้องหลัง',
    'project.noteBts':
      'ช่วงเวลาระหว่างการถ่ายทำ — กระบวนการ เสียงหัวเราะ และความตั้งใจที่ทำให้เรื่องราวเกิดขึ้น',
    'project.notePressTitle': 'สื่อและอีเวนต์',
    'project.notePress':
      'เส้นทางการพบปะสาธารณะ: พรมแดง งานแถลงข่าว และความตื่นเต้นที่แบ่งปันกับแฟน ๆ และสื่อ',

    // Gallery states
    'gallery.emptyAll': 'ที่นี่ยังไม่มีภาพในตอนนี้ Astra จะค่อย ๆ รวบรวมภาพเหล่านั้นต่อไปด้วยความใส่ใจ',
    'gallery.emptyFiltered': 'ไม่พบรูปภาพที่ตรงกับตัวกรองนี้',
    'gallery.resetFilter': 'ดูรูปภาพทั้งหมด',

    // Projects list states
    'projects.emptyAll': 'หน้านี้กำลังค่อย ๆ เติมเต็ม ผลงานใหม่ ๆ จะทยอยมาที่นี่',
    'projects.photoCount': '{count} รูปภาพ',
    'projects.noImages': 'ยังไม่มีรูปภาพในคลัง',
    'projects.kindTheme': 'ธีม',

    // แท็บหมวดย่อยภายในฮอลล์
    'subtype.fanmeeting': 'แฟนมีตติ้ง',
    'subtype.brand_event': 'อีเวนต์แบรนด์',
    'subtype.birthday': 'วันเกิด',
    'subtype.premiere': 'รอบปฐมทัศน์',
    'subtype.awards': 'รางวัล',
    'subtype.fashion': 'สัปดาห์แฟชั่น',
    'subtype.brand_stage': 'งานแบรนด์',
    'subtype.charity': 'การกุศล',
    'subtype.industry': 'งานอุตสาหกรรม',
    'subtype.duo': 'สองคน',
    'subtype.lookmhee': 'Lookmhee',
    'subtype.sonya': 'Sonya',

    // Editorial meta
    'editorial.issueCount': 'คัดสรรแล้ว {count} ฉบับ',
    'editorial.releaseDate': 'วันที่เผยแพร่',
    'editorial.artifacts': 'ชิ้นงาน',
    'editorial.curatorNote': 'บันทึกภัณฑารักษ์',
    'editorial.insideIssue': 'ภายในฉบับนี้',
    'editorial.pagesPreserved': 'เก็บรักษาไว้ {count} หน้า',
    'editorial.pagesEmpty': 'ฉบับนี้ยังไม่มีหน้าที่ถูกดิจิทัล',
    'editorial.pagesEmptyHint': 'หน้าต่าง ๆ จะปรากฏที่นี่เมื่อได้รับการคัดสรร',
    'editorial.noCover': 'ไม่มีปก',
    'editorial.dateTbd': 'รอยืนยันวันที่',
    'editorial.loading': 'กำลังโหลด',

    'features.title': 'หัวข้อพิเศษ',
    'features.subtitle': 'คอลเลกชันพิเศษ',
    'features.viewIssue': 'ดูหัวข้อ',
    'features.artifacts': 'ชิ้นงาน',
    'features.noCover': 'ไม่มีปก',
    'features.emptyTitle': 'ยังไม่มีหัวข้อพิเศษที่แสดงได้',
    'features.emptyDesc': 'หัวข้อพิเศษจะปรากฏที่นี่เมื่อเผยแพร่อย่างเป็นทางการ',
    'features.issueCount': 'คัดสรรแล้ว {count} หัวข้อ',
    'features.dateTbd': 'รอยืนยันวันที่',
    'features.releaseDate': 'วันที่เผยแพร่',
    'features.curatorNote': 'บันทึกภัณฑารักษ์',
    'features.pagesEmpty': 'หัวข้อนี้ยังไม่มีภาพที่ถูกดิจิทัล',
    'features.pagesEmptyHint': 'ภาพจะปรากฏที่นี่เมื่อได้รับการคัดสรร',
    'features.insideIssue': 'ภายในหัวข้อนี้',
    'features.pagesPreserved': 'เก็บรักษาไว้ {count} ภาพ',

    // Chronicle empty state helper
    'chronicle.tryAnotherYear': 'ลองดูปีอื่น:',

    // Homepage CTAs
    'home.explore': 'สำรวจ',
    'home.enterArchive': 'เข้าสู่คลัง',
    'home.storyContinues': 'เรื่องราวยังดำเนินต่อ',

    // Copyright Page
    'copyright.title': 'นโยบายลิขสิทธิ์',
    'copyright.subtitle': 'เคารผู้สร้างสรรค์ รักษาความทรงจำ',
    'copyright.intro': 'lmsy.space เป็นโปรเจกต์แฟนคลับไม่แสวงหากำไร ที่อุทิศตนให้กับการรักษาและแบ่งปันช่วงเวลาที่งดงามของ Lookmhee & Sonya ให้แฟนๆ ทั่วโลก',
    'copyright.disclaimerTitle': 'ข้อจำกัดความรับผิดชอบลิขสิทธิ์',
    'copyright.disclaimerText': 'เนื้อหาสื่อทั้งหมด (รูปภาพ วิดีโอ บทความ ฯลฯ) ที่แสดงบนเว็บไซต์นี้เป็นของเจ้าของตามกฎหมาย รวมถึงแต่ไม่จำกัดเฉพาะ บริษัทผลิต นิตยสาร ช่างภาพ และช่องทางทางการ เราไม่อ้างสิทธิ์ในทรัพย์สินที่มีลิขสิทธิ์ใดๆ',
    'copyright.fairUseTitle': 'การใช้งานที่เป็นธรรม',
    'copyright.fairUseText': 'เนื้อหาถูกแบ่งปันเพื่อวัตถุประสงค์ทางการศึกษาและเก็บถาวร เพื่อบันทึกการเดินทางอาชีพและศิลปะของ Lookmhee & Sonya เราเชื่อว่านี่เป็นการใช้งานที่เป็นธรรมตามมาตรา 107 ของพระราชบัญญัติลิขสิทธิ์',
    'creditTitle': 'เครดิตและการระบุแหล่งที่มา',
    'creditText': 'เรามุ่งมั่นที่จะระบุแหล่งที่มาอย่างเหมาะสมสำหรับเนื้อหาทั้งหมด เมื่อเป็นไปได้ เราจะระบุชื่อช่างภาพ สิ่งพิมพ์ และแหล่งที่มา หากคุณพบเครดิตที่ขาดหายไปหรือไม่ถูกต้อง กรุณาติดต่อเรา',
    'copyright.contactTitle': 'การร้องเรียนการละเมิดลิขสิทธิ์',
    'copyright.contactText': 'หากคุณเป็นเจ้าของลิขสิทธิ์และเชื่อว่าเนื้อหาใดละเมิดสิทธิ์ของคุณ กรุณาติดต่อเราพร้อมข้อมูลต่อไปนี้:',
    'copyright.contactItem1': '• ชื่อและข้อมูลติดต่อของคุณ',
    'copyright.contactItem2': '• คำอธิบายของงานที่มีลิขสิทธิ์',
    'copyright.contactItem3': '• ตำแหน่งของเนื้อหาที่ละเมิด (URL)',
    'copyright.contactItem4': '• คำแถลงความเชื่อโดยสุจริต',
    'copyright.contactEmail': 'อีเมลติดต่อ:',
    'copyright.responseTime': 'เราจะตอบรับการร้องเรียนที่ถูกต้องภายใน 48 ชั่วโมง และลบหรือระบุแหล่งที่มาที่เหมาะสม',
  },
} as const;

export function getTranslation(lang: Language, key: TranslationKey): string {
  return translations[lang][key];
}

export function t(lang: Language, key: TranslationKey, params?: Record<string, string | number>): string {
  let translation: string = translations[lang][key];

  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      translation = translation.replace(`{${param}}`, String(value));
    });
  }

  return translation;
}
