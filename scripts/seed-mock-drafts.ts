/**
 * Seed Mock Draft Items for Testing
 * Run with: npx tsx scripts/seed-mock-drafts.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          process.env[key] = value;
        }
      }
    });

    console.log('Loaded .env.local successfully');
  } catch (error) {
    console.warn('Could not load .env.local:', error);
  }
}

loadEnvFile();

// Try both ports 3000 and 3001
async function getAvailablePort(): Promise<string> {
  try {
    const response = await fetch('http://localhost:3000/api/health', { method: 'GET' });
    if (response.ok) return 'http://localhost:3000';
  } catch {}
  try {
    const response = await fetch('http://localhost:3001/api/health', { method: 'GET' });
    if (response.ok) return 'http://localhost:3001';
  } catch {}
  return 'http://localhost:3000';
}

// Mock draft items data
const mockDrafts = [
  {
    source_url: 'https://twitter.com/user/status/123456789',
    source_platform: 'twitter' as const,
    source_post_id: 'mock_001',
    r2_media_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf?w=800&h=800&fit=crop',
    r2_key: 'draft/twitter/mock/mock-001.jpg',
    media_type: 'image' as const,
    media_metadata: { width: 800, height: 800, duration: null, size: 152000, format: 'jpg' },
    title: {
      en: 'Lookmhee and Sonya at the fan meeting - such beautiful smiles!',
      zh: 'Lookmhee和Sonya在粉丝见面会——笑容太美了！',
      th: 'ลุคมีกับโซนย่าในงานแฟนมีตติ้ง รอยยิ้มสวยงามมาก!',
    },
    description: {
      en: 'The way they look at each other... my heart! Both wearing matching outfits today.',
      zh: '她们看着彼此的眼神...我的心！今天两人穿着情侣装。',
      th: 'วิธีที่พวกเธอมองมาหาความสัมพันธ์กัน... ใจฉันอ่ะ! วันนี้ใส่ชุดตัวเหมือนกัน',
    },
    event_date: new Date().toISOString().split('T')[0],
    status: 'draft' as const,
    ingestion_stage: 'ready' as const,
    ai_translation_status: 'completed' as const,
    tags: ['fanmeeting', 'smile', 'matching'],
    is_featured: true,
  },
  {
    source_url: 'https://instagram.com/p/ABC123/',
    source_platform: 'instagram' as const,
    source_post_id: 'mock_002',
    r2_media_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=800&fit=crop',
    r2_key: 'draft/instagram/mock/mock-002.jpg',
    media_type: 'image' as const,
    media_metadata: { width: 800, height: 800, duration: null, size: 145000, format: 'jpg' },
    title: {
      en: 'Behind the scenes: Magazine shoot diary',
      zh: '幕后花絮：杂志拍摄日记',
      th: 'เบื้องหลัง: ไดอารี่การถ่ายแบบนิตยสาร',
    },
    description: {
      en: 'Lookmhee was so nervous before the shoot, but Sonya helped calm her down. Such sweet sisterly moments!',
      zh: '拍摄前Lookmhee很紧张，但Sonya帮她冷静下来。姐妹情深！',
      th: 'ก่อนถ่ายลุคมี้ตื่นเต้นมากแต่โซนย่าช่วยให้สงบลง ช่วงเวลาพี่น้องหวานๆ!',
    },
    event_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    status: 'draft' as const,
    ingestion_stage: 'ready' as const,
    ai_translation_status: 'completed' as const,
    tags: ['behind', 'magazine', 'sweet'],
    is_featured: false,
  },
  {
    source_url: 'https://weibo.com/123456',
    source_platform: 'weibo' as const,
    source_post_id: 'mock_003',
    r2_media_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
    r2_key: 'draft/weibo/mock/mock-003.jpg',
    media_type: 'image' as const,
    media_metadata: { width: 800, height: 600, duration: null, size: 138000, format: 'jpg' },
    title: {
      en: 'Outdoor photoshoot in the park - golden hour magic',
      zh: '公园户外拍摄——黄金时刻的魔力',
      th: 'ถ่ายรูปกลางแจ้งในสวนสาธารณช่วงเวลาทองคำ',
    },
    description: {
      en: 'The golden hour light was perfect. They look like they walked out of a fairytale.',
      zh: '黄金时刻的光线完美极了。她们像是从童话故事里走出来的。',
      th: 'แสงไล่ช่วงเวลาทองคำสวยงามมาก พวกเธอดูลเหมือนตัวละครในนิทาน',
    },
    event_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    status: 'ready' as const,
    ingestion_stage: 'ready' as const,
    ai_translation_status: 'completed' as const,
    tags: ['outdoor', 'park', 'golden-hour'],
    is_featured: true,
  },
  {
    source_url: 'https://xiaohongshu.com/explore/123',
    source_platform: 'xiaohongshu' as const,
    source_post_id: 'mock_004',
    // VIDEO: Using a sample video URL
    r2_media_url: 'https://videos.pexels.com/video-files/5752729/5752729-uhd_2560_1440_25fps.mp4',
    r2_key: 'draft/xiaohongshu/mock/mock-004.mp4',
    media_type: 'video' as const,
    media_metadata: { width: 2560, height: 1440, duration: 15, size: 5200000, format: 'mp4' },
    title: {
      en: 'Cute moment: Sonya trying to teach Lookmhee a TikTok dance',
      zh: '可爱瞬间：Sonya教Lookmhee跳抖音舞',
      th: 'ช่วงเวลาน่ารัก: โซนย่าสอนลุคมี้เต้นทิกท็อก',
    },
    description: {
      en: 'Lookmhee keeps forgetting the steps but Sonya is so patient! Their laughter is contagious.',
      zh: 'Lookmhee老是忘记舞步，但Sonya超级有耐心！她们的笑声太有感染力了。',
      th: 'ลุคมี้ลืมท่าเต้นตลอดแต่โซนย่าใจเย็นมาก! หัวเราะของพวกเธอติดเชื้อมาก',
    },
    event_date: new Date(Date.now() - 259200000).toISOString().split('T')[0],
    status: 'draft' as const,
    ingestion_stage: 'ready' as const,
    ai_translation_status: 'completed' as const,
    tags: ['cute', 'dance', 'tiktok', 'funny'],
    is_featured: true,
  },
  {
    source_url: 'https://youtube.com/watch?v=example',
    source_platform: 'manual' as const,
    source_post_id: 'mock_005',
    r2_media_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=800&fit=crop',
    r2_key: 'draft/manual/mock/mock-005.jpg',
    media_type: 'image' as const,
    media_metadata: { width: 800, height: 800, duration: null, size: 165000, format: 'jpg' },
    title: {
      en: 'Throwback to their first drama together',
      zh: '回顾她们首次合作的剧集',
      th: 'ย้อนวันวาไปละครแรกที่ร่วมงานด้วยกัน',
    },
    description: {
      en: 'Where it all began! This scene still makes us emotional after all these years.',
      zh: '一切开始的地方！这么多年过去，这场戏依然让我们感动。',
      th: 'จุดเริ่มต้นของทุกอย่าง! ฉากนี้ยังทำให้เรารู้สึกอยู่จนถึงวันนี้',
    },
    event_date: new Date(Date.now() - 345600000).toISOString().split('T')[0],
    status: 'draft' as const,
    ingestion_stage: 'ready' as const,
    ai_translation_status: 'completed' as const,
    tags: ['throwback', 'first-drama', 'emotional'],
    is_featured: false,
  },
];

async function main() {
  console.log('=== Seeding Mock Draft Items ===\n');

  // Try port 3000 first, then 3001
  let API_BASE = 'http://localhost:3000';
  try {
    const response = await fetch('http://localhost:3000/api/health', { method: 'GET' });
    if (!response.ok) throw new Error();
  } catch {
    API_BASE = 'http://localhost:3001';
  }

  console.log(`Using API_BASE: ${API_BASE}`);

  // Check if Next.js dev server is running
  console.log('Checking if Next.js dev server is running...');
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
    }).catch(() => null);

    if (!response?.ok) {
      console.warn('⚠️  Next.js dev server may not be running.');
      console.warn('   Please run "npm run dev" in another terminal first.');
      console.log('');
    } else {
      console.log('✅ Dev server is running\n');
    }
  } catch {
    console.warn('⚠️  Could not connect to dev server. Make sure "npm run dev" is running.\n');
  }

  // We'll insert directly into the database using the API
  // First, let's use the ingest API which we know works
  console.log('Seeding 5 mock draft items via Ingest API...\n');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < mockDrafts.length; i++) {
    const draft = mockDrafts[i];

    try {
      // Since we're mocking data that already has R2 URLs, we need to insert directly
      // Using a special admin endpoint we'll create
      const response = await fetch('${API_BASE}/api/admin/drafts/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });

      if (response.ok) {
        const result = await response.json();
        successCount++;
        console.log(`✅ [${i + 1}/5] Seeded: ${draft.title.en.substring(0, 40)}...`);
        if (result.data?.id) {
          console.log(`   ID: ${result.data.id}`);
        }
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        failCount++;
        console.log(`❌ [${i + 1}/5] Failed: ${error.error || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      failCount++;
      console.log(`❌ [${i + 1}/5] Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('');
  console.log('=== Seed Summary ===');
  console.log(`Total: ${mockDrafts.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);

  if (successCount > 0) {
    console.log('\n✅ Mock data seeded successfully!');
    console.log('Now you can visit ${API_BASE}/admin/drafts to see the UI');
    console.log('\n📹 Note: Item 4 is a VIDEO test (hover to see auto-play)');
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Uncaught error:', error);
  process.exit(1);
});
