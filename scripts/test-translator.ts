/**
 * Test script for AI translator
 * Run with: npx tsx scripts/test-translator.ts
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

import { translateText, translateDraftItem } from '../lib/ai-translator';

async function main() {
  console.log('=== AI Translator Test ===\n');

  // 环境检查
  console.log('Environment check:');
  console.log('- OPENROUTER_API_KEY:', !!process.env.OPENROUTER_API_KEY);
  console.log('- OPENROUTER_MODEL:', process.env.OPENROUTER_MODEL || 'anthic/claude-3.5-sonnet (default)');
  console.log('');

  // 测试 1: 简单文本翻译
  console.log('--- Test 1: Simple text translation ---');
  const test1 = await translateText({
    text: 'Lookmhee and Sonya at the fan meeting today, so cute!',
    targetLanguages: ['en', 'zh', 'th'],
    context: {
      sourcePlatform: 'twitter',
      contentType: 'title',
    },
  });

  console.log('Result:', JSON.stringify(test1, null, 2));
  console.log('');

  if (!test1.success) {
    console.log('❌ Test 1 FAILED:', test1.error);
    process.exit(1);
  }

  // 测试 2: 草稿项完整翻译
  console.log('--- Test 2: Draft item translation (title + description) ---');
  const test2 = await translateDraftItem(
    'Lookmhee & Sonya backstage photo',
    'Behind the scenes at the magazine shoot. Lookmhee was so nervous but Sonya helped her calm down. Such sweet moments!',
    {
      sourcePlatform: 'instagram',
    }
  );

  console.log('Result:', JSON.stringify(test2, null, 2));
  console.log('');

  if (!test2.success) {
    console.log('❌ Test 2 FAILED:', test2.error);
    process.exit(1);
  }

  console.log('✅ All tests PASSED!');
}

main().catch((error) => {
  console.error('\n❌ Uncaught error:', error);
  process.exit(1);
});
