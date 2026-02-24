/**
 * Telegram Webhook Setup Script
 *
 * This script helps you:
 * 1. Check if TELEGRAM_BOT_TOKEN is set
 * 2. Start ngrok/Cloudflare Tunnel (you need to run this separately)
 * 3. Register the webhook with Telegram
 *
 * Usage:
 * 1. Make sure your Next.js dev server is running: npm run dev
 * 2. Expose localhost:3000 using ngrok or Cloudflare Tunnel
 * 3. Run this script: npx tsx scripts/setup-telegram-webhook.ts <public-url>
 *
 * Example:
 *   npx tsx scripts/setup-telegram-webhook.ts https://abc123.ngrok-free.app
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');

    const env: Record<string, string> = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          env[key] = value;
        }
      }
    });

    return env;
  } catch (error) {
    console.error('❌ Could not load .env.local');
    return {};
  }
}

function extractToken(env: Record<string, string>): string | null {
  return env.TELEGRAM_BOT_TOKEN || null;
}

async function registerWebhook(publicUrl: string, botToken: string): Promise<boolean> {
  const webhookUrl = `${publicUrl}/api/webhooks/telegram`;

  console.log('\n📡 Registering webhook with Telegram...');
  console.log(`   Webhook URL: ${webhookUrl}`);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
        }),
      }
    );

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Webhook registered successfully!');
      console.log(`   Webhook URL: ${webhookUrl}`);
      return true;
    } else {
      console.error('❌ Failed to register webhook:', data.description);
      return false;
    }
  } catch (error) {
    console.error('❌ Error registering webhook:', error);
    return false;
  }
}

async function getWebhookInfo(botToken: string): Promise<void> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );

    const data = await response.json();

    if (data.ok) {
      console.log('\n📋 Current webhook info:');
      console.log(`   URL: ${data.result.url || '(not set)'}`);
      console.log(`   Has custom certificate: ${data.result.has_custom_certificate}`);
      console.log(`   Pending updates: ${data.result.pending_update_count || 0}`);

      if (data.result.last_error_date) {
        console.log(`   Last error: ${data.result.last_error_message}`);
        console.log(`   Last error date: ${new Date(data.result.last_error_date * 1000).toISOString()}`);
      }
    }
  } catch (error) {
    console.error('❌ Error getting webhook info:', error);
  }
}

async function deleteWebhook(botToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/deleteWebhook`
    );

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Webhook deleted successfully!');
      return true;
    } else {
      console.error('❌ Failed to delete webhook:', data.description);
      return false;
    }
  } catch (error) {
    console.error('❌ Error deleting webhook:', error);
    return false;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     TELEGRAM WEBHOOK SETUP                           ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // Load environment
  const env = loadEnvFile();
  const botToken = extractToken(env);

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in .env.local');
    console.log('\nPlease add it to your .env.local file:');
    console.log('   TELEGRAM_BOT_TOKEN=your_bot_token_here\n');
    process.exit(1);
  }

  console.log(`✅ Bot token found: ${botToken.substring(0, 10)}...`);

  // Get command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log('\nUsage: npx tsx scripts/setup-telegram-webhook.ts <command> [options]\n');
    console.log('Commands:');
    console.log('  status                              - Show current webhook info');
    console.log('  register <public-url>               - Register webhook with Telegram');
    console.log('  delete                              - Delete webhook');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/setup-telegram-webhook.ts status');
    console.log('  npx tsx scripts/setup-telegram-webhook.ts register https://abc123.ngrok-free.app');
    console.log('  npx tsx scripts/setup-telegram-webhook.ts delete');
    console.log('\nBefore registering, expose your localhost:');
    console.log('  Using ngrok:        ngrok http 3000');
    console.log('  Using Cloudflare:   cloudflared tunnel --url http://localhost:3000');
    console.log('');
    return;
  }

  if (command === 'status') {
    await getWebhookInfo(botToken);
    return;
  }

  if (command === 'delete') {
    await deleteWebhook(botToken);
    return;
  }

  if (command === 'register') {
    const publicUrl = args[1];

    if (!publicUrl) {
      console.error('❌ Please provide the public URL');
      console.log('\nExample: npx tsx scripts/setup-telegram-webhook.ts register https://abc123.ngrok-free.app');
      process.exit(1);
    }

    // Remove trailing slash
    const cleanUrl = publicUrl.replace(/\/$/, '');

    // First, show current webhook info
    await getWebhookInfo(botToken);

    // Register new webhook
    const success = await registerWebhook(cleanUrl, botToken);

    if (success) {
      console.log('\n🎉 Setup complete!');
      console.log('\nNow send a photo with caption to your bot on Telegram.');
      console.log('The webhook will receive it and process it through the pipeline.');
    }

    return;
  }

  console.error(`❌ Unknown command: ${command}`);
  console.log('Run: npx tsx scripts/setup-telegram-webhook.ts help');
}

main().catch(console.error);
