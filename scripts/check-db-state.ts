import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Check gallery
  const { data: gallery } = await client
    .schema('lmsy_archive')
    .from('gallery')
    .select('catalog_id, project_id, event_date')
    .limit(10);

  console.log('Gallery sample:');
  console.table(gallery);

  // Check projects
  const { data: projects } = await client
    .schema('lmsy_archive')
    .from('projects')
    .select('id, title, release_date, cover_url')
    .eq('category', 'editorial');

  console.log('\nProjects:');
  console.table(projects);
}

main().catch(console.error);
