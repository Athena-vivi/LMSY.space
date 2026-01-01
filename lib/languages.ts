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
    'nav.profiles': 'Profiles',
    'nav.gallery': 'Gallery',
    'nav.projects': 'Projects',
    'nav.schedule': 'Schedule',
    'nav.toggleTheme': 'Toggle theme',
    'nav.toggleMenu': 'Toggle menu',
    'nav.viewAll': 'View All',

    // Hero
    'hero.lmsy': 'LMSY',
    'hero.subtitle': 'Lookmhee & Sonya',
    'hero.scroll': 'SCROLL',
    'hero.lookmhee': 'LOOKMHEE',
    'hero.sonya': 'SONYA',

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

    // Footer
    'footer.tagline': 'A dedicated space for LMSY and their Besties.',
    'footer.quickLinks': 'Quick Links',
    'footer.followUs': 'Follow Us',
    'footer.copyright': '© {year} LMSY Fan Site. All rights reserved.',
    'footer.madeWith': 'Crafted with 💛 & 💙 by a Bestie, for all Besties',
    'footer.instagram': 'Instagram',
    'footer.twitter': 'Twitter',

    // Hero
    'hero.besties': 'A dedicated space for LMSY and their Besties.',
  },
  zh: {
    // Navigation
    'nav.home': '首页',
    'nav.profiles': '成员资料',
    'nav.gallery': '相册',
    'nav.projects': '作品',
    'nav.schedule': '日程',
    'nav.toggleTheme': '切换主题',
    'nav.toggleMenu': '切换菜单',
    'nav.viewAll': '查看全部',

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

    // Footer
    'footer.tagline': '属于 LMSY 和她们的 Besties 专属空间。',
    'footer.quickLinks': '快速链接',
    'footer.followUs': '关注我们',
    'footer.copyright': '© {year} LMSY 粉丝网站。版权所有。',
    'footer.madeWith': '由一位 Bestie 用 💛 & 💙 为所有 Besties 打造',
    'footer.instagram': 'Instagram',
    'footer.twitter': 'Twitter',
  },
  th: {
    // Navigation
    'nav.home': 'หน้าแรก',
    'nav.profiles': 'โปรไฟล์',
    'nav.gallery': 'แกลเลอรี่',
    'nav.projects': 'ผลงาน',
    'nav.schedule': 'กำหนดการ',
    'nav.toggleTheme': 'สลับธีม',
    'nav.toggleMenu': 'สลับเมนู',
    'nav.viewAll': 'ดูทั้งหมด',

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

    // Footer
    'footer.tagline': 'พื้นที่พิเศษสำหรับ LMSY และ Besties ของพวกเธอ',
    'footer.quickLinks': 'ลิงก์ด่วน',
    'footer.followUs': 'ติดตามเรา',
    'footer.copyright': '© {year} LMSY Fan Site. สงวนลิขสิทธิ์',
    'footer.madeWith': 'สร้างสรรค์ด้วย 💛 & 💙 โดย Bestie คนหนึ่ง สำหรับ Besties ทุกคน',
    'footer.instagram': 'Instagram',
    'footer.twitter': 'Twitter',
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
