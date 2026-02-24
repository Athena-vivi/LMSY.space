#!/usr/bin/env tsx
/**
 * Local Test Script for Automated Radar Cron Job
 *
 * Usage:
 *   bun run scripts/test-cron.ts
 *   npx tsx scripts/test-cron.ts
 *   ts-node scripts/test-cron.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// =====================================================
// LOAD ENV VARIABLES
// =====================================================

function loadEnv(): { CRON_SECRET: string; PORT: string } {
  const envPath = resolve(process.cwd(), '.env.local');

  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars: Record<string, string> = {};

    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=');
        }
      }
    }

    return {
      CRON_SECRET: envVars.CRON_SECRET || '',
      PORT: envVars.PORT || '3000',
    };
  } catch (error) {
    console.error('❌ Failed to load .env.local:', error);
    process.exit(1);
  }
}

const { CRON_SECRET, PORT } = loadEnv();

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET not found in .env.local');
  console.error('Please add: CRON_SECRET=your-random-secret-key');
  process.exit(1);
}

// =====================================================
// TEST CRON JOB
// =====================================================

async function testCronJob() {
  const baseUrl = `http://localhost:${PORT}`;
  const endpoint = '/api/cron/fetch-updates';

  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     AUTOMATED RADAR - LOCAL TEST                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📡 Target: ${baseUrl}${endpoint}`);
  console.log(`🔑 Secret: ${CRON_SECRET.substring(0, 8)}...`);
  console.log('');
  console.log('⏳ Starting request...');

  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ Response received (${response.status})`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log('');

    // Parse response
    const contentType = response.headers.get('content-type') || '';
    let result: any;

    if (contentType.includes('json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      console.log('Response (non-JSON):');
      console.log(text);
      console.log('');
      result = { raw: text };
    }

    // Display results
    if (response.ok && result.success) {
      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log('║                    ✅ SUCCESS                            ║');
      console.log('╚═══════════════════════════════════════════════════════╝');
      console.log('');
      console.log('📊 Results Summary:');
      console.log('─────────────────────────────────────────────────────────');
      console.log(`  Total Entries Found:     ${result.results?.total || 0}`);
      console.log(`  Entries Fetched:         ${result.results?.fetched || 0}`);
      console.log(`  Filtered (no media):      ${result.results?.filtered || 0}`);
      console.log(`  Duplicates Skipped:       ${result.results?.duplicates || 0}`);
      console.log(`  ✅ Successfully Ingested: ${result.results?.ingested || 0}`);
      console.log(`  ❌ Failed:                ${result.results?.failed || 0}`);
      console.log('─────────────────────────────────────────────────────────');
      console.log('');

      if (result.results?.sources && result.results.sources.length > 0) {
        console.log('📋 Source Breakdown:');
        console.log('─────────────────────────────────────────────────────────');
        for (const source of result.results.sources) {
          console.log(`  • ${source.name}`);
          console.log(`    URL: ${source.url}`);
          console.log(`    Entries: ${source.entries}`);
          console.log(`    Ingested: ${source.ingested}`);
          console.log('');
        }
      }

      if (result.results?.errors && result.results.errors.length > 0) {
        console.log('⚠️  Errors:');
        console.log('─────────────────────────────────────────────────────────');
        for (const error of result.results.errors) {
          console.log(`  • [${error.source}] ${error.error}`);
        }
        console.log('');
      }
    } else {
      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log('║                    ❌ FAILED                             ║');
      console.log('╚═══════════════════════════════════════════════════════╝');
      console.log('');
      console.log('Error Response:');
      console.log(JSON.stringify(result, null, 2));
      console.log('');
    }

    // Full JSON response
    console.log('═════════════════════════════════════════════════════════');
    console.log('FULL RESPONSE JSON:');
    console.log('═════════════════════════════════════════════════════════');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`❌ Request failed after ${duration}ms`);
    console.log('');
    console.error(error);
    process.exit(1);
  }
}

// =====================================================
// MAIN
// =====================================================

testCronJob().catch((error) => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
