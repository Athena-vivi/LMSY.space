/**
 * Reset Admin Password Script
 * Run with: npx tsx scripts/reset-admin-password.ts
 *
 * This script uses the Supabase Admin Client to reset a user's password.
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

// Validate environment variables
if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Get user by email using Supabase Admin API
 */
async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return data.users.find((u: any) => u.email === email);
}

/**
 * Update user password using Supabase Admin API
 */
async function updateUserPassword(userId: string, newPassword: string) {
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    throw new Error(`Failed to update password: ${error.message}`);
  }

  return data;
}

/**
 * Generate a secure random password
 */
function generatePassword(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function main() {
  console.log('\n=== Admin Password Reset Tool ===\n');

  // Get email from command line or use default admin email
  const email = process.argv[2] || ADMIN_EMAIL;

  if (!email) {
    console.error('❌ No email provided. Usage: npx tsx scripts/reset-admin-password.ts [email]');
    process.exit(1);
  }

  console.log(`📧 Target email: ${email}\n`);

  try {
    // Step 1: Find the user
    console.log('🔍 Looking up user...');
    const user = await getUserByEmail(email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('\n💡 Tip: You may need to create the user first via Supabase Dashboard');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString('zh-CN')}`);
    console.log(`   Last sign in: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('zh-CN') : 'Never'}`);

    // Step 2: Generate new password
    const newPassword = generatePassword(16);
    console.log(`\n🔐 Generated new password (16 characters)`);

    // Step 3: Update password
    console.log('\n🔄 Updating password...');
    const result = await updateUserPassword(user.id, newPassword);

    console.log('\n✅ Password reset successful!\n');

    // Display results
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${newPassword}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('\n⚠️  Please save this password securely and login at:');
    console.log(`   ${SUPABASE_URL!.replace('https://', 'https://').replace('/auth/v1', '')}/auth/login\n`);

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Uncaught error:', error);
  process.exit(1);
});
