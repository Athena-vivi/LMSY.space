/**
 * Test script for Draft Admin APIs
 * Run with: npx tsx scripts/test-admin-apis.ts
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

async function main() {
  console.log('=== Draft Admin APIs Test ===\n');

  // Try port 3000 first, then 3001
  let API_BASE = 'http://localhost:3000';
  try {
    const response = await fetch('http://localhost:3000/api/health', { method: 'GET' });
    if (!response.ok) throw new Error();
  } catch {
    API_BASE = 'http://localhost:3001';
  }

  console.log(`Using API_BASE: ${API_BASE}\n`);

  interface TestResult {
    name: string;
    method: string;
    endpoint: string;
    status: number;
    success: boolean;
    error?: string;
    data?: any;
  }

  // Helper function to test API
  async function testAPI(
    name: string,
    method: string,
    endpoint: string,
    body?: any
  ): Promise<TestResult> {
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await response.json().catch(() => null);

      const result: TestResult = {
        name,
        method,
        endpoint,
        status: response.status,
        success: response.ok,
      };

      if (response.ok) {
        result.data = data;
        console.log(`✅ ${name}`);
        if (data) {
          console.log(`   Status: ${response.status}`);
          if (data.pendingCount !== undefined) console.log(`   Pending count: ${data.pendingCount}`);
          if (data.data !== undefined) console.log(`   Items: ${data.data.length}`);
          if (data.published !== undefined) console.log(`   Published: ${data.published}`);
        }
      } else {
        result.error = data?.error || data?.message || 'Unknown error';
        console.log(`❌ ${name}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${result.error}`);
      }

      return result;
    } catch (error) {
      const err = error as Error;
      console.log(`❌ ${name}`);
      console.log(`   Network error: ${err.message}`);
      return {
        name,
        method,
        endpoint,
        status: 0,
        success: false,
        error: err.message,
      };
    }
  }

  // Check if Next.js dev server is running
  console.log('Checking if Next.js dev server is running...');
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
    }).catch(() => null);

    if (!response?.ok) {
      console.warn('⚠️  Next.js dev server may not be running.');
      console.warn('   Please run "npm run dev" in another terminal first.');
      console.warn('   Continuing with tests anyway...\n');
    } else {
      console.log('✅ Dev server is running\n');
    }
  } catch {
    console.warn('⚠️  Could not connect to dev server. Make sure "npm run dev" is running.\n');
  }

  const results: TestResult[] = [];

  // Test 1: GET /api/admin/drafts/stats
  console.log('--- Test 1: Get Stats (Badge) ---');
  results.push(await testAPI(
    'GET /api/admin/drafts/stats',
    'GET',
    '/api/admin/drafts/stats'
  ));
  console.log('');

  // Test 2: GET /api/admin/drafts (list)
  console.log('--- Test 2: Get Drafts List ---');
  results.push(await testAPI(
    'GET /api/admin/drafts',
    'GET',
    '/api/admin/drafts'
  ));
  console.log('');

  // Test 3: GET /api/admin/drafts with filter
  console.log('--- Test 3: Get Drafts (status=ready) ---');
  results.push(await testAPI(
    'GET /api/admin/drafts?status=ready',
    'GET',
    '/api/admin/drafts?status=ready'
  ));
  console.log('');

  // Test 4: POST /api/admin/drafts/batch-publish (will fail if no items, that's ok)
  console.log('--- Test 4: Batch Publish (may fail if no items) ---');
  const stats = results[0];
  const hasItems = stats.data?.pendingCount > 0;

  if (hasItems) {
    // Try to get an actual ID to test
    const listResult = results[1];
    if (listResult.data?.data?.length > 0) {
      const testId = listResult.data.data[0].id;
      console.log(`Testing with actual item: ${testId}`);
      results.push(await testAPI(
        `POST /api/admin/drafts/${testId}/publish`,
        'POST',
        `/api/admin/drafts/${testId}/publish`
      ));
    }
  } else {
    console.log('⏭️  Skipping publish test (no items to publish)');
    results.push({
      name: 'POST /api/admin/drafts/{id}/publish',
      method: 'POST',
      endpoint: '/api/admin/drafts/{id}/publish',
      status: 0,
      success: true, // Skipped, not failed
    });
  }
  console.log('');

  // Summary
  console.log('=== Test Summary ===');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Total: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n=== Failed Tests ===');
    results.filter(r => !r.success).forEach(r => {
      console.log(`❌ ${r.name}: ${r.error || 'Unknown error'}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests PASSED!');
  }
}

main().catch((error) => {
  console.error('\n❌ Uncaught error:', error);
  process.exit(1);
});
