/**
 * Query all items from today to see what was ingested
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'lmsy_archive',
    },
  }
);

async function queryTodayItems() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('draft_items')
    .select('*')
    .gte('created_at', today)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n📊 Items created today (${today}): ${data.length}\n`);

  // Filter for items with source_platform='weibo' and Q统计量 tag
  const weiboItems = data.filter((item: any) =>
    item.source_platform === 'weibo' && item.tags?.includes('Q统计量')
  );

  console.log(`📱 Weibo items with "Q统计量" tag: ${weiboItems.length}\n`);

  weiboItems.forEach((item: any, index: number) => {
    console.log(`   [${index + 1}] ${item.source_url}`);
    console.log(`       Title EN: ${item.title?.en?.substring(0, 50) || 'N/A'}...`);
    console.log(`       R2 URL: ${item.r2_media_url || 'N/A'}`);
    console.log(`       Status: ${item.ingestion_stage || item.status}\n`);
  });
}

queryTodayItems();
