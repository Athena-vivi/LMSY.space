/**
 * Test script for Ingest API
 * Run with: npx tsx scripts/test-ingest.ts
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

// Test configuration
const API_URL = 'http://localhost:3000/api/ingest';

async function main() {
  console.log('=== Ingest API Test ===\n');

  // Check environment
  console.log('Environment check:');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('- INGEST_API_KEY:', !!process.env.INGEST_API_KEY);
  console.log('- API_URL:', API_URL);
  console.log('');

  // Get auth token
  const authToken = process.env.INGEST_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!authToken) {
    console.error('❌ No auth token found. Set INGEST_API_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  // Test payload (simulating OpenClaw Agent request)
  const testPayload = {
    source_url: 'https://twitter.com/user/status/123456789',
    source_platform: 'twitter',
    source_post_id: '123456789',
    media_url: 'https://picsum.photos/800/600',
    media_type: 'image',
    title: {
      en: 'Lookmhee and Sonya at the event today, looking absolutely stunning together!',
    },
    description: {
      en: 'The way Lookmhee looks at Sonya... my heart! Such a beautiful moment captured today.',
    },
    event_date: new Date().toISOString().split('T')[0],
    tags: ['event', 'fanmeeting', 'cute'],
  };

  console.log('--- Test: POST /api/ingest ---');
  console.log('Payload:', JSON.stringify(testPayload, null, 2));
  console.log('');

  try {
    // Check if Next.js dev server is running
    console.log('Checking if Next.js dev server is running...');
    const healthCheck = await fetch(API_URL.replace('/api/ingest', '/api/health'), {
      method: 'GET',
    }).catch(() => null);

    if (!healthCheck?.ok) {
      console.warn('⚠️  Next.js dev server may not be running.');
      console.warn('   Please run "npm run dev" in another terminal first.');
      console.warn('   Continuing with test anyway...');
    }

    // Make the request
    console.log('\nSending request to Ingest API...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(testPayload),
    });

    const result = await response.json();

    console.log('\n--- Response ---');
    console.log('Status:', response.status, response.statusText);
    console.log('Result:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('\n✅ Test PASSED!');
      console.log(`Draft Item ID: ${result.draft_item_id}`);
      console.log(`Status: ${result.status}`);
      console.log(`Ingestion Stage: ${result.ingestion_stage}`);
    } else {
      console.log('\n❌ Test FAILED!');
      console.log(`Error: ${result.error || result.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Uncaught error:', error);
    process.exit(1);
  }
}

main();
