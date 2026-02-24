/**
 * Query Ingested Items - Show full data with translations and R2 URLs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load env variables
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

async function queryIngestedItems() {
  const { data, error } = await supabase
    .from('draft_items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('═════════════════════════════════════════════════════════');
  console.log('            INGESTED ITEMS WITH FULL DATA');
  console.log('═════════════════════════════════════════════════════════\n');

  data.forEach((item: any, index: number) => {
    console.log(`【ITEM ${index + 1}】`);
    console.log(`ID: ${item.id}`);
    console.log(`Source URL: ${item.source_url}`);
    console.log(`Source Platform: ${item.source_platform}`);
    console.log(`Media Type: ${item.media_type}`);
    console.log(`Status: ${item.status}`);
    console.log('');
    console.log('📝 TITLES (AI Translated):');
    console.log(`  EN: ${item.title?.en || 'N/A'}`);
    console.log(`  ZH: ${item.title?.zh || 'N/A'}`);
    console.log(`  TH: ${item.title?.th || 'N/A'}`);
    console.log('');
    console.log('📄 DESCRIPTIONS:');
    const desc = item.description;
    console.log(`  EN: ${desc?.en?.substring(0, 100) || 'N/A'}${desc?.en?.length > 100 ? '...' : ''}`);
    console.log(`  ZH: ${desc?.zh?.substring(0, 100) || 'N/A'}${desc?.zh?.length > 100 ? '...' : ''}`);
    console.log(`  TH: ${desc?.th?.substring(0, 100) || 'N/A'}${desc?.th?.length > 100 ? '...' : ''}`);
    console.log('');
    console.log('🖼️  MEDIA URLs:');
    console.log(`  Original: ${item.media_url || 'N/A'}`);
    console.log(`  R2 CDN: ${item.r2_media_url || 'N/A'}`);
    console.log(`  R2 Key: ${item.r2_key || 'N/A'}`);
    console.log('');
    console.log('📅 DATES:');
    console.log(`  Event Date: ${item.event_date || 'N/A'}`);
    console.log(`  Raw Event Date: ${item.raw_event_date || 'N/A'}`);
    console.log(`  Created At: ${item.created_at}`);
    console.log('');
    console.log('🏷️  TAGS:', item.tags || []);
    console.log(`  Featured: ${item.is_featured ? 'Yes' : 'No'}`);
    console.log('');
    console.log('───────────────────────────────────────────────────────────\n');
  });
}

queryIngestedItems();
