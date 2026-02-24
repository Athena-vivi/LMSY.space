/**
 * Delete fake mock data from database
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

async function deleteFakeData() {
  // Delete items with 'mock' in source_url
  const { data, error } = await supabase
    .from('draft_items')
    .delete()
    .ilike('source_url', '%mock%')
    .select('id, source_url');

  if (error) {
    console.error('Error deleting fake data:', error);
    return;
  }

  console.log(`✅ Deleted ${data.length} fake items:`);
  data.forEach((item: any) => {
    console.log(`   - ${item.id}: ${item.source_url}`);
  });
}

deleteFakeData();
