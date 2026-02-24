/**
 * Test script for media downloader
 * Run with: npx tsx scripts/test-downloader.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Manually parse .env.local file
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

import { downloadAndSaveToR2 } from '../lib/media-downloader';

async function main() {
  console.log('=== Media Downloader Test ===\n');

  // Test URL: A random test image
  const testUrl = 'https://picsum.photos/800/600';
  const platform = 'twitter'; // Simulate Twitter source

  console.log(`Test URL: ${testUrl}`);
  console.log(`Platform: ${platform}\n`);

  console.log('Environment check:');
  console.log('- R2_ENDPOINT:', !!process.env.R2_ENDPOINT);
  console.log('- R2_ACCESS_KEY_ID:', !!process.env.R2_ACCESS_KEY_ID);
  console.log('- R2_SECRET_ACCESS_KEY:', !!process.env.R2_SECRET_ACCESS_KEY);
  console.log('- R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME || 'lmsy-archive');
  console.log('- NEXT_PUBLIC_CDN_URL:', process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.lmsy.space');
  console.log('');

  const result = await downloadAndSaveToR2(testUrl, platform, {
    timeout: 30000,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  console.log('\n=== Result ===');
  console.log('Success:', result.success);

  if (result.success) {
    console.log('R2 URL:', result.r2Url);
    console.log('R2 Key:', result.r2Key);
    console.log('Media Type:', result.mediaType);
    console.log('Metadata:', JSON.stringify(result.metadata, null, 2));
    console.log('\n✅ Test PASSED!');
  } else {
    console.log('Error:', result.error);
    console.log('\n❌ Test FAILED!');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Uncaught error:', error);
  process.exit(1);
});
