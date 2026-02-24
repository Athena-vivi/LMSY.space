/**
 * Apply file_hash migration
 * Run with: npx tsx scripts/apply-migration-file-hash.ts
 */

import { createClient } from '@supabase/supabase-js';
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

    console.log('✅ Loaded .env.local');
  } catch (error) {
    console.error('❌ Could not load .env.local:', error);
    process.exit(1);
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('\n=== Applying file_hash Migration ===\n');

  const sqlStatements = [
    // Add file_hash column
    `ALTER TABLE lmsy_archive.draft_items
     ADD COLUMN IF NOT EXISTS file_hash TEXT;`,

    // Create unique index
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_items_file_hash_unique
     ON lmsy_archive.draft_items(file_hash)
     WHERE file_hash IS NOT NULL;`,

    // Create normalize_url function
    `CREATE OR REPLACE FUNCTION lmsy_archive.normalize_url(url TEXT)
     RETURNS TEXT AS $$
     BEGIN
       IF url IS NULL THEN
         RETURN NULL;
       END IF;
       RETURN split_part(split_part(url, '?', 1), '#', 1);
     END;
     $$ LANGUAGE plpgsql IMMUTABLE;`,
  ];

  for (const sql of sqlStatements) {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
      // Note: exec_sql might not be available, let's use a different approach
    } catch (e) {
      // Ignore
    }
  }

  // Since we can't directly execute DDL via RPC, let's just verify the table structure
  console.log('⚠️  Please run the SQL manually in Supabase SQL Editor:');
  console.log('\nhttps://supabase.com/dashboard/project/obylptsyyqydbbawkvxd/sql\n');
  console.log('Copy the content from:');
  console.log('supabase/migrations/20250223_add_file_hash_deduplication.sql\n');
}

applyMigration().catch(console.error);
