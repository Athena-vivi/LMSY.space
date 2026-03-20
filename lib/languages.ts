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
    'gallery.description': 'A visual journey through moments captured in time.',
    'gallery.noImages': 'No images found for this tag.',
    'gallery.tagAll': 'All',
    'gallery.tagFashion': 'Fashion',
    'gallery.tagBehindTheScene': 'BehindTheScene',
    'gallery.tagAffair': 'Affair',
    'gallery.tagMagazine': 'Magazine',

    // Projects
    'projects.title': 'Projects',
    'projects.description': 'Explore the complete filmography and magazine features of Lookmhee and Sonya.',

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
    'hero.portalsSubtitle': 'Enter different dimensions of their story',

    // Portals
    'portal.drama': 'Drama',
    'portal.dramaDesc': 'Characters that became reality',
    'portal.live': 'Live Events',
    'portal.liveDesc': 'Moments shared in time',
    'portal.journey': 'Journey',
    'portal.journeyDesc': 'Paths walked together',
    'portal.daily': 'Daily',
    'portal.dailyDesc': 'Beautiful ordinary days',
    'portal.commercial': 'Commercial',
    'portal.commercialDesc': 'Where inspiration meets value',

    // Longform

    // Micro-Chronicle
    'chronicle.title': 'Milestones',

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
    'gallery.description': '一场视觉之旅，记录那些被时光捕捉的瞬间。',
    'gallery.noImages': '此标签下暂无图片。',
    'gallery.tagAll': '全部',
    'gallery.tagFashion': '时尚',
    'gallery.tagBehindTheScene': '幕后花絮',
    'gallery.tagAffair': 'Affair',
    'gallery.tagMagazine': '杂志',

    // Projects
    'projects.title': '作品',
    'projects.description': '探索 Lookmhee 和 Sonya 的完整作品集和杂志封面。',

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
    'portal.drama': '戏剧',
    'portal.dramaDesc': '角色照进现实',
    'portal.live': '现场',
    'portal.liveDesc': '时光共享的瞬间',
    'portal.journey': '旅途',
    'portal.journeyDesc': '同行相伴的足迹',
    'portal.daily': '日常',
    'portal.dailyDesc': '美好的平凡岁月',
    'portal.commercial': '商务',
    'portal.commercialDesc': '品牌灵感的碰撞',

    // Longform

    // Micro-Chronicle
    'chronicle.title': '里程碑',

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
    'gallery.description': 'การเดินทางทางสายตาผ่านช่วงเวลาที่ถูกบันทึกไว้',
    'gallery.noImages': 'ไม่พบรูปภาพสำหรับแท็กนี้',
    'gallery.tagAll': 'ทั้งหมด',
    'gallery.tagFashion': 'แฟชั่น',
    'gallery.tagBehindTheScene': 'เบื้องกล้อง',
    'gallery.tagAffair': 'Affair',
    'gallery.tagMagazine': 'นิตยสาร',

    // Projects
    'projects.title': 'ผลงาน',
    'projects.description': 'สำรวจผลงานและปกนิตยสารทั้งหมดของ Lookmhee และ Sonya',

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
    'hero.portalsTitle': 'ประตูมิติ',
    'hero.portalsSubtitle': 'เดินทางเข้าสู่มิติต่างๆ ของเรื่องราวพวกเธอ',

    // Portals
    'portal.drama': 'ละคร',
    'portal.dramaDesc': 'ตัวละครที่กลายเป็นความจริง',
    'portal.live': 'อีเวนต์',
    'portal.liveDesc': 'ช่วงเวลาที่แบ่งปันด้วยกัน',
    'portal.journey': 'การเดินทาง',
    'portal.journeyDesc': 'เส้นทางที่เดินตามร่วมกัน',
    'portal.daily': 'ชีวิตประจำวัน',
    'portal.dailyDesc': 'วันธรรมดาที่งดงาม',
    'portal.commercial': 'ธุรกิจ',
    'portal.commercialDesc': 'จุดบรรจบของแรงบันดาลความคุณค่า',

    // Longform

    // Micro-Chronicle
    'chronicle.title': 'ช่วงเวลาสำคัญ',

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
